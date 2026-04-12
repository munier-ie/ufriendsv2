const axios = require('axios');

const CABLE_MAP = {
    'gotv': 'GOTV',
    'dstv': 'DSTV',
    'startimes': 'STARTIMES',
    'startime': 'STARTIMES'
};

const DISCO_MAP = {
    'ikeja-electric': 'IKEDC',
    'eko-electric': 'EKEDC',
    'kano-electric': 'KEDC',
    'kedco': 'KEDC',
    'kedc': 'KEDC',
    'kano': 'KEDC',
    'port-harcourt-electric': 'PHED',
    'ph-electric': 'PHED',
    'jos-electric': 'JED',
    'ibadan-electric': 'IBEDC',
    'kaduna-electric': 'KAEDCO',
    'abuja-electric': 'AEDC',
    'enugu-electric': 'EEDC',
    'yola-electric': 'YEDC',
    'benin-electric': 'BEDC'
};
/**
 * Purchase Airtime via Subandgain
 * @param {Object} details
 * @param {string} details.network - MTN, GLO, AIRTEL, 9MOBILE
 * @param {number} details.amount
 * @param {string} details.phone
 * @param {Object} config - Provider configuration
 */
async function purchaseAirtime(details, config) {
    try {
        const { network, amount, phone } = details;
        const { apiKey, username } = config;

        // API Command: https://subandgain.com/api/airtime.php?username=****&apiKey=****&network=****&phoneNumber=****&amount=****
        const networkName = network.toUpperCase();

        const url = 'https://subandgain.com/api/airtime.php';
        const params = {
            username: username,
            apiKey: apiKey,
            network: networkName,
            phoneNumber: phone,
            amount: amount
        };

        // Note: Subandgain uses GET query params based on the docs shown ("https://subandgain.com/api/airtime.php?...")
        // But let's verify if axios.get or post is better. Docs say "API Command: url...". Usually means GET.

        const response = await axios.get(url, { params });
        const result = response.data;

        console.log('Subandgain Response:', result);

        // Success: {"status":"pending|Approved","trans_id":"...","network":"...","balance":"..."}
        // Error: {"error":"ERR201","description":"..."}

        if (result.status && (result.status.toLowerCase() === 'approved' || result.status.toLowerCase() === 'pending')) {
            return {
                status: result.status.toLowerCase() === 'approved' ? 'success' : 'pending',
                message: 'Transaction Successful',
                data: result,
                reference: result.trans_id
            };
        } else {
            return {
                status: 'failed',
                message: result.description || 'Transaction Failed',
                data: result
            };
        }

    } catch (error) {
        console.error('Subandgain Error:', error.response?.data || error.message);
        return {
            status: 'failed',
            message: 'Provider Connection Error',
            error: error.message
        };
    }
}

/**
 * Purchase Data via Subandgain
 * @param {Object} details
 * @param {string} details.network - MTN, GLO, AIRTEL, 9MOBILE
 * @param {string} details.phone
 * @param {string} details.planId - Provider specific plan ID
 * @param {Object} config - Provider configuration
 */
async function purchaseData(details, config) {
    try {
        const { network, phone, planId } = details;
        const { apiKey, username } = config;

        const url = 'https://subandgain.com/api/data.php';
        const params = {
            username: username,
            apiKey: apiKey,
            network: network.toUpperCase(),
            phoneNumber: phone,
            dataPlan: planId
        };

        const response = await axios.get(url, { params });
        const result = response.data;

        console.log('Subandgain Data Response:', result);

        if (result.status && (result.status.toLowerCase() === 'approved' || result.status.toLowerCase() === 'pending')) {
            return {
                status: result.status.toLowerCase() === 'approved' ? 'success' : 'pending',
                message: 'Data Purchase Successful',
                data: result,
                reference: result.trans_id
            };
        } else {
            return {
                status: 'failed',
                message: result.description || 'Transaction Failed',
                data: result
            };
        }

    } catch (error) {
        console.error('Subandgain Data Error:', error.response?.data || error.message);
        return {
            status: 'failed',
            message: 'Provider Connection Error',
            error: error.message
        };
    }
}

/**
 * Verify TV/Cable IUC/SmartCard via Subandgain
 * @param {Object} details
 * @param {string} details.cable - dstv, gotv, startimes
 * @param {string} details.number - IUC number
 * @param {Object} config - Provider configuration
 */
async function verifyTV(details, config) {
    try {
        const { cableId, number } = details;
        const { apiKey, username } = config;

        const mappedCable = CABLE_MAP[String(cableId).toLowerCase()] || String(cableId).toUpperCase();

        console.log(`Subandgain TV Verify: cableId="${cableId}" → service="${mappedCable}", smartNumber="${number}"`);

        // API: verify_bills.php?username=****&apiKey=****&service=****&smartNumber=****
        const url = 'https://subandgain.com/api/verify_bills.php';
        const params = {
            username: username,
            apiKey: apiKey,
            service: mappedCable,
            smartNumber: number
        };

        const response = await axios.get(url, { params });
        const result = response.data;

        console.log('Subandgain TV Verify Response:', result);

        if (result.status && result.status.toLowerCase() === 'success') {
            return {
                valid: true,
                customerName: result.customerName,
                data: result
            };
        } else {
            return {
                valid: false,
                message: result.description || 'Verification Failed'
            };
        }
    } catch (error) {
        console.error('Subandgain TV Verify Error:', error.response?.data || error.message);
        return { valid: false, message: 'Provider Connection Error' };
    }
}

/**
 * Purchase TV Subscription via Subandgain
 * @param {Object} details
 * @param {string} details.cable - dstv, gotv, startimes
 * @param {string} details.planId - Provider specific plan ID
 * @param {string} details.number - IUC number
 * @param {Object} config - Provider configuration
 */
async function purchaseTV(details, config) {
    try {
        const { cableId, planId, number } = details;
        const { apiKey, username } = config;

        const mappedCable = CABLE_MAP[String(cableId).toLowerCase()] || String(cableId).toUpperCase();

        // API: bills.php?username=****&apiKey=****&service=****&bills_code=****&smartNumber=****
        const url = 'https://subandgain.com/api/bills.php';
        const params = {
            username: username,
            apiKey: apiKey,
            service: mappedCable,
            bills_code: planId,
            smartNumber: number
        };

        const response = await axios.get(url, { params });
        const result = response.data;

        console.log('Subandgain TV Purchase Response:', result);

        if (result.status && (result.status.toLowerCase() === 'approved' || result.status.toLowerCase() === 'pending')) {
            return {
                status: result.status.toLowerCase() === 'approved' ? 'success' : 'pending',
                message: 'TV Purchase Successful',
                data: result,
                reference: result.trans_id
            };
        } else {
            return {
                status: 'failed',
                message: result.description || 'Transaction Failed',
                data: result
            };
        }
    } catch (error) {
        console.error('Subandgain TV Error:', error.response?.data || error.message);
        return {
            status: 'failed',
            message: 'Provider Connection Error',
            error: error.message
        };
    }
}

/**
 * Verify Electricity Meter via Subandgain
 * @param {Object} details
 * @param {string} details.discoId - Provider specific disco code
 * @param {string} details.number - Meter number
 * @param {string} details.type - prepaid, postpaid
 * @param {Object} config - Provider configuration
 */
async function verifyElectricity(details, config) {
    try {
        const { discoId, number, type } = details;
        const { apiKey, username } = config;

        const mappedDisco = DISCO_MAP[String(discoId).toLowerCase()] || String(discoId).toUpperCase();

        console.log(`Subandgain Electricity Verify: discoId="${discoId}" → service="${mappedDisco}", meterNumber="${number}", meterType="${type}"`);

        // API: verify_electricity.php?username=****&apiKey=****&service=****&meterNumber=****&meterType=****
        const url = 'https://subandgain.com/api/verify_electricity.php';
        const params = {
            username: username,
            apiKey: apiKey,
            service: mappedDisco,
            meterNumber: number,
            meterType: (type || 'prepaid').toUpperCase() === 'PREPAID' ? 'PRE' : 'POST'
        };

        const response = await axios.get(url, { params });
        const result = response.data;

        console.log('Subandgain Electricity Verify Response:', result);

        if (result.status && result.status.toLowerCase() === 'success') {
            return {
                valid: true,
                customerName: result.customerName,
                accessToken: result.accessToken,
                data: result
            };
        } else {
            return {
                valid: false,
                message: result.description || 'Verification Failed'
            };
        }
    } catch (error) {
        console.error('Subandgain Electricity Verify Error:', error.response?.data || error.message);
        return { valid: false, message: 'Provider Connection Error' };
    }
}

/**
 * Purchase Electricity Unit via Subandgain
 * @param {Object} details
 * @param {string} details.discoId - Provider specific disco code
 * @param {string} details.number - Meter number
 * @param {string} details.type - prepaid, postpaid
 * @param {number} details.amount
 * @param {Object} config - Provider configuration
 */
async function purchaseElectricity(details, config) {
    try {
        const { discoId, number, type, amount, accessToken } = details;
        const { apiKey, username } = config;

        const mappedDisco = DISCO_MAP[String(discoId).toLowerCase()] || String(discoId).toUpperCase();

        // API: electricity.php?username=****&apiKey=****&service=****&meterNumber=****&meterType=****&accessToken=****&amount=****
        const url = 'https://subandgain.com/api/electricity.php';
        const params = {
            username: username,
            apiKey: apiKey,
            service: mappedDisco,
            meterNumber: number,
            meterType: (type || 'prepaid').toUpperCase() === 'PREPAID' ? 'PRE' : 'POST',
            amount: amount
        };
        // Include accessToken if available (from verification step)
        if (accessToken) params.accessToken = accessToken;

        const response = await axios.get(url, { params });
        const result = response.data;

        console.log('Subandgain Electricity Purchase Response:', result);

        if (result.status && (result.status.toLowerCase() === 'approved' || result.status.toLowerCase() === 'pending')) {
            return {
                status: result.status.toLowerCase() === 'approved' ? 'success' : 'pending',
                message: 'Electricity Purchase Successful',
                data: result,
                token: result.MeterToken,
                reference: result.trans_id
            };
        } else {
            return {
                status: 'failed',
                message: result.description || 'Transaction Failed',
                data: result
            };
        }
    } catch (error) {
        console.error('Subandgain Electricity Error:', error.response?.data || error.message);
        return {
            status: 'failed',
            message: 'Provider Connection Error',
            error: error.message
        };
    }
}

/**
 * Purchase Exam Pin via Subandgain
 * @param {Object} details
 * @param {string} details.examId - WAEC, NECO, etc.
 * @param {number} details.quantity
 * @param {Object} config - Provider configuration
 */
async function purchaseExam(details, config) {
    try {
        const { apiKey, username } = config;

        // eduType is pre-computed by vend.service.js from the ExamPin DB record's quantity field.
        // e.g. NECO qty=1 → NEONE, NECO qty=2 → NETWO, WAEC qty=1 → WAONE etc.
        // No need to send quantity separately — it's embedded in the code itself.
        const eduType = details.eduType;

        if (!eduType) {
            console.error('[Subandgain Exam] Missing eduType in details:', details);
            return { status: 'failed', message: 'Invalid exam type configuration' };
        }

        console.log(`[Subandgain Exam] Sending eduType=${eduType} (no quantity param)`);

        // API: education.php?username=****&apiKey=****&eduType=****
        const url = 'https://subandgain.com/api/education.php';
        const params = {
            username: username,
            apiKey: apiKey,
            eduType: eduType
        };

        const response = await axios.get(url, { params });
        const result = response.data;

        console.log('Subandgain Exam Purchase Response:', result);

        if (result.status && (result.status.toLowerCase() === 'approved' || result.status.toLowerCase() === 'pending')) {
            return {
                status: result.status.toLowerCase() === 'approved' ? 'success' : 'pending',
                message: 'Exam PIN Purchase Successful',
                data: result,
                pin: result.token || result.pin,
                token: result.token,
                reference: result.trans_id
            };
        } else {
            return {
                status: 'failed',
                message: result.description || 'Transaction Failed',
                data: result
            };
        }
    } catch (error) {
        console.error('Subandgain Exam Error:', error.response?.data || error.message);
        return {
            status: 'failed',
            message: 'Provider Connection Error',
            error: error.message
        };
    }
}

/**
 * Purchase Data Pin via Subandgain
 */
async function purchaseDataPin(details, config) {
    try {
        const { network, planId, quantity } = details;
        const { apiKey, username } = config;

        const url = 'https://subandgain.com/api/data_pin.php';
        const params = {
            username: username,
            apiKey: apiKey,
            network: network.toUpperCase(),
            dataPlan: planId,
            quantity: quantity || 1
        };

        const response = await axios.get(url, { params });
        const result = response.data;

        console.log('Subandgain DataPin Purchase Response:', result);

        if (result.status && (result.status.toLowerCase() === 'approved' || result.status.toLowerCase() === 'pending')) {
            return {
                status: result.status.toLowerCase() === 'approved' ? 'success' : 'pending',
                message: 'Data PIN Purchase Successful',
                data: result,
                pin: result.pin,
                reference: result.trans_id
            };
        } else {
            return {
                status: 'failed',
                message: result.description || 'Transaction Failed',
                data: result
            };
        }
    } catch (error) {
        console.error('Subandgain DataPin Error:', error.response?.data || error.message);
        return {
            status: 'failed',
            message: 'Provider Connection Error',
            error: error.message
        };
    }
}

/**
 * Check Balance via Subandgain
 * @param {Object} config - Provider configuration
 */
async function checkBalance(config) {
    try {
        const { apiKey, username } = config;
        const url = 'https://subandgain.com/api/balance.php';
        const params = { username, apiKey };

        const response = await axios.get(url, { params });
        const result = response.data;

        if (result.status && (result.status.toLowerCase() === 'approved' || result.status.toLowerCase() === 'successful' || result.status.toLowerCase() === 'success')) {
            return {
                success: true,
                balance: parseFloat(result.balance || 0)
            };
        } else {
            return {
                success: false,
                message: result.description || 'Failed to fetch balance'
            };
        }
    } catch (error) {
        console.error('Subandgain Balance Error:', error.message);
        return { success: false, message: 'Connection Error' };
    }
}

/**
 * Fetch all data plans from Subandgain for price syncing and discovery.
 * Endpoint: https://subandgain.com/api/databundles.php
 * Returns list of plans per network (MTN, GLO, AIRTEL, 9MOBILE).
 */
async function fetchDataPlans(config) {
    try {
        const { apiKey, username } = config;
        const res = await axios.get('https://subandgain.com/api/databundles.php', {
            params: { username, apiKey },
            timeout: 30000
        });

        const data = res.data;
        if (!data || typeof data !== 'object') {
            return { success: false, message: 'Invalid response from Subandgain databundles' };
        }

        const plans = [];
        
        // Ensure data is array
        const rawData = Array.isArray(data) ? data : (data.data || []);
        
        for (const item of rawData) {
            const network = String(item.NETWORK || '').toUpperCase().trim();
            if (!network || !Array.isArray(item.BUNDLE)) continue;
            
            for (const plan of item.BUNDLE) {
                const planId = String(plan.dataPlan || plan.dataplan_id || plan.id || '');
                
                let apiPrice = 0;
                if (Array.isArray(plan.price) && plan.price.length > 0) {
                    // Their API puts prices inside an array in 'price' object
                    apiPrice = parseFloat(plan.price[0].api_user || plan.price[0].value || plan.price[0].basic_user || 0);
                } else {
                    apiPrice = parseFloat(plan.price || plan.plan_amount || 0);
                }
                
                if (!planId || isNaN(apiPrice) || apiPrice <= 0) continue;
                if (plan.status && String(plan.status).toUpperCase() !== 'ACTIVE') continue;

                plans.push({
                    network, // e.g. MTN
                    dataName: plan.dataBundle || plan.plan || plan.name || planId,
                    dataType: String(plan.type || plan.plan_type || 'SME').toUpperCase().trim(),
                    planId,
                    apiPrice,
                    duration: plan.duration || plan.validity || plan.month_validate || '30 days'
                });
            }
        }

        if (plans.length === 0) {
            return { success: false, message: 'No data plans returned from Subandgain' };
        }

        return { success: true, plans };
    } catch (error) {
        console.error('Subandgain fetchDataPlans Error:', error.message);
        return { success: false, message: error.message };
    }
}

/**
 * Fetch all Cable TV plans from Subandgain for price syncing and discovery.
 * Endpoint: https://subandgain.com/api/cablebundles.php
 * Returns array of { SERVICE, BUNDLE: [{ billsCode, package, price, status }] }
 */
async function fetchCablePlans(config) {
    try {
        const { apiKey, username } = config;
        const res = await axios.get('https://subandgain.com/api/cablebundles.php', {
            params: { username, apiKey },
            timeout: 30000
        });

        const bundles = res.data;
        if (!Array.isArray(bundles)) {
            return { success: false, message: 'Invalid response from Subandgain cablebundles' };
        }

        const SERVICE_MAP = { DSTV: 'dstv', GOTV: 'gotv', STARTIMES: 'startimes', STARTIME: 'startimes' };
        const plans = [];

        for (const bundle of bundles) {
            const providerSlug = SERVICE_MAP[(bundle.SERVICE || '').toUpperCase()];
            if (!providerSlug) continue;

            const packageList = bundle.BUNDLE || [];
            for (const plan of packageList) {
                if (plan.status && plan.status !== 'Active') continue;
                const apiPrice = parseFloat(plan.price ?? 0);
                if (isNaN(apiPrice) || apiPrice <= 0) continue;

                plans.push({
                    provider: providerSlug,       // 'dstv' | 'gotv' | 'startimes'
                    name: plan.package || plan.name || plan.billsCode,
                    code: String(plan.billsCode), // used as `code` in Service table
                    apiPrice
                });
            }
        }

        if (plans.length === 0) {
            return { success: false, message: 'No cable plans returned from Subandgain' };
        }

        return { success: true, plans };
    } catch (error) {
        console.error('Subandgain fetchCablePlans Error:', error.message);
        return { success: false, message: error.message };
    }
}

/**
 * Fetch all Exam Pin plans from Subandgain for price syncing and discovery.
 * Endpoint: https://subandgain.com/api/edu_prices.php
 * Returns exam types with their prices.
 */
async function fetchExamPlans(config) {
    try {
        const { apiKey, username } = config;
        const res = await axios.get('https://subandgain.com/api/edu_prices.php', {
            params: { username, apiKey },
            timeout: 30000
        });

        const data = res.data;
        if (!data || typeof data !== 'object') {
            return { success: false, message: 'Invalid response from Subandgain edu_prices' };
        }

        const plans = [];
        
        const rawData = Array.isArray(data) ? data : [];
        
        for (const item of rawData) {
            const examKey = String(item.SERVICE || '').toUpperCase().trim();
            if (!examKey || !Array.isArray(item.BUNDLE)) continue;
            
            for (const plan of item.BUNDLE) {
                const code = plan.eduCode || plan.code || plan.id;
                if (!code) continue;
                
                const apiPrice = parseFloat(plan.price || plan.amount || 0);
                if (isNaN(apiPrice) || apiPrice <= 0) continue;
                
                if (plan.status && String(plan.status).toUpperCase() !== 'ACTIVE') continue;

                plans.push({
                    examType: examKey,
                    name: plan.package || plan.name || code,
                    code: String(code),  // eduType code e.g. 'NEONE', 'WAONE'
                    apiPrice
                });
            }
        }

        if (plans.length === 0) {
            return { success: false, message: 'No exam plans returned from Subandgain' };
        }

        return { success: true, plans };
    } catch (error) {
        console.error('Subandgain fetchExamPlans Error:', error.message);
        return { success: false, message: error.message };
    }
}

module.exports = { purchaseAirtime, purchaseData, verifyTV, purchaseTV, verifyElectricity, purchaseElectricity, purchaseExam, purchaseDataPin, checkBalance, fetchDataPlans, fetchCablePlans, fetchExamPlans };
