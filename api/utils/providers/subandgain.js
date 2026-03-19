const axios = require('axios');

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

        // API: verify_bills.php?username=****&apiKey=****&service=****&smartNumber=****
        const url = 'https://subandgain.com/api/verify_bills.php';
        const params = {
            username: username,
            apiKey: apiKey,
            service: (cableId || 'DSTV').toUpperCase(),
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

        // API: bills.php?username=****&apiKey=****&service=****&bills_code=****&smartNumber=****
        const url = 'https://subandgain.com/api/bills.php';
        const params = {
            username: username,
            apiKey: apiKey,
            service: (cableId || 'DSTV').toUpperCase(),
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

        // API: verify_electricity.php?username=****&apiKey=****&service=****&meterNumber=****&meterType=****
        const url = 'https://subandgain.com/api/verify_electricity.php';
        const params = {
            username: username,
            apiKey: apiKey,
            service: discoId.toUpperCase(),
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

        // API: electricity.php?username=****&apiKey=****&service=****&meterNumber=****&meterType=****&accessToken=****&amount=****
        const url = 'https://subandgain.com/api/electricity.php';
        const params = {
            username: username,
            apiKey: apiKey,
            service: discoId.toUpperCase(),
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
        const { examId, quantity } = details;
        const { apiKey, username } = config;

        // Map Exam ID and Quantity to Subandgain codes
        // Mapping: {EXAM_TYPE}: {quantity: code}
        const codeMap = {
            'NECO': {
                1: 'NEONE',
                2: 'NETWO',
                3: 'NETHR',
                4: 'NEFOUR',
                5: 'NEFIVE'
            },
            'WAEC': {
                1: 'WAONE',
                2: 'WATWO',
                3: 'WATHR',
                4: 'WAFOUR',
                5: 'WAFIVE'
            }
        };

        const type = examId.toUpperCase();
        const qty = parseInt(quantity) || 1;

        let eduType = type; // Fallback
        if (codeMap[type] && codeMap[type][qty]) {
            eduType = codeMap[type][qty];
        } else if (codeMap[type]) {
            // Fallback to 1 piece if quantity match not found but exam exists
            eduType = codeMap[type][1];
        }

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
 */
async function fetchDataPlans(config) {
    try {
        // Subandgain usually doesn't have a standardized 'list all' JSON endpoint easy to find.
        // We will implement this as a placeholder or use a known endpoint if applicable.
        return { success: false, message: 'Dynamic fetching not yet supported for Subandgain' };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

module.exports = { purchaseAirtime, purchaseData, verifyTV, purchaseTV, verifyElectricity, purchaseElectricity, purchaseExam, purchaseDataPin, checkBalance, fetchDataPlans };
