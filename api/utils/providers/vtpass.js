const axios = require('axios');
const moment = require('moment');

/**
 * Purchase Airtime via VTPass
 * @param {Object} details
 * @param {string} details.network - MTN, GLO, AIRTEL, 9MOBILE
 * @param {number} details.amount
 * @param {string} details.phone
 * @param {string} details.requestId
 * @param {Object} config - Provider configuration (apiKey, etc.)
 */
async function purchaseAirtime(details, config) {
    try {
        const { network, amount, phone, requestId } = details;
        const { apiKey, secretKey, baseUrl } = config;

        // Map network names to VTPass service IDs
        const networkMap = {
            'mtn': 'mtn',
            'glo': 'glo',
            'airtel': 'airtel',
            '9mobile': 'etisalat',
            'etisalat': 'etisalat'
        };

        const serviceID = networkMap[network.toLowerCase()];
        if (!serviceID) throw new Error(`Unsupported network: ${network}`);

        // Prepare request
        // VTPass requires Basic Auth or api-key/secret-key headers depending on implementation
        // Version 3 uses api-key and secret-key headers

        const payload = {
            request_id: requestId,
            serviceID: serviceID,
            amount: amount,
            phone: phone
        };

        const headers = {
            'api-key': apiKey,
            'secret-key': secretKey
        };

        const response = await axios.post(`${baseUrl}/pay`, payload, { headers });

        // Log response (in a real app, use a logger)
        console.log('VTPass Response:', response.data);

        const { code, content } = response.data;

        if (code === '000') {
            return {
                status: 'success',
                message: 'Transaction Successful',
                data: content,
                reference: content?.transactions?.transactionId
            };
        } else if (code === '099') {
            return {
                status: 'pending',
                message: 'Transaction Processing',
                data: content,
                reference: content?.transactions?.transactionId
            };
        } else {
            return {
                status: 'failed',
                message: response.data.response_description || 'Transaction Failed',
                data: response.data
            };
        }

    } catch (error) {
        console.error('VTPass Error:', error.response?.data || error.message);
        return {
            status: 'failed',
            message: 'Provider Connection Error',
            error: error.message
        };
    }
}

/**
 * Purchase Data via VTPass
 * @param {Object} details
 * @param {string} details.network - MTN, GLO, AIRTEL, 9MOBILE
 * @param {string} details.phone
 * @param {string} details.requestId
 * @param {string} details.variationCode - VTPass specific plan ID
 * @param {Object} config - Provider configuration
 */
async function purchaseData(details, config) {
    try {
        const { network, phone, requestId, variationCode } = details;
        const { apiKey, secretKey, baseUrl } = config;

        const networkMap = {
            'mtn': 'mtn-data',
            'glo': 'glo-data',
            'airtel': 'airtel-data',
            '9mobile': 'etisalat-data',
            'etisalat': 'etisalat-data'
        };

        const serviceID = networkMap[network.toLowerCase()];
        if (!serviceID) throw new Error(`Unsupported network for data: ${network}`);

        const payload = {
            request_id: requestId,
            serviceID: serviceID,
            variation_code: variationCode,
            phone: phone
        };

        const headers = {
            'api-key': apiKey,
            'secret-key': secretKey
        };

        const response = await axios.post(`${baseUrl}/pay`, payload, { headers });
        console.log('VTPass Data Response:', response.data);

        const { code, content } = response.data;

        if (code === '000') {
            return {
                status: 'success',
                message: 'Data Purchase Successful',
                data: content,
                reference: content?.transactions?.transactionId
            };
        } else if (code === '099') {
            return {
                status: 'pending',
                message: 'Transaction Processing',
                data: content,
                reference: content?.transactions?.transactionId
            };
        } else {
            return {
                status: 'failed',
                message: response.data.response_description || 'Transaction Failed',
                data: response.data
            };
        }

    } catch (error) {
        console.error('VTPass Data Error:', error.response?.data || error.message);
        return {
            status: 'failed',
            message: 'Provider Connection Error',
            error: error.message
        };
    }
}

/**
 * Verify TV/Cable IUC/SmartCard via VTPass
 * @param {Object} details
 * @param {string} details.serviceID - dstv, gotv, startimes
 * @param {string} details.number - IUC/Smartcard number
 * @param {Object} config - Provider configuration
 */
async function verifyTV(details, config) {
    try {
        const { serviceID, number } = details;
        const { apiKey, secretKey, baseUrl } = config;

        const payload = {
            serviceID: serviceID,
            billersCode: number
        };

        const headers = {
            'api-key': apiKey,
            'secret-key': secretKey
        };

        const response = await axios.post(`${baseUrl}/merchant-verify`, payload, { headers });
        console.log('VTPass TV Verify Response:', response.data);

        const { code, content } = response.data;

        if (code === '000') {
            return {
                valid: true,
                customerName: content.Customer_Name || content.name,
                data: content
            };
        } else {
            return {
                valid: false,
                message: response.data.response_description || 'Verification Failed'
            };
        }
    } catch (error) {
        console.error('VTPass TV Verify Error:', error.response?.data || error.message);
        return { valid: false, message: 'Provider Connection Error' };
    }
}

/**
 * Purchase TV Subscription via VTPass
 * @param {Object} details
 * @param {string} details.serviceID - dstv, gotv, startimes
 * @param {string} details.variationCode - Plan ID
 * @param {string} details.number - IUC number
 * @param {string} details.phone - Customer phone
 * @param {string} details.requestId
 * @param {Object} config - Provider configuration
 */
async function purchaseTV(details, config) {
    try {
        const { serviceID, variationCode, number, phone, requestId, subscriptionType } = details;
        const { apiKey, secretKey, baseUrl } = config;

        const payload = {
            request_id: requestId,
            serviceID: serviceID,
            variation_code: variationCode,
            billersCode: number,
            phone: phone,
            subscription_type: subscriptionType || 'change' // change or renew
        };

        const headers = {
            'api-key': apiKey,
            'secret-key': secretKey
        };

        const response = await axios.post(`${baseUrl}/pay`, payload, { headers });
        console.log('VTPass TV Purchase Response:', response.data);

        const { code, content } = response.data;

        if (code === '000') {
            return {
                status: 'success',
                message: 'TV Purchase Successful',
                data: content,
                reference: content?.transactions?.transactionId
            };
        } else if (code === '099') {
            return {
                status: 'pending',
                message: 'Transaction Processing',
                data: content,
                reference: content?.transactions?.transactionId
            };
        } else {
            return {
                status: 'failed',
                message: response.data.response_description || 'Transaction Failed',
                data: response.data
            };
        }
    } catch (error) {
        console.error('VTPass TV Error:', error.response?.data || error.message);
        return {
            status: 'failed',
            message: 'Provider Connection Error',
            error: error.message
        };
    }
}

/**
 * Verify Electricity Meter via VTPass
 * @param {Object} details
 * @param {string} details.serviceID - e.g. ikeja-electric
 * @param {string} details.number - Meter number
 * @param {string} details.type - prepaid, postpaid
 * @param {Object} config - Provider configuration
 */
async function verifyElectricity(details, config) {
    try {
        const { serviceID, number, type } = details;
        const { apiKey, secretKey, baseUrl } = config;

        const payload = {
            serviceID: serviceID,
            billersCode: number,
            type: type || 'prepaid'
        };

        const headers = {
            'api-key': apiKey,
            'secret-key': secretKey
        };

        const response = await axios.post(`${baseUrl}/merchant-verify`, payload, { headers });
        console.log('VTPass Electricity Verify Response:', response.data);

        const { code, content } = response.data;

        if (code === '000') {
            return {
                valid: true,
                customerName: content.Customer_Name || content.name,
                data: content
            };
        } else {
            return {
                valid: false,
                message: response.data.response_description || 'Verification Failed'
            };
        }
    } catch (error) {
        console.error('VTPass Electricity Verify Error:', error.response?.data || error.message);
        return { valid: false, message: 'Provider Connection Error' };
    }
}

/**
 * Purchase Electricity Unit via VTPass
 * @param {Object} details
 * @param {string} details.serviceID - e.g. ikeja-electric
 * @param {string} details.variationCode - prepaid, postpaid
 * @param {string} details.number - Meter number
 * @param {number} details.amount
 * @param {string} details.phone
 * @param {string} details.requestId
 * @param {Object} config - Provider configuration
 */
async function purchaseElectricity(details, config) {
    try {
        const { serviceID, variationCode, number, amount, phone, requestId } = details;
        const { apiKey, secretKey, baseUrl } = config;

        const payload = {
            request_id: requestId,
            serviceID: serviceID,
            variation_code: variationCode || 'prepaid',
            billersCode: number,
            amount: amount,
            phone: phone
        };

        const headers = {
            'api-key': apiKey,
            'secret-key': secretKey
        };

        const response = await axios.post(`${baseUrl}/pay`, payload, { headers });
        console.log('VTPass Electricity Purchase Response:', response.data);

        const { code, content } = response.data;

        if (code === '000') {
            return {
                status: 'success',
                message: 'Electricity Purchase Successful',
                data: content,
                token: content?.mainToken || content?.token,
                reference: content?.transactions?.transactionId
            };
        } else if (code === '099') {
            return {
                status: 'pending',
                message: 'Transaction Processing',
                data: content,
                reference: content?.transactions?.transactionId
            };
        } else {
            return {
                status: 'failed',
                message: response.data.response_description || 'Transaction Failed',
                data: response.data
            };
        }
    } catch (error) {
        console.error('VTPass Electricity Error:', error.response?.data || error.message);
        return {
            status: 'failed',
            message: 'Provider Connection Error',
            error: error.message
        };
    }
}

/**
 * Purchase Exam Pin via VTPass
 * @param {Object} details
 * @param {string} details.serviceID - waec, neco, etc.
 * @param {string} details.variationCode - Plan ID
 * @param {number} details.quantity
 * @param {string} details.phone
 * @param {string} details.requestId
 * @param {Object} config - Provider configuration
 */
async function purchaseExam(details, config) {
    try {
        const { serviceID, variationCode, quantity, phone, requestId } = details;
        const { apiKey, secretKey, baseUrl } = config;

        const payload = {
            request_id: requestId,
            serviceID: serviceID,
            variation_code: variationCode,
            quantity: quantity || 1,
            phone: phone
        };

        const headers = {
            'api-key': apiKey,
            'secret-key': secretKey
        };

        const response = await axios.post(`${baseUrl}/pay`, payload, { headers });
        console.log('VTPass Exam Purchase Response:', response.data);

        const { code, content } = response.data;

        if (code === '000') {
            // VTPass returns pins in content.cards or similar
            const pins = content?.cards?.map(c => c.pin).join(', ') || content?.pin || '';
            return {
                status: 'success',
                message: 'Exam PIN Purchase Successful',
                data: content,
                pin: pins,
                reference: content?.transactions?.transactionId
            };
        } else if (code === '099') {
            return {
                status: 'pending',
                message: 'Transaction Processing',
                data: content,
                reference: content?.transactions?.transactionId
            };
        } else {
            return {
                status: 'failed',
                message: response.data.response_description || 'Transaction Failed',
                data: response.data
            };
        }
    } catch (error) {
        console.error('VTPass Exam Error:', error.response?.data || error.message);
        return {
            status: 'failed',
            message: 'Provider Connection Error',
            error: error.message
        };
    }
}

/**
 * Purchase Data Pin via VTPass
 * @param {Object} details
 */
async function purchaseDataPin(details, config) {
    // VTPass handles data pins similarly to data or exams depending on the serviceID
    // For now, let's use the same logic as purchaseExam but with a different message
    const res = await purchaseExam(details, config);
    if (res.status === 'success') {
        res.message = 'Data PIN Purchase Successful';
    }
    return res;
}

/**
 * Check Balance via VTPass
 * @param {Object} config - Provider configuration
 */
async function checkBalance(config) {
    try {
        const { apiKey, secretKey, baseUrl } = config;
        const headers = { 'api-key': apiKey, 'secret-key': secretKey };

        const response = await axios.get(`${baseUrl}/balance`, { headers });
        const { code, contents } = response.data;

        if (code === '000') {
            return {
                success: true,
                balance: parseFloat(contents.balance || 0)
            };
        } else {
            return {
                success: false,
                message: response.data.response_description || 'Failed to fetch balance'
            };
        }
    } catch (error) {
        console.error('VTPass Balance Error:', error.message);
        return { success: false, message: 'Connection Error' };
    }
}

/**
 * Fetch all data plans from VTPass for price syncing and discovery.
 */
async function fetchDataPlans(config) {
    try {
        const { apiKey, secretKey, baseUrl } = config;
        const headers = { 'api-key': apiKey, 'secret-key': secretKey };

        const networks = ['mtn-data', 'glo-data', 'airtel-data', 'etisalat-data'];
        const allPlans = [];

        for (const serviceID of networks) {
            try {
                const res = await axios.get(`${baseUrl}/service-variations?serviceID=${serviceID}`, { headers });
                if (res.data && res.data.content && res.data.content.varations) {
                    res.data.content.varations.forEach(v => {
                        allPlans.push({
                            network: serviceID.split('-')[0].toUpperCase(),
                            dataName: v.name,
                            dataType: 'GIFTING',
                            planId: v.variation_code,
                            apiPrice: parseFloat(v.variation_amount),
                            duration: '30 days'
                        });
                    });
                }
            } catch (err) {
                console.error(`VTPass fetchDataPlans Error for ${serviceID}:`, err.message);
            }
        }

        return { success: true, plans: allPlans };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

/**
 * Fetch all Cable TV plans from VTPass for price syncing and discovery.
 * Uses the service-variations endpoint for dstv, gotv, and startimes.
 */
async function fetchCablePlans(config) {
    try {
        const { apiKey, secretKey, baseUrl } = config;
        const headers = { 'api-key': apiKey, 'secret-key': secretKey };

        const cableServices = ['dstv', 'gotv', 'startimes'];
        const plans = [];

        for (const serviceID of cableServices) {
            try {
                const res = await axios.get(`${baseUrl}/service-variations?serviceID=${serviceID}`, { headers });
                if (res.data && res.data.content && res.data.content.varations) {
                    res.data.content.varations.forEach(v => {
                        plans.push({
                            provider: serviceID,              // 'dstv' | 'gotv' | 'startimes'
                            name: v.name,
                            code: v.variation_code,           // used as `code` in Service table
                            apiPrice: parseFloat(v.variation_amount)
                        });
                    });
                }
            } catch (err) {
                console.error(`VTPass fetchCablePlans Error for ${serviceID}:`, err.message);
            }
        }

        if (plans.length === 0) {
            return { success: false, message: 'No cable plans returned from VTPass' };
        }

        return { success: true, plans };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

/**
 * Fetch all Exam Pin plans from VTPass for price syncing and discovery.
 * Uses the service-variations endpoint for waec and neco.
 */
async function fetchExamPlans(config) {
    try {
        const { apiKey, secretKey, baseUrl } = config;
        const headers = { 'api-key': apiKey, 'secret-key': secretKey };

        const examServices = [
            { serviceID: 'waec', examType: 'WAEC' },
            { serviceID: 'neco', examType: 'NECO' },
            { serviceID: 'nabteb', examType: 'NABTEB' }
        ];
        const plans = [];

        for (const { serviceID, examType } of examServices) {
            try {
                const res = await axios.get(`${baseUrl}/service-variations?serviceID=${serviceID}`, { headers });
                if (res.data && res.data.content && res.data.content.varations) {
                    res.data.content.varations.forEach(v => {
                        plans.push({
                            examType,
                            name: v.name,
                            code: v.variation_code,
                            apiPrice: parseFloat(v.variation_amount)
                        });
                    });
                }
            } catch (err) {
                console.error(`VTPass fetchExamPlans Error for ${serviceID}:`, err.message);
            }
        }

        if (plans.length === 0) {
            return { success: false, message: 'No exam plans returned from VTPass' };
        }

        return { success: true, plans };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

module.exports = { purchaseAirtime, purchaseData, verifyTV, purchaseTV, verifyElectricity, purchaseElectricity, purchaseExam, purchaseDataPin, checkBalance, fetchDataPlans, fetchCablePlans, fetchExamPlans };
