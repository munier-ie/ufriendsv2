const axios = require('axios');

// Helper: ensure the base URL ends at /api so all endpoints include /api/
function getApiBase(baseUrl) {
    const stripped = (baseUrl || '').replace(/\/+$/, ''); // remove trailing slashes
    if (stripped.endsWith('/api')) return stripped;
    return `${stripped}/api`;
}

// Keywords that indicate a balance/funding issue on the provider side.
// These must NEVER be shown to users — show 'Service Temporarily Unavailable' instead.
const BALANCE_KEYWORDS = [
    'insufficient', 'low balance', 'wallet', 'low fund', 'no fund',
    'not enough', 'insufficient fund', 'account balance', 'recharge',
    'top up', 'topup', 'fund', 'credit', 'balance'
];

function sanitizeAlrahuzError(message) {
    if (!message) return 'Service Temporarily Unavailable';
    const lower = String(message).toLowerCase();
    if (BALANCE_KEYWORDS.some(kw => lower.includes(kw))) {
        return 'Service Temporarily Unavailable';
    }
    return message;
}

async function purchaseAirtime(details, config) {
    try {
        const { networkId, amount, phone, requestId } = details;
        const { baseUrl, apiKey } = config;

        // https://alrahuzdata.com.ng/api/topup/
        const url = `${getApiBase(baseUrl)}/topup/`;

        const payload = {
            network: networkId,
            amount: amount,
            mobile_number: phone,
            Ported_number: true,
            airtime_type: "VTU"
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
                message: sanitizeAlrahuzError(result.msg || result.message || result.error || 'Transaction Failed'),
                data: result
            };
        }
    } catch (error) {
        console.error('Alrahuz Airtime Error:', error.response?.data || error.message);
        const apiError = error.response?.data?.error || error.response?.data?.message || error.response?.data?.detail || null;
        return {
            status: 'failed',
            message: sanitizeAlrahuzError(apiError || 'Service Temporarily Unavailable'),
            error: error.message
        };
    }
}

/**
 * Purchase Data via Alrahuz Data API
 */
async function purchaseData(details, config) {
    try {
        const { networkId, phone, planId } = details;
        const { baseUrl, apiKey } = config;

        // https://alrahuzdata.com.ng/api/data/
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
                message: sanitizeAlrahuzError(result.msg || result.message || result.error || 'Transaction Failed'),
                data: result
            };
        }
    } catch (error) {
        console.error('Alrahuz Data Error:', error.response?.data || error.message);
        const apiError = error.response?.data?.error || error.response?.data?.message || error.response?.data?.detail || null;
        return {
            status: 'failed',
            message: sanitizeAlrahuzError(apiError || 'Service Temporarily Unavailable'),
            error: error.message
        };
    }
}

/**
 * Verify TV/Cable IUC/SmartCard via Alrahuz Data API
 */
async function verifyTV(details, config) {
    try {
        const { cableId, number } = details;
        const { baseUrl, apiKey } = config;

        // https://alrahuzdata.com.ng/api/validateiuc?smart_card_number=iuc&&cablename=id
        const url = `${getApiBase(baseUrl)}/validateiuc?smart_card_number=${number}&cablename=${cableId}`;

        const response = await axios.get(url, {
            headers: { 'Authorization': `Token ${apiKey}` }
        });

        const result = response.data;
        if (result.name || result.Customer_Name) {
            return {
                valid: true,
                customerName: result.name || result.Customer_Name,
                data: result
            };
        } else {
            return {
                valid: false,
                message: result.msg || result.message || 'Verification Failed'
            };
        }
    } catch (error) {
        console.error('Alrahuz TV Verify Error:', error.response?.data || error.message);
        return { valid: false, message: 'Provider Connection Error' };
    }
}

/**
 * Purchase TV Subscription via Alrahuz Data API
 */
async function purchaseTV(details, config) {
    try {
        const { cableId, planId, number } = details;
        const { baseUrl, apiKey } = config;

        // https://alrahuzdata.com.ng/api/cablesub/
        const url = `${getApiBase(baseUrl)}/cablesub/`;

        const payload = {
            cablename: cableId,
            cableplan: planId,
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
                message: sanitizeAlrahuzError(result.msg || result.message || result.error || 'Transaction Failed'),
                data: result
            };
        }
    } catch (error) {
        console.error('Alrahuz TV Error:', error.response?.data || error.message);
        const apiError = error.response?.data?.error || error.response?.data?.message || error.response?.data?.detail || null;
        return {
            status: 'failed',
            message: sanitizeAlrahuzError(apiError || 'Service Temporarily Unavailable'),
            error: error.message
        };
    }
}

/**
 * Verify Electricity Meter via Alrahuz Data API
 */
async function verifyElectricity(details, config) {
    try {
        const { discoId, number, type } = details;
        const { baseUrl, apiKey } = config;

        // https://alrahuzdata.com.ng/api/validatemeter?meternumber=meter&disconame=id&mtype=metertype
        const url = `${getApiBase(baseUrl)}/validatemeter?meternumber=${number}&disconame=${discoId}&mtype=${type}`;

        const response = await axios.get(url, {
            headers: { 'Authorization': `Token ${apiKey}` }
        });

        const result = response.data;
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
        console.error('Alrahuz Electricity Verify Error:', error.response?.data || error.message);
        return { valid: false, message: 'Provider Connection Error' };
    }
}

/**
 * Purchase Electricity Unit via Alrahuz Data API
 */
async function purchaseElectricity(details, config) {
    try {
        const { discoId, number, type, amount } = details;
        const { baseUrl, apiKey } = config;

        // https://alrahuzdata.com.ng/api/billpayment/
        const url = `${getApiBase(baseUrl)}/billpayment/`;

        const payload = {
            disco_name: discoId,
            amount: amount,
            meter_number: number,
            MeterType: type
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
                token: result.token || result.mainToken || result.pin
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
                message: sanitizeAlrahuzError(result.msg || result.message || result.error || 'Transaction Failed'),
                data: result
            };
        }
    } catch (error) {
        console.error('Alrahuz Electricity Error:', error.response?.data || error.message);
        const apiError = error.response?.data?.error || error.response?.data?.message || error.response?.data?.detail || null;
        return {
            status: 'failed',
            message: sanitizeAlrahuzError(apiError || 'Service Temporarily Unavailable'),
            error: error.message
        };
    }
}

/**
 * Purchase Exam Pin via Alrahuz Data API
 */
async function purchaseExam(details, config) {
    try {
        const { examId, quantity } = details;
        const { baseUrl, apiKey } = config;

        // https://alrahuzdata.com.ng/api/epin/
        const url = `${getApiBase(baseUrl)}/epin/`;

        const payload = {
            exam_name: examId,
            quantity: quantity || 1
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
                message: sanitizeAlrahuzError(result.msg || result.message || result.error || 'Transaction Failed'),
                data: result
            };
        }
    } catch (error) {
        console.error('Alrahuz Exam Error:', error.response?.data || error.message);
        const apiError = error.response?.data?.error || error.response?.data?.message || error.response?.data?.detail || null;
        return {
            status: 'failed',
            message: sanitizeAlrahuzError(apiError || 'Service Temporarily Unavailable'),
            error: error.message
        };
    }
}

/**
 * Check Balance via Alrahuz Data API
 */
async function checkBalance(config) {
    try {
        const { baseUrl, apiKey } = config;

        // https://alrahuzdata.com.ng/api/user/
        const url = `${getApiBase(baseUrl)}/user/`;

        const response = await axios.get(url, {
            headers: { 'Authorization': `Token ${apiKey}` }
        });

        const result = response.data;
        // Depending on response structure, could be result.user.balance or result.balance
        const balance = result.user?.balance || result.Balance || result.balance || 0;

        return {
            success: true,
            balance: parseFloat(balance)
        };
    } catch (error) {
        console.error('Alrahuz Balance Error:', error.message);
        return { success: false, message: 'Connection Error' };
    }
}

// Purchase Data Card (Data Pin) via Alrahuz Data Card API
// Endpoint: POST https://alrahuzdata.com.ng/api/data-card/
// Payload: { plan: plan_id, quantity: 1|2|5, name_on_card: "business name" }
async function purchaseDataPin(details, config) {
    try {
        const { planId, quantity, businessName } = details;
        const { baseUrl, apiKey } = config;

        const url = `${getApiBase(baseUrl)}/data-card/`;

        const payload = {
            plan: planId,
            quantity: quantity || 1,
            name_on_card: businessName || 'Ufriends'
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
                message: 'Data Card PIN Purchase Successful',
                data: result,
                pin: result.cards || result.card || result.pin || result.pins || result.token
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
                message: sanitizeAlrahuzError(result.msg || result.message || result.error || result.detail || 'Transaction Failed'),
                data: result
            };
        }
    } catch (error) {
        console.error('Alrahuz DataPin Error:', error.response?.data || error.message);
        const apiError = error.response?.data?.error || error.response?.data?.message || error.response?.data?.detail || null;
        return {
            status: 'failed',
            message: sanitizeAlrahuzError(apiError || 'Service Temporarily Unavailable'),
            error: error.message
        };
    }
}

/**
 * Fetch all data plans from Alrahuz for price syncing and discovery.
 */
async function fetchDataPlans(config) {
    try {
        const { baseUrl, apiKey } = config;
        const res = await axios.get(`${getApiBase(baseUrl)}/network/`, {
            headers: { Authorization: `Token ${apiKey}` }
        });

        if (!res.data || !res.data.plan) {
            return { success: false, message: 'Invalid response from provider' };
        }

        const plans = res.data.plan.map(plan => ({
            network: (plan.plan_network || '').toUpperCase().trim(),
            dataName: plan.plan, // e.g. "1.0GB"
            dataType: (plan.plan_type || '').toUpperCase().trim(),
            planId: String(plan.dataplan_id),
            apiPrice: parseFloat(plan.plan_amount),
            duration: plan.month_validate || '30 days'
        }));

        return { success: true, plans };
    } catch (error) {
        console.error('Alrahuz Fetch Error:', error.message);
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
    purchaseDataPin,
    fetchDataPlans,
    checkBalance
};
