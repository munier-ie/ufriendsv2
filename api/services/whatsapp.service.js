const axios = require('axios');
const prisma = require('../../prisma/client');

/**
 * WhatsApp Service for sending automated notifications
 * Compatible with generic HTTP-based WhatsApp API gateways
 */
class WhatsappService {
    /**
     * Get WhatsApp configuration from AppSettings
     */
    async getConfiguration() {
        const settings = await prisma.appSetting.findMany({
            where: {
                key: {
                    in: ['admin_whatsapp_number', 'whatsapp_api_key', 'whatsapp_api_url']
                }
            }
        });

        const adminNumber = settings.find(s => s.key === 'admin_whatsapp_number')?.value;
        const apiKey = settings.find(s => s.key === 'whatsapp_api_key')?.value;
        const apiUrl = settings.find(s => s.key === 'whatsapp_api_url')?.value;

        return { adminNumber, apiKey, apiUrl };
    }

    /**
     * Send a WhatsApp message
     * @param {string} to - Recipient phone number (default to admin if not provided)
     * @param {string} message - Message content
     */
    async sendMessage(message, to = null) {
        try {
            const config = await this.getConfiguration();
            const recipient = to || config.adminNumber;

            if (!recipient || !config.apiKey || !config.apiUrl) {
                console.warn('[WhatsappService] Configuration missing, skipping message.');
                return { success: false, error: 'Configuration missing' };
            }

            // Note: The structure here is generic. 
            // Many providers (like Termii or SmartSMS) use similar POST structures.
            // Example for Termii: 
            // { to: recipient, from: "Ufriends", sms: message, type: "whatsapp", api_key: apiKey }

            const payload = {
                to: recipient,
                message: message,
                api_key: config.apiKey
            };

            const response = await axios.post(config.apiUrl, payload, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            console.log('[WhatsappService] Message sent successfully:', response.data);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('[WhatsappService] Error sending message:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Notify Admin about a new manual service request
     */
    async notifyAdminNewRequest(user, label, amount, transRef) {
        const message = `*New Manual Service Request*\n\n` +
            `*User:* ${user.firstName} ${user.lastName} (${user.phone})\n` +
            `*Service:* ${label}\n` +
            `*Amount:* ₦${parseFloat(amount).toLocaleString()}\n` +
            `*Ref:* ${transRef}\n\n` +
            `Please log in to the admin dashboard to review and process this request.`;

        return this.sendMessage(message);
    }

    /**
     * Notify user about a manual service request update
     */
    async notifyManualServiceUpdate(user, serviceType, updatedStatus, transRef, adminNote) {
        const statusStr = updatedStatus === 1 ? 'Approved' : updatedStatus === 2 ? 'Rejected' : updatedStatus === 3 ? 'In Progress' : 'Pending';
        let message = `*Service Update - Ufriends*\n\n` +
            `Hello ${user.firstName},\n` +
            `Your manual service request for *${serviceType}* (Ref: ${transRef}) has been updated.\n\n` +
            `*Status:* ${statusStr}\n`;
            
        if (adminNote) {
            message += `\n*Admin Note:*\n${adminNote}\n`;
        }
        
        return this.sendMessage(message, user.phone);
    }
}

module.exports = new WhatsappService();
