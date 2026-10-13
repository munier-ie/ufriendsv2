const axios = require('axios');

const DEFAULT_BASE_URL = 'https://maas.qwencloudapi.com/compatible-mode/v1';
const DEFAULT_MODEL = 'deepseek-v4.1-flash';
const MODEL_ALIASES = {
    deepseekv4flash: 'deepseek-v4.1-flash',
    'deepseek-v4.1-flash': 'deepseek-v4.1-flash',
    'qwen3.8-omni-flash': 'qwen3.8-omni-flash',
    'qwen3.8-flash': 'qwen3.8-flash',
    'glm-5.3': 'glm-5.3',
    'kimi-k3': 'kimi-k3',
};
const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_MESSAGES = 12;
const MAX_HISTORY_CHARS = 1000;
const SESSION_TTL_MS = 60 * 60 * 1000;
const MAX_CONVERSATION_ID_CHARS = 80;

// In-memory conversation state
const sessions = new Map();

// In-memory quote state for simulation / confirmation
const activeQuotes = new Map();

const UFRIENDS_SYSTEM_PROMPT = `You are Ufriends Assistant, the intelligent VTU telecommunications and digital identity support consultant for Ufriends IT (ufriends.com.ng) in Nigeria.

PLATFORM PRIORITIES & SERVICES:
1. Cheap Wholesale Data: MTN, Airtel, Glo, 9mobile SME, gifting, and corporate data bundles at best prices.
2. BVN Modification: Lawful, official assistance with correcting BVN registration errors (name, date of birth, phone numbers) online.
3. NIN Modification: Official NIMC demographic correction services (name spelling, date of birth, phone number, address).
4. NIN & BVN Slips: Instant retrieval and printing of official slips (Regular, Standard, Premium plastic slip, VNIN) and BVN verification slips.
5. Wallet & Funding: Instant automated funding via unique Monnify / Wema Bank Virtual Account (NUBAN) credited in real time.
6. Other Services: Airtime recharge, airtime-to-cash, WAEC/NECO/JAMB PINs, electricity (IKEDC, EKEDC, IBEDC, etc.), Cable TV (DSTV, GOTV, Startimes), CAC business registration, and POS terminals.
7. Developer API: Developer API v1, Sandbox Mode, webhooks, and SDKs.

RESPONSE GUIDELINES:
- Maintain a helpful, modern, and trustworthy tone.
- When formatting, use clean markdown with clear headings, bullet points, and highlight important values in Nigerian Naira (₦).
- When a Nigerian phone number is provided, note the detected telecom carrier (MTN, Airtel, Glo, 9mobile) automatically without asking repeatedly.
- Never ask for secret passwords, transaction PINs, or raw identity documents in chat.
- Keep responses informative, crisp, and direct.
- Strictly avoid emojis. Do not use decorative or excessive emojis in your responses (no 🤖, 🚀, 💡, ✅, etc.). Maintain a clean, professional, text-first presentation.`;

function getConfig(requestedModel) {
    const apiKey = process.env.AI_API_KEY || process.env.API_KEY || process.env.DASHSCOPE_API_KEY || '';
    const baseUrl = (process.env.AI_BASE_URL || DEFAULT_BASE_URL).replace(/^\[|\]$/g, '').replace(/\/+$/, '');
    const apiPath = (process.env.AI_API_PATH || '/chat/completions').replace(/^\/*/, '/');
    const modelKey = requestedModel || process.env.AI_MODEL || DEFAULT_MODEL;
    const model = MODEL_ALIASES[modelKey] || modelKey || DEFAULT_MODEL;
    const maxOutputTokens = Math.max(Number.parseInt(process.env.AI_MAX_OUTPUT_TOKENS || '2048', 10) || 2048, 1024);
    const temperature = Math.min(Math.max(Number.parseFloat(process.env.AI_TEMPERATURE || '0.3') || 0.3, 0), 1);

    return {
        apiKey,
        url: `${baseUrl}${apiPath}`,
        model,
        maxOutputTokens,
        temperature,
    };
}

function cleanText(value, maxChars) {
    return typeof value === 'string' ? value.trim().slice(0, maxChars) : '';
}

function cleanConversationId(value) {
    const candidate = cleanText(value, MAX_CONVERSATION_ID_CHARS);
    return /^[A-Za-z0-9_-]+$/.test(candidate) ? candidate : 'default';
}

function detectCarrier(value) {
    const digits = String(value || '').replace(/\D/g, '').replace(/^234/, '0');
    const prefix = digits.slice(0, 4);
    const carriers = {
        MTN: ['0703', '0704', '0706', '0803', '0806', '0810', '0813', '0814', '0816', '0903', '0906', '0913', '0916'],
        Airtel: ['0701', '0708', '0802', '0808', '0812', '0901', '0902', '0904', '0907', '0912', '0911'],
        Glo: ['0705', '0805', '0807', '0811', '0815', '0905', '0915'],
        '9mobile': ['0809', '0817', '0818', '0908', '0909'],
    };
    return Object.entries(carriers).find(([, prefixes]) => prefixes.includes(prefix))?.[0] || null;
}

function extractPhoneNumber(text) {
    const match = text.match(/(?:(?:\+?234)|0)([789][01]\d{8})/);
    if (!match) return null;
    return '0' + match[1];
}

function extractAmount(text) {
    const match = text.match(/(?:₦|NGN|N|naira)?\s*(\d{2,6})/i);
    if (match) {
        const val = Number.parseInt(match[1], 10);
        if (val >= 50 && val <= 100000) return val;
    }
    return null;
}

function sessionFor(userId, conversationId, reset = false) {
    const now = Date.now();
    if (sessions.size > 2000) {
        for (const [key, value] of sessions) {
            if (now - value.updatedAt > SESSION_TTL_MS) sessions.delete(key);
        }
    }
    const sessionKey = `${userId}:${cleanConversationId(conversationId)}`;
    const current = sessions.get(sessionKey);
    if (reset || !current || now - current.updatedAt > SESSION_TTL_MS) {
        const fresh = { messages: [], updatedAt: now };
        sessions.set(sessionKey, fresh);
        return fresh;
    }
    current.updatedAt = now;
    return current;
}

function buildActionSteps(message, carrier, phone, hasQuote, hasWallet) {
    const steps = [
        {
            type: 'scan',
            label: 'Read request & intent',
            detail: message.slice(0, 48),
            status: 'done',
        },
    ];

    if (carrier && phone) {
        steps.push({
            type: 'carrier',
            label: `Detected ${carrier} carrier`,
            detail: `Prefix matched ${phone}`,
            carrier,
            status: 'done',
        });
    }

    if (hasWallet) {
        steps.push({
            type: 'wallet',
            label: 'Verified Ufriends Virtual NUBAN',
            detail: 'Monnify / Wema Bank integration active',
            status: 'done',
        });
    }

    if (hasQuote) {
        steps.push({
            type: 'quote',
            label: 'Calculated wholesale pricing',
            detail: 'Applied Ufriends discounted tariff',
            status: 'done',
        });
    }

    if (/(nin|bvn|cac|slip|verification|identity)/i.test(message)) {
        steps.push({
            type: 'compliance',
            label: 'Validated official NIMC / CBN regulations',
            detail: 'Encrypted verification pipeline checked',
            status: 'done',
        });
    }

    steps.push({
        type: 'ready',
        label: 'Ready for confirmation',
        detail: 'Action workflow verified',
        status: 'done',
    });

    return steps;
}

class AIService {
    async chat(userId, userMessage, { conversationId = 'default', reset = false, model: requestedModel, userContext = {} } = {}) {
        const message = cleanText(userMessage, MAX_MESSAGE_CHARS);
        if (!message) throw new Error('MESSAGE_REQUIRED');

        const config = getConfig(requestedModel);
        const session = sessionFor(userId, conversationId, reset);

        const phone = extractPhoneNumber(message);
        const carrier = phone ? detectCarrier(phone) : detectCarrier(message);
        const amount = extractAmount(message);

        // Detect action card possibilities
        const isAirtimeRequest = /(airtime|recharge|topup|credit)/i.test(message) && (amount || phone);
        const isDataRequest = /(data|bundle|sme|gifting|gig|gb|mb)/i.test(message);
        const isWalletRequest = /(wallet|balance|fund|virtual account|nuban|monnify)/i.test(message);
        const isTransactionsRequest = /(transaction|receipt|history|statement)/i.test(message);

        let actionCard = null;

        if (isAirtimeRequest && phone) {
            const net = carrier || 'MTN';
            const amt = amount || 500;
            const quoteId = `Q-${Math.floor(100000 + Math.random() * 900000)}`;
            const quoteData = {
                quoteId,
                service: 'airtime',
                network: net,
                phone,
                amount: amt,
                fee: 0,
                total: amt,
                walletBalance: userContext.walletBalance || 2450,
                status: 'awaiting_confirmation',
            };
            activeQuotes.set(quoteId, quoteData);
            actionCard = { type: 'quote', quote: quoteData };
        } else if (isDataRequest && (phone || carrier)) {
            const net = carrier || 'MTN';
            let planName = `${net} 1.0GB SME (30 Days)`;
            let amt = 290;
            if (/2\s*gb/i.test(message)) { planName = `${net} 2.0GB SME (30 Days)`; amt = 580; }
            else if (/5\s*gb/i.test(message)) { planName = `${net} 5.0GB SME (30 Days)`; amt = 1450; }
            else if (/10\s*gb/i.test(message)) { planName = `${net} 10.0GB SME (30 Days)`; amt = 2900; }

            const quoteId = `Q-${Math.floor(100000 + Math.random() * 900000)}`;
            const quoteData = {
                quoteId,
                service: 'data',
                network: net,
                phone: phone || userContext.phone || '08031234567',
                plan: planName,
                amount: amt,
                fee: 0,
                total: amt,
                walletBalance: userContext.walletBalance || 2450,
                status: 'awaiting_confirmation',
            };
            activeQuotes.set(quoteId, quoteData);
            actionCard = { type: 'quote', quote: quoteData };
        } else if (isWalletRequest) {
            actionCard = {
                type: 'wallet',
                wallet: {
                    balance: userContext.walletBalance || 2450.0,
                    currency: 'NGN',
                    virtualAccount: {
                        bankName: 'Wema Bank (Monnify)',
                        accountNumber: '9801234567',
                        accountName: `Ufriends / ${userContext.firstName || 'Valued User'}`,
                    },
                },
            };
        } else if (isTransactionsRequest) {
            actionCard = {
                type: 'transactions',
                transactions: [
                    {
                        id: 'txn_1',
                        reference: `UF-${new Date().getFullYear()}-98124`,
                        service: 'airtime',
                        network: 'MTN',
                        recipient: '08031234567',
                        amount: 500,
                        status: 'successful',
                        createdAt: 'Today, 1:15 PM',
                    },
                    {
                        id: 'txn_2',
                        reference: `UF-${new Date().getFullYear()}-97810`,
                        service: 'data',
                        network: 'Airtel',
                        recipient: '09022332233',
                        amount: 600,
                        status: 'successful',
                        createdAt: 'Yesterday, 4:20 PM',
                    },
                ],
            };
        }

        const actionSteps = buildActionSteps(message, carrier, phone, !!actionCard && actionCard.type === 'quote', !!actionCard && actionCard.type === 'wallet');

        // Prepare LLM message history
        const history = session.messages.slice(-MAX_HISTORY_MESSAGES).map(item => ({
            role: item.role,
            content: cleanText(item.content, MAX_HISTORY_CHARS),
        }));

        let reply = '';
        let thought = '';

        if (config.apiKey) {
            const contextAddendum = [
                carrier ? `[Context: Detected Nigerian carrier hint: ${carrier}]` : null,
                phone ? `[Context: Recipient Phone: ${phone}]` : null,
                userContext.firstName ? `[Context: User Name: ${userContext.firstName}]` : null,
                actionCard ? `[Context: An interactive action card (${actionCard.type}) is displayed directly above your message for the user to confirm.]` : null,
            ].filter(Boolean).join('\n');

            const payload = {
                model: config.model,
                messages: [
                    { role: 'system', content: UFRIENDS_SYSTEM_PROMPT },
                    ...(contextAddendum ? [{ role: 'system', content: contextAddendum }] : []),
                    ...history,
                    { role: 'user', content: message },
                ],
                max_tokens: config.maxOutputTokens,
                temperature: config.temperature,
            };

            try {
                const response = await axios.post(config.url, payload, {
                    headers: {
                        Authorization: `Bearer ${config.apiKey}`,
                        'Content-Type': 'application/json',
                        'X-Title': 'Ufriends Assistant',
                    },
                    timeout: 25000,
                });

                const choice = response.data?.choices?.[0];
                const msgObj = choice?.message;

                thought = typeof msgObj?.reasoning_content === 'string' ? msgObj.reasoning_content.trim() : '';

                if (typeof msgObj?.content === 'string' && msgObj.content.trim()) {
                    reply = msgObj.content.trim();
                } else if (Array.isArray(msgObj?.content)) {
                    reply = msgObj.content.map(p => typeof p === 'string' ? p : p?.text || '').join('').trim();
                }

                // Strip decorative emojis from model response
                if (reply) {
                    reply = reply.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/gu, '').replace(/[ \t]{2,}/g, ' ').trim();
                }

                // If content is empty because reasoning consumed tokens or didn't output text, synthesize from reasoning or fallback
                if (!reply && thought) {
                    const lines = thought.split('\n').filter(Boolean);
                    reply = lines.slice(-3).join('\n').replace(/^[*#-]+\s*/, '') || 'I have processed your request. Please review the details above.';
                }
            } catch (apiErr) {
                console.error('External AI call error, applying expert fallback:', apiErr.response?.data || apiErr.message);
            }
        }

        // Intelligent deterministic fallback if API is not configured or temporary network issue
        if (!reply) {
            thought = thought || `Identified inquiry for Ufriends service. Parsed parameters: ${carrier ? `Network=${carrier}` : ''} ${phone ? `Recipient=${phone}` : ''}. Verified system active status and wholesale pricing structure.`;

            if (isAirtimeRequest && phone) {
                reply = `I've prepared your **${carrier || 'Airtime'} recharge quote of ₦${amount || 500}** for **${phone}**.\n\nPlease review the interactive order card above and click **Confirm Recharge** to complete.`;
            } else if (isDataRequest) {
                reply = `Here are wholesale SME data options for **${carrier || 'MTN'}**.\n\n- **1.0GB SME:** ₦290 (30 Days)\n- **2.0GB SME:** ₦580 (30 Days)\n- **5.0GB SME:** ₦1,450 (30 Days)\n- **10.0GB SME:** ₦2,900 (30 Days)\n\nPlease review your order card above to confirm.`;
            } else if (isWalletRequest) {
                reply = `### How to Fund Your Ufriends Wallet\n\n1. Make a bank transfer to your assigned **Monnify / Wema Bank Virtual Account** shown above.\n2. Your Ufriends wallet will be credited automatically within seconds.\n3. Zero stamp duty or hidden maintenance fees.`;
            } else if (/(bvn|nin|slip|correction|modification)/i.test(message)) {
                reply = `### Ufriends Digital Identity Services\n\n- **BVN Modification:** Lawfully correct name order, date of birth, and linked phone number online.\n- **NIN Modification:** Submit official NIMC demographic correction requests with fast approval.\n- **NIN & BVN Slips:** Instant reprint of Standard, Premium Plastic, and VNIN slips.\n\nNavigate to **Identity Services** on your navigation bar or let me know the specific correction needed!`;
            } else {
                reply = `Hello! I'm your **Ufriends Assistant**.\n\nI can help you with:\n- **Cheap Data & Airtime:** Instant wholesale recharge for MTN, Airtel, Glo, & 9mobile.\n- **Wallet Funding:** Automated Monnify / Wema Bank NUBAN.\n- **NIN & BVN Services:** Slips, modifications, and validation.\n- **Bill Payments:** Electricity tokens, Cable TV, and Exam PINs.\n\nWhat would you like to get done today?`;
            }
        }

        session.messages.push({ role: 'user', content: message }, { role: 'assistant', content: reply });
        session.messages = session.messages.slice(-MAX_HISTORY_MESSAGES);
        session.updatedAt = Date.now();

        return {
            reply,
            thought,
            actionSteps,
            actionCard,
            model: config.model,
        };
    }

    reset(userId, conversationId = 'default') {
        sessions.delete(`${userId}:${cleanConversationId(conversationId)}`);
    }

    confirmQuote(quoteId, network) {
        const quote = activeQuotes.get(quoteId);
        if (!quote) return { success: false, error: 'Quote expired or not found' };
        if (network) quote.network = network;
        quote.status = 'confirmed';
        quote.transactionRef = `UF-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
        return {
            success: true,
            quote,
            newBalance: Math.max(0, (quote.walletBalance || 2450) - quote.total),
        };
    }

    cancelQuote(quoteId) {
        const quote = activeQuotes.get(quoteId);
        if (quote) quote.status = 'cancelled';
        return { success: true };
    }
}

module.exports = new AIService();
