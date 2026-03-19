const axios = require('axios');

/**
 * Purchase Airtime via TopupBox
 * @param {Object} details
 * @param {string} details.network - MTN, GLO, AIRTEL, 9MOBILE
 * @param {number} details.amount
 * @param {string} details.phone
 * @param {string} details.requestId
 * @param {Object} config - Provider configuration
 */
async function purchaseAirtime(details, config) {
    try {
        const { network, amount, phone, requestId } = details;
        const { apiKey } = config;

        // "https://api.topupbox.com/services/api/v2/w1/recharge/".strtoupper($networkname)."/AIRTIME"
        const networkName = network.toUpperCase();
        const url = `https://api.topupbox.com/services/api/v2/w1/recharge/${networkName}/AIRTIME`;

        const payload = {
            amount: amount,
            beneficiary: phone,
            customer_reference: requestId
        };

        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            }
        });

        const result = response.data;
        console.log('TopupBox Response:', result);

        // Version 3 check: if($result->status=='2000' || $result->response <> null)
        if (result.status == '2000' || result.response) {
            return {
                status: 'success',
                message: 'Transaction Successful',
                data: result
            };
        } else {
            return {
                status: 'failed',
                message: result.message || 'Transaction Failed',
                data: result
            };
        }

    } catch (error) {
        console.error('TopupBox Error:', error.response?.data || error.message);
        return {
            status: 'failed',
            message: 'Provider Connection Error',
            error: error.message
        };
    }
}

module.exports = { purchaseAirtime };
