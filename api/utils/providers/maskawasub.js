const axios = require('axios');

// Helper: Ensure base URL ends at /api
function getApiBase(baseUrl) {
    const stripped = (baseUrl || '').trim().replace(/\/+$/, '');
    if (stripped.endsWith('/api')) return stripped;
    return `${stripped}/api`;
}

const CABLE_MAP = {
    'gotv': 1,
    'dstv': 2,
    'startimes': 3,
    'startime': 3
};

const DISCO_MAP = {
    'ikeja-electric': 1,
    'eko-electric': 2,
    'kano-electric': 3,
    'port-harcourt-electric': 4,
    'ph-electric': 4,
    'jos-electric': 5,
    'ibadan-electric': 6,
    'kaduna-electric': 7,
    'abuja-electric': 8,
    'enugu-electric': 9,
    'yola-electric': 10,
    'benin-electric': 11,
    'aedc-electric': 8
};

/**
 * Extract a human-readable error message from a Maskawa API error response.
 * Maskawa returns errors as { error: ["message"] } or { error: "message" } or { detail: "message" }
 */
function extractMaskawaError(error) {
    const data = error.response?.data;
    let msg = null;

    if (data) {
        if (data.error) {
            msg = Array.isArray(data.error) ? data.error.join(', ') : String(data.error);
        } else if (data.detail) {
            msg = String(data.detail);
        } else if (data.message) {
            msg = String(data.message);
        } else if (data.msg) {
            msg = String(data.msg);
        }
    }

    if (!msg) msg = error.message || 'Provider Connection Error';

    // If the error is about our provider's insufficient balance, hide that from users
    const balanceKeywords = ['insufficient', 'insufficient balance', 'low balance', 'wallet', 'credit', 'fund'];
    const msgLower = msg.toLowerCase();
    if (balanceKeywords.some(kw => msgLower.includes(kw))) {
        return 'Service Temporarily Unavailable';
    }

    return msg;
}

/**
 * Purchase Airtime via Maskawa Sub
 * @param {Object} details
 * @param {string} details.networkId - Provider specific network ID
 * @param {number} details.amount
 * @param {string} details.phone
 * @param {string} details.requestId
 * @param {string} details.airtimeType - VTU, Share, etc.
 * @param {Object} config - Provider configuration
 */
async function purchaseAirtime(details, config) {
    try {
        const { networkId, amount, phone, airtimeType } = details;
        const { baseUrl, apiKey } = config;

        const url = `${getApiBase(baseUrl)}/topup/`;

        const payload = {
            network: networkId,
            amount: amount,
            mobile_number: phone,
            Ported_number: true,
            airtime_type: airtimeType || 'VTU'
        };

        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Maskawa Airtime Response:', response.data);

        const result = response.data;
        const status = (result.Status || result.status || '').toLowerCase();

        if (status === 'successful' || status === 'success') {
            return {
                status: 'success',
                message: 'Transaction Successful',
                data: result
            };
        } else if (status === 'processing' || status === 'process' || status === 'pending') {
            return {
                status: 'pending',
                message: 'Transaction Processing',
                data: result
            };
        } else {
            return {
                status: 'failed',
                message: result.error ? JSON.stringify(result.error) : (result.msg || result.message || 'Transaction Failed'),
                data: result
            };
        }
    } catch (error) {
        const msg = extractMaskawaError(error);
        console.error('Maskawa Airtime Error:', error.response?.data || error.message);
        return { status: 'failed', message: msg, error: error.response?.data || error.message };
    }
}

/**
 * Purchase Data via Maskawa Sub
 * @param {Object} details
 * @param {string} details.networkId - Provider specific network ID
 * @param {string} details.phone
 * @param {string} details.requestId
 * @param {string} details.planId - Provider specific plan ID
 * @param {Object} config - Provider configuration
 */
async function purchaseData(details, config) {
    try {
        const { networkId, phone, planId } = details;
        const { baseUrl, apiKey } = config;

        const url = `${getApiBase(baseUrl)}/data/`;

        const payload = {
            network: networkId,
            mobile_number: phone,
            plan: planId,
            Ported_number: true
        };

        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Maskawa Data Response:', response.data);

        const result = response.data;
        const status = (result.Status || result.status || '').toLowerCase();

        if (status === 'successful' || status === 'success') {
            return {
                status: 'success',
                message: 'Data Purchase Successful',
                data: result
            };
        } else if (status === 'processing' || status === 'process' || status === 'pending') {
            return {
                status: 'pending',
                message: 'Transaction Processing',
                data: result
            };
        } else {
            return {
                status: 'failed',
                message: result.error ? JSON.stringify(result.error) : (result.msg || result.message || 'Transaction Failed'),
                data: result
            };
        }
    } catch (error) {
        const msg = extractMaskawaError(error);
        console.error('Maskawa Data Error:', error.response?.data || error.message);
        return { status: 'failed', message: msg, error: error.response?.data || error.message };
    }
}

/**
 * Verify TV/Cable IUC/SmartCard via Maskawa Sub
 * @param {Object} details
 * @param {string} details.cableId - Provider specific cable ID
 * @param {string} details.number - IUC number
 * @param {Object} config - Provider configuration
 */
async function verifyTV(details, config) {
    try {
        const { cableId, number } = details;
        const { baseUrl, apiKey } = config;

        const mappedCable = CABLE_MAP[String(cableId).toLowerCase()] || cableId;

        const url = `${getApiBase(baseUrl)}/validateiuc/`;

        const response = await axios.get(url, {
            params: {
                smart_card_number: number,
                cablename: mappedCable
            },
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const result = response.data;

        if (result.invalid) {
            return { valid: false, message: result.name || result.msg || 'Invalid IUC/SmartCard' };
        }

        if (result.name || result.Customer_Name || result.customerName) {
            return {
                valid: true,
                customerName: result.name || result.Customer_Name || result.customerName,
                data: result
            };
        } else {
            return {
                valid: false,
                message: result.msg || result.message || 'Verification Failed'
            };
        }
    } catch (error) {
        console.error('Maskawa TV Verify Error:', error.response?.data || error.message);
        return { valid: false, message: 'Provider Connection Error' };
    }
}

/**
 * Purchase TV Subscription via Maskawa Sub
 * @param {Object} details
 * @param {string} details.cableId - Provider specific cable ID
 * @param {string} details.planId - Provider specific plan ID
 * @param {string} details.number - IUC number
 * @param {string} details.requestId
 * @param {Object} config - Provider configuration
 */
async function purchaseTV(details, config) {
    try {
        const { cableId, planId, number } = details;
        const { baseUrl, apiKey } = config;

        const numericCableId = CABLE_MAP[String(cableId).toLowerCase()] || cableId;

        const url = `${getApiBase(baseUrl)}/cablesub/`;

        const payload = {
            cablename: numericCableId,
            cableplan: parseInt(planId) || planId,
            smart_card_number: number
        };

        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const result = response.data;
        const status = (result.Status || result.status || '').toLowerCase();

        if (status === 'successful' || status === 'success') {
            return {
                status: 'success',
                message: 'TV Purchase Successful',
                data: result
            };
        } else if (status === 'processing' || status === 'process' || status === 'pending') {
            return {
                status: 'pending',
                message: 'Transaction Processing',
                data: result
            };
        } else {
            return {
                status: 'failed',
                message: result.error ? JSON.stringify(result.error) : (result.msg || result.message || 'Transaction Failed'),
                data: result
            };
        }
    } catch (error) {
        const msg = extractMaskawaError(error);
        console.error('Maskawa TV Error:', error.response?.data || error.message);
        return { status: 'failed', message: msg, error: error.response?.data || error.message };
    }
}

/**
 * Verify Electricity Meter via Maskawa Sub
 * @param {Object} details
 * @param {string} details.discoId - Provider specific disco code
 * @param {string} details.number - Meter number
 * @param {string} details.type - prepaid, postpaid
 * @param {Object} config - Provider configuration
 */
async function verifyElectricity(details, config) {
    try {
        const { discoId, number, type } = details;
        const { baseUrl, apiKey } = config;

        const mappedDisco = DISCO_MAP[String(discoId).toLowerCase()] || discoId;

        // format: PREPAID:1, POSTPAID:2 (some APIs expect strings though)
        // /api/validatemeter?meternumber=meter&disconame=id&mtype=metertype

        let mType = type || 'prepaid';
        if (mType.toLowerCase() === 'prepaid') mType = '1';
        if (mType.toLowerCase() === 'postpaid') mType = '2';

        const url = `${getApiBase(baseUrl)}/validatemeter/`;

        const response = await axios.get(url, {
            params: {
                meternumber: number,
                disconame: mappedDisco,
                mtype: mType
            },
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const result = response.data;

        if (result.invalid) {
            return { valid: false, message: result.name || result.msg || 'Invalid Meter Number' };
        }

        if (result.name || result.Customer_Name || result.customerName) {
            return {
                valid: true,
                customerName: result.name || result.Customer_Name || result.customerName,
                data: result
            };
        } else {
            return {
                valid: false,
                message: result.msg || result.message || 'Verification Failed'
            };
        }
    } catch (error) {
        console.error('Maskawa Electricity Verify Error:', error.response?.data || error.message);
        return { valid: false, message: 'Provider Connection Error' };
    }
}

/**
 * Purchase Electricity Unit via Maskawa Sub
 * @param {Object} details
 * @param {string} details.discoId - Provider specific disco code
 * @param {string} details.number - Meter number
 * @param {string} details.type - prepaid, postpaid
 * @param {number} details.amount
 * @param {Object} config - Provider configuration
 */
async function purchaseElectricity(details, config) {
    try {
        const { discoId, number, type, amount } = details;
        const { baseUrl, apiKey } = config;

        const mappedDisco = DISCO_MAP[String(discoId).toLowerCase()] || discoId;

        let mType = type || 'prepaid';
        if (mType.toLowerCase() === 'prepaid') mType = '1';
        if (mType.toLowerCase() === 'postpaid') mType = '2';

        const url = `${getApiBase(baseUrl)}/billpayment/`;

        const payload = {
            disco_name: mappedDisco,
            amount: amount,
            meter_number: number,
            MeterType: mType
        };

        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const result = response.data;
        const status = (result.Status || result.status || '').toLowerCase();

        if (status === 'successful' || status === 'success') {
            return {
                status: 'success',
                message: 'Electricity Purchase Successful',
                data: result,
                token: result.token || result.Token || result.pin || result.mainToken
            };
        } else if (status === 'processing' || status === 'process' || status === 'pending') {
            return {
                status: 'pending',
                message: 'Transaction Processing',
                data: result
            };
        } else {
            return {
                status: 'failed',
                message: result.error ? JSON.stringify(result.error) : (result.msg || result.message || 'Transaction Failed'),
                data: result
            };
        }
    } catch (error) {
        const msg = extractMaskawaError(error);
        console.error('Maskawa Electricity Error:', error.response?.data || error.message);
        return { status: 'failed', message: msg, error: error.response?.data || error.message };
    }
}

/**
 * Purchase Exam Pin via Maskawa Sub
 * @param {Object} details
 * @param {string} details.examId - Provider specific exam ID
 * @param {number} details.quantity
 * @param {Object} config - Provider configuration
 */
async function purchaseExam(details, config) {
    try {
        const { examId, quantity } = details;
        const { baseUrl, apiKey } = config;

        const url = `${getApiBase(baseUrl)}/epin/`;

        const payload = {
            exam_name: details.eduType || examId,
            quantity: String(quantity || 1)
        };

        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const result = response.data;
        const status = (result.Status || result.status || '').toLowerCase();

        if (status === 'successful' || status === 'success') {
            return {
                status: 'success',
                message: 'Exam PIN Purchase Successful',
                data: result,
                pin: result.pin || result.pins || result.token
            };
        } else {
            return {
                status: 'failed',
                message: result.error ? JSON.stringify(result.error) : (result.msg || result.message || 'Transaction Failed'),
                data: result
            };
        }
    } catch (error) {
        const msg = extractMaskawaError(error);
        console.error('Maskawa Exam Error:', error.response?.data || error.message);
        return { status: 'failed', message: msg, error: error.response?.data || error.message };
    }
}

/**
 * Check Balance via Maskawa Sub
 * @param {Object} config - Provider configuration
 */
async function checkBalance(config) {
    try {
        const { baseUrl, apiKey } = config;

        const url = `${getApiBase(baseUrl)}/user/`;

        const response = await axios.get(url, {
            headers: { 'Authorization': `Token ${apiKey}` }
        });

        const result = response.data;
        if (result && result.user && typeof result.user.Account_Balance !== 'undefined') {
            return {
                success: true,
                balance: parseFloat(result.user.Account_Balance || 0)
            };
        } else {
            return { success: false, message: 'Invalid balance format returned' };
        }
    } catch (error) {
        console.error('Maskawa Balance Error Full:', error);
        return { success: false, message: 'Connection Error' };
    }
}

// Helper: Ensure base URL ends at /api
function getApiBase(baseUrl) {
    const stripped = (baseUrl || '').replace(/\/+$/, '');
    if (stripped.endsWith('/api')) return stripped;
    return `${stripped}/api`;
}

/**
 * Fetch all data plans from Maskawa for price syncing and discovery.
 */
async function fetchDataPlans(config) {
    try {
        const { baseUrl, apiKey } = config;
        const url = `${getApiBase(baseUrl)}/network/`;
        
        const res = await axios.get(url, {
            headers: { Authorization: `Token ${apiKey}` },
            timeout: 30000
        });

        let plans = [];
        if (res.data && res.data.plan) {
            plans = res.data.plan;
        } else if (res.data) {
            // Maskawa style: MTN_PLAN, GLO_PLAN, etc.
            const possibleKeys = ['MTN_PLAN', 'GLO_PLAN', 'AIRTEL_PLAN', '9MOBILE_PLAN'];
            for (const key of possibleKeys) {
                if (Array.isArray(res.data[key])) {
                    plans = plans.concat(res.data[key]);
                }
            }
        }

        if (plans.length === 0) {
            return { success: false, message: 'No plans found in provider response' };
        }

        const formattedPlans = plans.map(plan => ({
            network: (plan.plan_network || '').toUpperCase().trim(),
            dataName: plan.plan,
            dataType: (plan.plan_type || '').toUpperCase().trim(),
            planId: String(plan.dataplan_id),
            apiPrice: parseFloat(plan.plan_amount),
            duration: plan.month_validate || '30 days'
        }));

        return { success: true, plans: formattedPlans };
    } catch (error) {
        console.error('Maskawa fetchDataPlans Error:', error.message);
        return { success: false, message: error.message };
    }
}

/**
 * Fetch all Cable TV plans from Maskawa Sub.
 * Endpoint: /api/cable/ — returns GOTVPLAN[], DSTVPLAN[], STARTIME[]
 */
async function fetchCablePlans(config) {
    try {
        const { baseUrl, apiKey } = config;
        const url = `${getApiBase(baseUrl)}/cable/`;

        const res = await axios.get(url, {
            headers: { Authorization: `Token ${apiKey}` },
            timeout: 30000
        });

        const data = res.data;
        const SERVICE_MAP = { GOTV: 'gotv', DSTV: 'dstv', STARTIMES: 'startimes', STARTIME: 'startimes' };

        // Collect plans from known Maskawa cable keys
        const rawPlans = [
            ...(Array.isArray(data.GOTVPLAN) ? data.GOTVPLAN.map(p => ({ ...p, _cable: 'GOTV' })) : []),
            ...(Array.isArray(data.DSTVPLAN) ? data.DSTVPLAN.map(p => ({ ...p, _cable: 'DSTV' })) : []),
            ...(Array.isArray(data.STARTIME) ? data.STARTIME.map(p => ({ ...p, _cable: 'STARTIMES' })) : []),
        ];

        if (rawPlans.length === 0) {
            return { success: false, message: 'No cable plans returned from Maskawa' };
        }

        const plans = [];
        for (const plan of rawPlans) {
            const cableType = plan._cable || String(plan.cable || plan.type || '').toUpperCase();
            const providerSlug = SERVICE_MAP[cableType];
            if (!providerSlug) continue;

            const apiPrice = parseFloat(plan.amount ?? plan.price ?? plan.plan_amount ?? 0);
            if (isNaN(apiPrice) || apiPrice <= 0) continue;

            const code = String(plan.cableplan_id ?? plan.id ?? plan.plan_id ?? '');
            if (!code) continue;

            plans.push({
                provider: providerSlug,
                name: plan.package || plan.name || `${providerSlug} Plan ${code}`,
                code,
                apiPrice
            });
        }

        if (plans.length === 0) {
            return { success: false, message: 'No valid cable plans parsed from Maskawa response' };
        }

        return { success: true, plans };
    } catch (error) {
        console.error('Maskawa fetchCablePlans Error:', error.message);
        return { success: false, message: error.message };
    }
}

/**
 * Fetch all Exam Pin plans from Maskawa Sub.
 * Endpoint: /api/epinprices/ — returns exam types and their prices.
 */
async function fetchExamPlans(config) {
    try {
        const { baseUrl, apiKey } = config;
        const url = `${getApiBase(baseUrl)}/epinprices/`;

        const res = await axios.get(url, {
            headers: { Authorization: `Token ${apiKey}` },
            timeout: 15000
        });

        const data = res.data;
        const plans = [];

        const raw = Array.isArray(data) ? data : (data.results || data.plans || []);
        for (const plan of raw) {
            const code = plan.exam_name || plan.code || plan.eduType;
            if (!code) continue;
            const apiPrice = parseFloat(plan.price ?? plan.plan_amount ?? 0);
            if (isNaN(apiPrice) || apiPrice <= 0) continue;

            plans.push({
                examType: (plan.exam_type || code).toUpperCase(),
                name: plan.name || plan.package || code,
                code: String(code),
                apiPrice
            });
        }

        if (plans.length === 0) {
            return { success: false, message: 'No exam plans returned from Maskawa' };
        }

        return { success: true, plans };
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return { success: false, message: 'Exam endpoint not supported by provider' };
        }
        console.error('Maskawa fetchExamPlans Error:', error.message);
        return { success: false, message: error.message };
    }
}

module.exports = {
    purchaseAirtime,
    purchaseData,
    verifyTV,
    purchaseTV,
    verifyElectricity,
    purchaseElectricity,
    purchaseExam,
    checkBalance,
    fetchDataPlans,
    fetchCablePlans,
    fetchExamPlans,
    // Add purchaseDataPin alias to purchaseExam to prevent undefined crashes if called
    purchaseDataPin: async () => ({ status: 'failed', message: 'Data Pin not explicitly supported via Maskawa API documentation' })
};
