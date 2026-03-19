const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const replacements = {
    'admin_stat_cache': 'AdminStatCache',
    'airtime_pin_stocks': 'AirtimePinStock',
    'airtime_to_cash_rates': 'AirtimeToCashRate',
    'airtime_to_cash_requests': 'AirtimeToCashRequest',
    'alpha_topup_orders': 'AlphaTopupOrder',
    'alpha_topup_rates': 'AlphaTopupRate',
    'api_wallets': 'ApiWallet',
    'blacklisted_numbers': 'BlacklistedNumber',
    'cable_plans': 'CablePlan',
    'cac_settings': 'CACSettings',
    'contact_messages': 'ContactMessage',
    'data_plans': 'DataPlan',
    'electricity_providers': 'ElectricityProvider',
    'exam_pins': 'ExamPin',
    'network_configurations': 'NetworkConfiguration',
    'site_configs': 'SiteConfig',
    'smile_plans': 'SmilePlan',
    'transaction_status_updates': 'TransactionStatusUpdate'
};

for (const [dbName, modelName] of Object.entries(replacements)) {
    // Replace model definition: model snake_case {
    const regex = new RegExp(`model ${dbName} {`, 'g');
    schema = schema.replace(regex, `model ${modelName} {\n  @@map("${dbName}")`);

    // Replace relations if any (e.g., snake_case relationName)
    // This is tricky but we'll try to find any exact references to dbName as a type
    const typeRegex = new RegExp(`(?<=:\\s+)${dbName}(?=\\s|\\?|\\[)`, 'g');
    schema = schema.replace(typeRegex, modelName);

    const arrayTypeRegex = new RegExp(` ${dbName}\\[\\]`, 'g');
    schema = schema.replace(arrayTypeRegex, ` ${modelName}[]`);

    const optionalTypeRegex = new RegExp(` ${dbName}\\?`, 'g');
    schema = schema.replace(optionalTypeRegex, ` ${modelName}?`);

    const exactTypeRegex = new RegExp(` ${dbName} `, 'g');
    schema = schema.replace(exactTypeRegex, ` ${modelName} `);
}

fs.writeFileSync(schemaPath, schema);
console.log('Schema updated successfully.');
