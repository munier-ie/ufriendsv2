/**
 * seed-services.js
 *
 * Seeds ALL services into the unified Service table for all active providers.
 *   - Alrahuz:    /api/network/ (returns data plans)
 *   - Subandgain: /api/databundles.php (returns data bundles per network)
 *   - Maskawa:    /api/network/ (same as alrahuz but slow — retries with backoff)
 *
 * Profit margins (percentage):
 *   - price (User):  API Cost + 5%
 *   - agentPrice:    API Cost + 3%
 *   - vendorPrice:   API Cost + 1%
 * All prices rounded to the nearest whole Naira.
 *
 * Usage: node api/scripts/seed-services.js
 */

'use strict';

const axios = require('axios');
const prisma = require('../../prisma/client');

// ─── Price Calculation ──────────────────────────────────────────────────────────

function calcPrices(apiCost) {
    const api = parseFloat(apiCost) || 0;
    return {
        apiPrice:    Math.round(api),
        vendorPrice: Math.round(api * 1.01),
        agentPrice:  Math.round(api * 1.03),
        userPrice:   Math.round(api * 1.05),
    };
}

// ─── Upsert into Service table ─────────────────────────────────────────────────

async function upsertService({ type, provider, name, code, prices, apiProviderId, metadata }) {
    const existing = await prisma.service.findFirst({
        where: { type, provider, code: code ?? '', apiProviderId },
        select: { id: true },
    });
    const data = {
        name,
        price:         prices.userPrice,
        agentPrice:    prices.agentPrice,
        vendorPrice:   prices.vendorPrice,
        apiPrice:      prices.apiPrice,
        apiProviderId,
        metadata:      metadata ?? null,
        active:        true,
    };
    if (existing) {
        await prisma.service.update({ where: { id: existing.id }, data });
    } else {
        await prisma.service.create({ data: { ...data, type, provider, code: code ?? '' } });
    }
}

// ─── Fetch: Alrahuz / Maskawa (/api/network/) with retry ──────────────────────

async function fetchAlrahuzStyle(baseUrl, apiKey, providerName) {
    const url = `${baseUrl.replace(/\/+$/, '')}/api/network/`;
    const MAX_RETRIES = 5;
    let lastError;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const timeout = Math.min(20000 * attempt, 90000);
        console.log(`     Attempt ${attempt}/${MAX_RETRIES} (timeout: ${timeout / 1000}s)...`);
        try {
            const res = await axios.get(url, {
                headers: { Authorization: `Token ${apiKey}` },
                timeout,
            });
            let plans = [];
            if (res.data.plan) {
                // Alrahuz style: single 'plan' array
                plans = res.data.plan;
            } else {
                // Maskawa style: MTN_PLAN, GLO_PLAN, etc.
                const possibleKeys = ['MTN_PLAN', 'GLO_PLAN', 'AIRTEL_PLAN', '9MOBILE_PLAN'];
                for (const key of possibleKeys) {
                    if (Array.isArray(res.data[key])) {
                        plans = plans.concat(res.data[key]);
                    }
                }
            }

            if (plans.length === 0) throw new Error('No plans found in response');

            const formattedPlans = plans.map(p => ({
                network:  (p.plan_network || '').toUpperCase().trim(),
                dataName: String(p.plan || '').trim(),
                dataType: (p.plan_type || 'SME').toUpperCase().trim(),
                planId:   String(p.dataplan_id),
                duration: p.month_validate || '30 days',
                apiPrice: parseFloat(p.plan_amount) || 0,
            }));
            console.log(`     ✅ Got ${formattedPlans.length} plans`);
            return formattedPlans;
        } catch (err) {
            lastError = err.message;
            console.log(`     ⚠️  Failed: ${err.message}`);
            if (attempt < MAX_RETRIES) {
                const wait = 5000 * attempt;
                console.log(`     Waiting ${wait / 1000}s before retry...`);
                await new Promise(r => setTimeout(r, wait));
            }
        }
    }
    throw new Error(`Could not fetch from ${providerName} after ${MAX_RETRIES} attempts: ${lastError}`);
}

// ─── Fetch: Subandgain (/api/databundles.php) ─────────────────────────────────

async function fetchSubandgainPlans(provider) {
    const url = `https://subandgain.com/api/databundles.php`;
    const res = await axios.get(url, {
        params: { username: provider.username, apiKey: provider.apiKey },
        timeout: 20000,
    });

    const plans = [];
    const networks = Array.isArray(res.data) ? res.data : [];

    for (const networkObj of networks) {
        const network = (networkObj.NETWORK || '').toUpperCase().trim();
        const bundles = networkObj.BUNDLE || [];
        for (const bundle of bundles) {
            if (!bundle || bundle.status !== 'Active') continue;
            const priceObj = Array.isArray(bundle.price) ? bundle.price[0] : bundle.price || {};
            // Use api_user price as our base cost
            const apiPrice = parseFloat(priceObj.api_user || priceObj.value || 0);
            if (!apiPrice) continue;
            plans.push({
                network,
                dataName: String(bundle.dataBundle || '').trim(),
                dataType: (bundle.type || 'SME').toUpperCase().trim(),
                planId:   String(bundle.dataPlan),
                duration: bundle.duration || '30 days',
                apiPrice,
            });
        }
    }

    console.log(`     ✅ Got ${plans.length} plans`);
    return plans;
}

// ─── Seed Data Plans for a Provider ───────────────────────────────────────────

async function seedDataServices(provider) {
    console.log(`\n  📡 Fetching data plans from "${provider.name}"...`);
    let plans;

    try {
        const nameLower = provider.name.toLowerCase();
        if (nameLower.includes('subandgain')) {
            plans = await fetchSubandgainPlans(provider);
        } else {
            // Alrahuz and Maskawa both use /api/network/
            plans = await fetchAlrahuzStyle(provider.baseUrl, provider.apiKey, provider.name);
        }
    } catch (err) {
        console.log(`     ❌ Skipping data plans: ${err.message}`);
        return 0;
    }

    let count = 0;
    for (const plan of plans) {
        if (!plan.planId || !plan.network || plan.apiPrice <= 0) continue;
        const prices = calcPrices(plan.apiPrice);
        await upsertService({
            type:          'data',
            provider:      plan.network,
            name:          `${plan.network} ${plan.dataName} ${plan.dataType} (${plan.duration} Days)`,
            code:          plan.planId,
            prices,
            apiProviderId: provider.id,
            metadata:      JSON.stringify({ dataType: plan.dataType, duration: plan.duration, network: plan.network }),
        });

        // Also upsert into the DataPlan table (used by the admin dashboard & smart routing bot)
        const existingDataPlan = await prisma.dataPlan.findFirst({
            where: { network: plan.network, dataName: plan.dataName, dataType: plan.dataType, apiProviderId: provider.id },
            select: { id: true }
        });
        const dataPlanData = {
            network:      plan.network,
            dataName:     plan.dataName,
            dataType:     plan.dataType,
            planId:       plan.planId,
            duration:     plan.duration || '30 days',
            userPrice:    prices.userPrice,
            agentPrice:   prices.agentPrice,
            vendorPrice:  prices.vendorPrice,
            apiPrice:     prices.apiPrice,
            apiProviderId: provider.id,
            active:       true,
        };
        if (existingDataPlan) {
            await prisma.dataPlan.update({ where: { id: existingDataPlan.id }, data: dataPlanData });
        } else {
            await prisma.dataPlan.create({ data: dataPlanData });
        }

        count++;
    }
    console.log(`     📥 Upserted ${count} data services`);
    return count;
}

// ─── Static: Airtime ──────────────────────────────────────────────────────────

async function seedAirtimeServices(provider) {
    const networks = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'];
    for (const net of networks) {
        await upsertService({
            type: 'airtime', provider: net,
            name: `${net} Airtime VTU`, code: 'VTU',
            prices: { apiPrice: 0, vendorPrice: 0, agentPrice: 0, userPrice: 0 },
            apiProviderId: provider.id,
            metadata: JSON.stringify({ airtimeType: 'VTU' }),
        });
    }
    return networks.length;
}

// ─── Static: Cable TV ─────────────────────────────────────────────────────────

const CABLE_PLANS = [
    { provider: 'dstv', name: 'DStv Padi',        code: '6',    apiPrice: 2500  },
    { provider: 'dstv', name: 'DStv Yanga',        code: '7',    apiPrice: 3500  },
    { provider: 'dstv', name: 'DStv Confam',       code: '8',    apiPrice: 6200  },
    { provider: 'dstv', name: 'DStv Compact',      code: '9',    apiPrice: 10500 },
    { provider: 'dstv', name: 'DStv Compact Plus', code: '10',   apiPrice: 16600 },
    { provider: 'dstv', name: 'DStv Premium',      code: '11',   apiPrice: 29500 },
    { provider: 'gotv', name: 'GOtv Lite',         code: '1',    apiPrice: 410   },
    { provider: 'gotv', name: 'GOtv Jinja',        code: '2',    apiPrice: 2460  },
    { provider: 'gotv', name: 'GOtv Jolli',        code: '3',    apiPrice: 3950  },
    { provider: 'gotv', name: 'GOtv Max',          code: '4',    apiPrice: 5700  },
    { provider: 'gotv', name: 'GOtv Supa',         code: '5',    apiPrice: 9600  },
    { provider: 'gotv', name: 'GOtv Supa Plus',    code: '12',   apiPrice: 15700 },
    { provider: 'startimes', name: 'Startimes Nova',    code: 'nova',    apiPrice: 900  },
    { provider: 'startimes', name: 'Startimes Basic',   code: 'basic',   apiPrice: 1850 },
    { provider: 'startimes', name: 'Startimes Smart',   code: 'smart',   apiPrice: 2600 },
    { provider: 'startimes', name: 'Startimes Classic', code: 'classic', apiPrice: 3200 },
    { provider: 'startimes', name: 'Startimes Unique',  code: 'unique',  apiPrice: 4900 },
    { provider: 'startimes', name: 'Startimes Super',   code: 'super',   apiPrice: 8900 },
];

async function seedCableServices(provider) {
    for (const plan of CABLE_PLANS) {
        await upsertService({
            type: 'cable', provider: plan.provider, name: plan.name, code: plan.code,
            prices: calcPrices(plan.apiPrice), apiProviderId: provider.id,
        });
    }
    return CABLE_PLANS.length;
}

// ─── Static: Electricity ──────────────────────────────────────────────────────

const ELECTRICITY_DISCOS = [
    { provider: 'ikeja-electric',  name: 'Ikeja Electric (IKEDC)'        },
    { provider: 'eko-electric',    name: 'Eko Electric (EKEDC)'          },
    { provider: 'abuja-electric',  name: 'Abuja Electric (AEDC)'         },
    { provider: 'kano-electric',   name: 'Kano Electric (KEDCO)'         },
    { provider: 'ph-electric',     name: 'Port Harcourt Electric (PHED)' },
    { provider: 'enugu-electric',  name: 'Enugu Electric (EEDC)'         },
    { provider: 'ibadan-electric', name: 'Ibadan Electric (IBEDC)'       },
    { provider: 'jos-electric',    name: 'Jos Electric (JED)'            },
    { provider: 'kaduna-electric', name: 'Kaduna Electric (KAEDCO)'      },
    { provider: 'benin-electric',  name: 'Benin Electric (BEDC)'         },
    { provider: 'yola-electric',   name: 'Yola Electric (YEDC)'          },
    { provider: 'aedc-electric',   name: 'AEDC Electricity'              },
];

async function seedElectricityServices(provider) {
    for (const disco of ELECTRICITY_DISCOS) {
        await upsertService({
            type: 'electricity', provider: disco.provider, name: disco.name, code: disco.provider,
            prices: { apiPrice: 0, vendorPrice: 0, agentPrice: 0, userPrice: 0 },
            apiProviderId: provider.id,
        });
    }
    return ELECTRICITY_DISCOS.length;
}

// ─── Exam PINs (ExamPin table, not per-provider) ───────────────────────────────

const EXAM_PINS = [
    { examType: 'WAEC', quantity: 1, apiPrice: 3500  },
    { examType: 'WAEC', quantity: 2, apiPrice: 7000  },
    { examType: 'WAEC', quantity: 3, apiPrice: 10500 },
    { examType: 'WAEC', quantity: 4, apiPrice: 14000 },
    { examType: 'WAEC', quantity: 5, apiPrice: 17500 },
    { examType: 'NECO', quantity: 1, apiPrice: 1050  },
    { examType: 'NECO', quantity: 2, apiPrice: 2100  },
    { examType: 'NECO', quantity: 3, apiPrice: 3150  },
    { examType: 'NECO', quantity: 4, apiPrice: 4200  },
    { examType: 'NECO', quantity: 5, apiPrice: 5250  },
];

async function seedExamPins(providers) {
    console.log('\n📝 Seeding Exam PINs (ExamPin table) for all providers...');
    let totalCount = 0;
    for (const provider of providers) {
        let count = 0;
        for (const pin of EXAM_PINS) {
            let prices;
            if (provider.name.toLowerCase().includes('subandgain')) {
                // Provider specific pricing for Subandgain as requested
                const q = pin.quantity || 1;
                prices = {
                    apiPrice:    1150 * q,
                    vendorPrice: 1250 * q,
                    agentPrice:  1300 * q,
                    userPrice:   1500 * q,
                };
            } else {
                prices = calcPrices(pin.apiPrice);
            }

            const existing = await prisma.examPin.findFirst({
                where: { 
                    examType: pin.examType, 
                    quantity: pin.quantity,
                    apiProviderId: provider.id
                }, 
                select: { id: true },
            });
            const data = {
                apiPrice: prices.apiPrice, vendorPrice: prices.vendorPrice,
                agentPrice: prices.agentPrice, userPrice: prices.userPrice,
                apiProviderId: provider.id, active: true,
            };
            if (existing) {
                await prisma.examPin.update({ where: { id: existing.id }, data });
            } else {
                await prisma.examPin.create({ data: { ...data, examType: pin.examType, quantity: pin.quantity } });
            }
            count++;
        }
        console.log(`   ✅ Seeded ${count} exam PINs for provider: ${provider.name}`);
        totalCount += count;
    }
    console.log(`\n   🎉 Total Exam PINs seeded: ${totalCount}`);
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🚀 Multi-Provider Service Seeding');
    console.log('   Margins: Vendor +1% | Agent +3% | User +5% | Round to whole Naira\n');

    const providers = await prisma.apiProvider.findMany({
        where: { name: { in: ['alrahuz data', 'subandgain', 'maskawa sub'], mode: 'insensitive' }, active: true },
    });

    if (!providers.length) { console.error('❌ No providers found.'); process.exit(1); }

    for (const provider of providers) {
        console.log(`\n${'━'.repeat(50)}`);
        console.log(`Provider: ${provider.name.toUpperCase()} (ID: ${provider.id})`);
        console.log('━'.repeat(50));

        const dc = await seedDataServices(provider);
        const ac = await seedAirtimeServices(provider);
        console.log(`  📱 Airtime: ✅ Upserted ${ac}`);
        const cc = await seedCableServices(provider);
        console.log(`  📺 Cable:   ✅ Upserted ${cc}`);
        const ec = await seedElectricityServices(provider);
        console.log(`  ⚡ Electricity: ✅ Upserted ${ec}`);
        console.log(`  Total for this provider: ${dc + ac + cc + ec}`);
    }

    await seedExamPins(providers);

    const total = await prisma.service.count();
    const byProvider = await prisma.service.groupBy({ by: ['apiProviderId'], _count: { id: true } });

    console.log('\n🎉 Seeding Complete!');
    console.log('\n📊 Summary:');
    for (const row of byProvider) {
        const prov = providers.find(p => p.id === row.apiProviderId);
        console.log(`   ${(prov?.name || 'Unknown').padEnd(20)}: ${row._count.id} services`);
    }
    console.log(`   ${'TOTAL'.padEnd(20)}: ${total} services`);
    console.log(`   ${'Exam PINs'.padEnd(20)}: ${await prisma.examPin.count()}`);
}

main()
    .catch(err => { console.error('❌ Fatal error:', err.message, err.stack); process.exit(1); })
    .finally(() => prisma.$disconnect());
