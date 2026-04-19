const axios = require('axios');
const prisma = require('../../prisma/client');

/**
 * AI Service for handling AI conversations via OpenRouter
 */
class AIService {
    /**
     * Get API configuration from database
     */
    async getConfiguration() {
        // Find OpenRouter API config setup in the database
        const provider = await prisma.apiProvider.findUnique({
            where: { name: 'openrouter' }
        });

        if (!provider || !provider.apiKey) {
            throw new Error('AI API (OpenRouter) is not configured in Admin panel.');
        }

        return {
            apiKey: provider.apiKey,
            baseUrl: provider.baseUrl || 'https://openrouter.ai/api/v1/chat/completions'
        };
    }

    /**
     * Send a message to AI and get a response
     * @param {Array} history - Array of previous messages from frontend (Gemini format: [{role: 'user'|'model', parts: [{text: '...'}]}])
     * @param {String} userMessage - The new message from user
     */
    async chat(history = [], userMessage) {
        const { apiKey, baseUrl } = await this.getConfiguration();

        const systemPrompt = `
You are the "Ufriends Assistant", the official strictly-scoped AI customer support for the Ufriends app (Ufriends Technology, Nigeria).

**CRITICAL DIRECTIVE**: Your answers MUST be extremely concise, precise, and highly specific to the Ufriends app. DO NOT give generic advice, and DO NOT give long-winded introductions. Get straight to the point. Answer ONLY based on the facts provided below. If a feature or problem is not covered below, immediately direct the user to email ufriends.it@gmail.com.

---

## UFRIENDS EXACT CAPABILITIES:
1. **Wallet & Funding:** Users get a unique NUBAN (Virtual Account) via Monnify or PaymentPoint after completing KYC (their BVN/NIN verification). To fund a wallet, users transfer money to that Virtual Account number. Funds credit automatically.
2. **Buy Data & Airtime:** (MTN, Airtel, Glo, 9mobile). Steps: Navigate to "Services" -> select network -> select plan -> enter number -> confirm with Transaction PIN.
3. **Utilities:** Pay for Electricity, Cable TV (DSTV, GOTV, Startimes), and Exam Pins.
4. **Airtime to Cash:** Convert excess airtime back into cash directly to the Ufriends wallet.
5. **Verification** (KYC): Generate BVN & NIN reports, do modifications/validation, or print BVN Plastics.
6. **CAC Registration:** Register Nigerian businesses through the platform.

---

## RULES FOR RESPONDING (MANDATORY):
- **Be brief**: Maximum of 4 sentences or a short bulleted list.
- **No filler**: DO NOT use phrases like "I can certainly help you with that" or "Here are the steps." Just provide the answer immediately.
- **Focus on Facts**: Never make up prices, timelines, or features not listed above.
- **Formatting**: Short bullet points. Do not use markdown headers (e.g., ##). Bold text is fine.

Example User: "How do I fund my wallet?"
Example You: "Simply make a regular bank transfer to the Virtual Account number displayed on your dashboard. Your Ufriends wallet will be credited automatically. If you do not see a virtual account, please complete your KYC verification."
`;

        // Map frontend expected format (Gemini) into standard OpenAI format for OpenRouter
        const openRouterMessages = history.map(msg => ({
            role: msg.role === 'model' ? 'assistant' : 'user',
            content: msg.parts && msg.parts[0] ? msg.parts[0].text : ''
        }));

        // Add system message at the beginning
        openRouterMessages.unshift({
            role: 'system',
            content: systemPrompt
        });

        // Add new user message at the end
        openRouterMessages.push({
            role: 'user',
            content: userMessage
        });

        const payload = {
            model: 'z-ai/glm-4.5-air:free',
            messages: openRouterMessages,
        };

        let retries = 3;
        const https = require('https');
        const agent = new https.Agent({ family: 4 });

        while (retries > 0) {
            try {
                const response = await axios.post(baseUrl, payload, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://ufriends.com.ng', // OpenRouter standard
                        'X-Title': 'Ufriends Assistant'
                    },
                    httpsAgent: agent,
                    timeout: 60000 // 60s timeout
                });

                if (response.data && response.data.choices && response.data.choices[0].message) {
                    return response.data.choices[0].message.content;
                }

                throw new Error('Invalid response from AI API');
            } catch (error) {
                retries -= 1;
                console.error(`AI API Error (Retries left: ${retries}):`, {
                    status: error.response?.status,
                    data: error.response?.data,
                    message: error.message
                });
                
                if (retries === 0) {
                    throw new Error(error.response?.data?.error?.message || 'The Ufriends Assistant is currently busy. Please try again later.');
                }
                
                // Wait for 2 seconds before retrying
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
}

module.exports = new AIService();
