/**
 * Plan Name Formatter & Sanitizer
 * Cleans messy brackets, double parentheses, and provider noise from data/cable/service names.
 * Unambiguously tags social media / app-restricted plans (TikTok, Instagram, WhatsApp, etc.).
 */

function isSocialPlan(name = '') {
    return /social|tiktok|whatsapp|facebook|insta|instagram|youtube|snapchat|binge|streaming/i.test(name);
}

function getSocialTag(name = '') {
    if (!name) return '';
    const isTikTokOnly = /tiktok\s*only/i.test(name);
    const isTikTok = /tiktok/i.test(name);
    const isInsta = /insta|instagram/i.test(name);
    const isYouTube = /youtube/i.test(name);
    const isWhatsApp = /whatsapp/i.test(name);
    const isFacebook = /facebook/i.test(name);

    if (isTikTokOnly) return '[TikTok Only]';
    if (isTikTok && isInsta && isYouTube) return '[Insta/TikTok/YouTube]';
    if (isTikTok) return '[TikTok Only]';
    if (isWhatsApp) return '[WhatsApp Only]';
    if (isFacebook) return '[Facebook Only]';
    if (isSocialPlan(name)) return '[Social Only]';
    return '';
}

function cleanPlanName(rawName) {
    if (!rawName) return '';
    let str = String(rawName).trim();

    // 1. Social tag
    const socialTag = getSocialTag(str);

    // 2. Bonus perks detection
    const perks = [];
    const airtimeCashMatch = str.match(/(?:\+|plus)\s*N?(\d+)\s*(?:free\s*)?airtime/i) || str.match(/\(\s*\(?\d+\)?\s*\+\s*N?(\d+)\s*(?:free\s*)?airtime/i);
    if (airtimeCashMatch) {
        perks.push(`+ ₦${airtimeCashMatch[1]} Airtime`);
    }
    const airtimeMinsMatch = str.match(/(?:\+|plus)\s*(\d+)\s*(?:mins|minutes)\s*(?:airtime|airtim)?/i);
    if (airtimeMinsMatch && !airtimeCashMatch) {
        perks.push(`+ ${airtimeMinsMatch[1]} Mins Airtime`);
    }
    const nightMatch = str.match(/(?:\+|plus)\s*(\d+(?:\.\d+)?(?:gb|mb))\s*night/i);
    if (nightMatch) {
        perks.push(`+ ${nightMatch[1].toUpperCase()} Night`);
    }

    // 3. Extract validity / duration
    let validity = '';
    const checkStr = str.replace(/\b(corporate|sme|cg)\s*2\b/gi, '$1_TWO');
    if (/\b30\s*days?\b|30day|\b1\s*month\b|\bmonthly\b|30\[days\]|\[30days\]|\(\(\s*30\s*[\)\+]|\(\s*30\s*days?\s*\)/i.test(checkStr)) validity = '30 Days';
    else if (/\b14\s*days?\b|14day/i.test(checkStr)) validity = '14 Days';
    else if (/\b7\s*days?\b|7day|\bweekly\b|\(\(\s*7\s*[\)\+]|\(\s*7\s*days?\s*\)/i.test(checkStr)) validity = '7 Days';
    else if (/\b3\s*days?\b|3day|\(\(\s*3\s*[\)\+]|\(\s*3\s*days?\s*\)/i.test(checkStr)) validity = '3 Days';
    else if (/\b2\s*days?\b|2day|\(\(\s*2\s*[\)\+]|\(\s*2\s*days?\s*\)/i.test(checkStr)) validity = '2 Days';
    else if (/\b1\s*day\b|1day|\b24hrs\b|\(\(\s*1\s*[\)\+]|\(\s*1\s*day\s*\)/i.test(checkStr)) validity = '1 Day';

    // 4. Network detection
    const netMatch = str.match(/^(MTN|AIRTEL|GLO|9MOBILE|SMILE)/i);
    const network = netMatch ? netMatch[1].toUpperCase() : '';

    // 5. Data size extraction & normalization
    const sizeMatch = str.match(/(\d+(?:\.\d+)?)\s*(MB|GB|TB)/i);
    let sizeStr = '';
    if (sizeMatch) {
        let val = parseFloat(sizeMatch[1]);
        let unit = sizeMatch[2].toUpperCase();
        if (unit === 'MB' && val >= 1000) {
            val = val / 1000;
            unit = 'GB';
        }
        sizeStr = `${val % 1 === 0 ? val.toFixed(0) : val}${unit}`;
    }

    // 6. Plan Category / Type
    let planType = '';
    if (/corporate gifting 2|cg 2|corporate 2/i.test(str)) planType = 'Corporate 2';
    else if (/corporate/i.test(str)) planType = 'Corporate';
    else if (/sme2/i.test(str)) planType = 'SME2';
    else if (/sme/i.test(str)) planType = 'SME';
    else if (/data coupons?|coupon/i.test(str)) planType = 'Data Coupon';
    else if (/data awoof|awoof/i.test(str)) planType = 'Data Awoof';
    else if (/data share|share/i.test(str)) planType = 'Data Share';
    else if (/gifting/i.test(str)) planType = 'Gifting';

    // Default validity if known
    if (!validity) {
        if (planType.includes('Corporate') || planType.includes('SME')) validity = '30 Days';
        else if (/monthly|month/i.test(str)) validity = '30 Days';
        else if (/weekly|week/i.test(str)) validity = '7 Days';
        else if (/daily|day/i.test(str)) validity = '1 Day';
    }

    // Build parts cleanly
    const parts = [];
    if (network) parts.push(network);
    if (sizeStr) parts.push(sizeStr);
    if (planType) parts.push(planType);
    if (validity) parts.push(`- ${validity}`);
    if (perks.length > 0) parts.push(perks.join(' '));
    if (socialTag) parts.push(socialTag);

    // Fallback if parsing didn't find network or size
    if (parts.length === 0) {
        return str
            .replace(/\s*\(\(\s*\d+\s*\)\)/g, '')
            .replace(/\s*\(\s*\d+\s*\)/g, '')
            .replace(/\s*Days?\s*\)/ig, '')
            .replace(/\{[^}]*\}/g, '')
            .replace(/\[[^\]]*\]/g, '')
            .replace(/\(\s*\)/g, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    return parts.join(' ').replace(/\s{2,}/g, ' ').trim();
}

module.exports = {
    isSocialPlan,
    getSocialTag,
    cleanPlanName
};
