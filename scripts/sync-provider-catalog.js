const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../api/.env') });

const prisma = require('../prisma/client');
const { runSmartRouting } = require('../api/services/smartRouting.service');

runSmartRouting()
    .catch(error => {
        console.error('Provider catalog sync failed:', error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
