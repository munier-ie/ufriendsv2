const axios = require('axios');

/**
 * Purchase Airtime via Basic Auth Providers (N3TData, Bilal, etc.)
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
        const { networkId, amount, phone, requestId, airtimeType } = details;
        const { baseUrl, apiKey, userUrl } = config;

        // Step 1: Get Access Token (if required/Basic Auth flow from Version 3)
        // Version 3 gets a token using Basic Auth on a user URL
        let token = apiKey; // Default if no auth flow needed, but Version 3 does it.

        if (userUrl) {
            try {
                // Determine Authorization header format (Basic vs pure token)
                // Version 3 uses "Authorization: Basic $apiKey" to get a token
                const authResponse = await axios.post(userUrl, {}, {
                    headers: { 'Authorization': `Basic ${apiKey}` }
                });

                if (authResponse.data && authResponse.data.AccessToken) {
                    token = authResponse.data.AccessToken;
                } else {
                    // Fallback or error if token fetch fails
                    console.warn('Failed to fetch auth token, using raw key');
                }
            } catch (err) {
                console.error('Auth Token Error:', err.message);
                // If auth fails, we might stop here or try with raw key? 
                // Version 3 returns error.
                return { status: 'failed', message: 'Provider Auth Failed' };
            }
        }

        // Step 2: Purchase
        const payload = {
            network: networkId,
            amount: amount,
            mobile_number: phone,
            phone: phone, // Some use mobile_number, some phone. Sending both to be safe based on V3
            Ported_number: true,
            bypass: true, // sending both based on V3 variations
            'request-id': requestId,
            airtime_type: airtimeType,
            plan_type: airtimeType // sending both
        };

        const response = await axios.post(baseUrl, payload, {
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('BasicProvider Response:', response.data);

        // Normalize Response
        const result = response.data;
        // Check for various status fields (Status, status)
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
                message: result.msg || result.message || 'Transaction Failed',
                data: result
            };
        }

    } catch (error) {
        console.error('BasicProvider Error:', error.response?.data || error.message);
        return {
            status: 'failed',
            message: 'Provider Connection Error',
            error: error.message
        };
    }
}

/**
 * Purchase Data via Basic Auth Providers (N3TData, Bilal, etc.)
 * @param {Object} details
 * @param {string} details.networkId - Provider specific network ID
 * @param {string} details.phone
 * @param {string} details.requestId
 * @param {string} details.planId - Provider specific plan ID
 * @param {Object} config - Provider configuration
 */
async function purchaseData(details, config) {
    try {
        const { networkId, phone, requestId, planId } = details;
        const { baseUrl, apiKey, userUrl } = config;

        let token = apiKey;
        if (userUrl) {
            const authResponse = await axios.post(userUrl, {}, {
                headers: { 'Authorization': `Basic ${apiKey}` }
            });
            if (authResponse.data && authResponse.data.AccessToken) {
                token = authResponse.data.AccessToken;
            }
        }

        const payload = {
            network: networkId,
            mobile_number: phone,
            phone: phone,
            Ported_number: true,
            bypass: true,
            'request-id': requestId,
            data_plan: planId
        };

        const response = await axios.post(baseUrl, payload, {
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('BasicProvider Data Response:', response.data);

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
                message: result.msg || result.message || 'Transaction Failed',
                data: result
            };
        }

    } catch (error) {
        console.error('BasicProvider Data Error:', error.response?.data || error.message);
        return {
            status: 'failed',
            message: 'Provider Connection Error',
            error: error.message
        };
    }
}

/**
 * Verify TV/Cable IUC/SmartCard via Basic Auth Providers
 * @param {Object} details
 * @param {string} details.cableId - Provider specific cable ID
 * @param {string} details.number - IUC number
 * @param {Object} config - Provider configuration
 */
async function verifyTV(details, config) {
    try {
        const { cableId, number } = details;
        const { apiKey, verifyUrl } = config;

        if (!verifyUrl) throw new Error('Verification URL not configured');

        // Basic Auth for verification as per Version 3
        const response = await axios.get(`${verifyUrl}?iuc=${number}&cable=${cableId}`, {
            headers: { 'Authorization': `Basic ${apiKey}` }
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
        console.error('BasicProvider TV Verify Error:', error.response?.data || error.message);
        return { valid: false, message: 'Provider Connection Error' };
    }
}

/**
 * Purchase TV Subscription via Basic Auth Providers
 * @param {Object} details
 * @param {string} details.cableId - Provider specific cable ID
 * @param {string} details.planId - Provider specific plan ID
 * @param {string} details.number - IUC number
 * @param {string} details.requestId
 * @param {Object} config - Provider configuration
 */
async function purchaseTV(details, config) {
    try {
        const { cableId, planId, number, requestId } = details;
        const { baseUrl, apiKey, userUrl } = config;

        let token = apiKey;
        if (userUrl) {
            const authResponse = await axios.post(userUrl, {}, {
                headers: { 'Authorization': `Basic ${apiKey}` }
            });
            if (authResponse.data && authResponse.data.AccessToken) {
                token = authResponse.data.AccessToken;
            }
        }

        const payload = {
            cable: cableId,
            iuc: number,
            cable_plan: planId,
            bypass: true,
            'request-id': requestId
        };

        const response = await axios.post(baseUrl, payload, {
            headers: {
                'Authorization': `Token ${token}`,
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
                message: result.msg || result.message || 'Transaction Failed',
                data: result
            };
        }
    } catch (error) {
        console.error('BasicProvider TV Error:', error.response?.data || error.message);
        return {
            status: 'failed',
            message: 'Provider Connection Error',
            error: error.message
        };
    }
}

/**
 * Verify Electricity Meter via Basic Auth Providers
 * @param {Object} details
 * @param {string} details.discoId - Provider specific disco code
 * @param {string} details.number - Meter number
 * @param {string} details.type - prepaid, postpaid
 * @param {Object} config - Provider configuration
 */
async function verifyElectricity(details, config) {
    try {
        const { discoId, number, type } = details;
        const { apiKey, verifyUrl } = config;

        if (!verifyUrl) throw new Error('Verification URL not configured');

        // URL format: verifyUrl?metertype=prepaid&disco=1&meternumber=1234567890
        const response = await axios.get(`${verifyUrl}?meter_type=${type || 'prepaid'}&disco=${discoId}&meter_number=${number}`, {
            headers: { 'Authorization': `Basic ${apiKey}` }
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
        console.error('BasicProvider Electricity Verify Error:', error.response?.data || error.message);
        return { valid: false, message: 'Provider Connection Error' };
    }
}

/**
 * Purchase Electricity Unit via Basic Auth Providers
 * @param {Object} details
 * @param {string} details.discoId - Provider specific disco code
 * @param {string} details.number - Meter number
 * @param {string} details.type - prepaid, postpaid
 * @param {number} details.amount
 * @param {string} details.phone
 * @param {string} details.requestId
 * @param {Object} config - Provider configuration
 */
async function purchaseElectricity(details, config) {
    try {
        const { discoId, number, type, amount, phone, requestId } = details;
        const { baseUrl, apiKey, userUrl } = config;

        let token = apiKey;
        if (userUrl) {
            const authResponse = await axios.post(userUrl, {}, {
                headers: { 'Authorization': `Basic ${apiKey}` }
            });
            if (authResponse.data && authResponse.data.AccessToken) {
                token = authResponse.data.AccessToken;
            }
        }

        const payload = {
            disco: discoId,
            meter_type: type || 'prepaid',
            meter_number: number,
            bypass: true,
            'request-id': requestId,
            amount: amount,
            phone: phone
        };

        const response = await axios.post(baseUrl, payload, {
            headers: {
                'Authorization': `Token ${token}`,
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
                token: result.token || result.mainToken
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
                message: result.msg || result.message || 'Transaction Failed',
                data: result
            };
        }
    } catch (error) {
        console.error('BasicProvider Electricity Error:', error.response?.data || error.message);
        return {
            status: 'failed',
            message: 'Provider Connection Error',
            error: error.message
        };
    }
}

/**
 * Purchase Exam Pin via Basic Auth Providers
 * @param {Object} details
 * @param {string} details.examId - Provider specific exam ID
 * @param {number} details.quantity
 * @param {string} details.requestId
 * @param {Object} config - Provider configuration
 */
async function purchaseExam(details, config) {
    try {
        const { examId, quantity, requestId } = details;
        const { baseUrl, apiKey, userUrl } = config;

        let token = apiKey;
        if (userUrl) {
            const authResponse = await axios.post(userUrl, {}, {
                headers: { 'Authorization': `Basic ${apiKey}` }
            });
            if (authResponse.data && authResponse.data.AccessToken) {
                token = authResponse.data.AccessToken;
            }
        }

        const payload = {
            exam: examId,
            quantity: quantity || 1,
            'request-id': requestId
        };

        const response = await axios.post(baseUrl, payload, {
            headers: {
                'Authorization': `Token ${token}`,
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
                pin: result.pin || result.pins
            };
        } else {
            return {
                status: 'failed',
                message: result.msg || result.message || 'Transaction Failed',
                data: result
            };
        }
    } catch (error) {
        console.error('BasicProvider Exam Error:', error.response?.data || error.message);
        return {
            status: 'failed',
            message: 'Provider Connection Error',
            error: error.message
        };
    }
}

/**
 * Purchase Data Pin via Basic Auth Providers
 */
async function purchaseDataPin(details, config) {
    try {
        const { networkId, planId, quantity, requestId, businessName } = details;
        const { baseUrl, apiKey, userUrl } = config;

        let token = apiKey;
        if (userUrl) {
            const authResponse = await axios.post(userUrl, {}, {
                headers: { 'Authorization': `Basic ${apiKey}` }
            });
            if (authResponse.data && authResponse.data.AccessToken) {
                token = authResponse.data.AccessToken;
            }
        }

        const payload = {
            network: networkId,
            plan_type: planId,
            card_name: businessName,
            quantity: quantity || 1,
            'request-id': requestId
        };

        const response = await axios.post(baseUrl, payload, {
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = response.data;
        const status = (result.Status || result.status || '').toLowerCase();

        if (status === 'successful' || status === 'success') {
            return {
                status: 'success',
                message: 'Data PIN Purchase Successful',
                data: result,
                pin: result.pin || result.pins
            };
        } else {
            return {
                status: 'failed',
                message: result.msg || result.message || 'Transaction Failed',
                data: result
            };
        }
    } catch (error) {
        console.error('BasicProvider DataPin Error:', error.response?.data || error.message);
        return {
            status: 'failed',
            message: 'Provider Connection Error',
            error: error.message
        };
    }
}

/**
 * Check Balance via Basic/Auth Providers
 * @param {Object} config - Provider configuration
 */
async function checkBalance(config) {
    try {
        const { apiKey, userUrl } = config;
        if (!userUrl) return { success: false, message: 'Auth URL not configured' };

        // Basic Auth to get token and details
        const response = await axios.post(userUrl, {}, {
            headers: { 'Authorization': `Basic ${apiKey}` }
        });

        const result = response.data;
        if (result.AccessToken) {
            // Some providers return balance in the same auth response
            return {
                success: true,
                balance: parseFloat(result.user?.balance || result.Balance || result.balance || 0)
            };
        } else {
            return { success: false, message: 'Auth Failed' };
        }
    } catch (error) {
        console.error('Basic Balance Error:', error.message);
        return { success: false, message: 'Connection Error' };
    }
}

/**
 * Fetch all data plans from Basic providers for price syncing and discovery.
 */
async function fetchDataPlans(config) {
    try {
        // Basic providers often have varying endpoints. 
        // We will try the standard /network/ endpoint first.
        const { baseUrl, apiKey } = config;
        if (!baseUrl) return { success: false, message: 'Base URL not configured' };

        const res = await axios.get(`${baseUrl.replace(/\/$/, '')}/network/`, {
            headers: { Authorization: `Token ${apiKey}` }
        });

        if (res.data && res.data.plan) {
            const plans = res.data.plan.map(plan => ({
                network: (plan.plan_network || '').toUpperCase().trim(),
                dataName: plan.plan,
                dataType: (plan.plan_type || '').toUpperCase().trim(),
                planId: String(plan.dataplan_id),
                apiPrice: parseFloat(plan.plan_amount),
                duration: plan.month_validate || '30 days'
            }));
            return { success: true, plans };
        }

        return { success: false, message: 'Dynamic fetching not yet supported for this Basic provider' };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

module.exports = { purchaseAirtime, purchaseData, verifyTV, purchaseTV, verifyElectricity, purchaseElectricity, purchaseExam, purchaseDataPin, checkBalance, fetchDataPlans };
