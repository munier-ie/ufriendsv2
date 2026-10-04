const wallet = require('./wallet.service');
const settings = require('./settings.service');

async function quote(service, user, input) {
    if (!service?.active || !['airtime', 'data', 'cable', 'electricity', 'exam', 'data_pin', 'recharge_card'].includes(service.type)) throw new Error('Service not available');
    const quantity = input.quantity === undefined ? 1 : input.quantity;
    const max = ['data_pin', 'recharge_card'].includes(service.type) ? 10 : 1;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > max) throw new Error(`Quantity must be an integer from 1 to ${max}`);
    const price = user.type === 3 ? service.vendorPrice ?? service.price : user.type === 2 ? service.agentPrice ?? service.price : service.price;
    if (!Number.isFinite(price) || price < 0) throw new Error('Invalid configured price');
    let charge;
    if (service.type === 'airtime') {
        const face = wallet.money(input.amount);
        const discounts = await settings.getSetting('airtimeDiscount', {});
        const discount = discounts[(service.provider || '').toLowerCase()];
        const rate = discount === undefined ? price : 100 - discount;
        if (!Number.isFinite(rate) || rate <= 0 || rate > 100) throw new Error('Invalid airtime pricing');
        charge = face * rate / 100;
    } else if (service.type === 'electricity') charge = wallet.money(input.amount) + price;
    else charge = price * quantity;
    return { amount: wallet.money(charge), quantity, unitPrice: price };
}
module.exports = { quote };
