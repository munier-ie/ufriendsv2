require('dotenv').config();
const prisma = require('../prisma/client');
const { installSecurityTriggers } = require('../api/services/securityTriggers.service');

installSecurityTriggers(prisma)
    .then(() => console.log('Security trigger repair committed. Existing balances and audit history were preserved.'))
    .catch(error => {
        console.error('Security trigger repair failed; changes were rolled back:', error.message);
        console.error('Use the database owner/deployment role. Required security tables and columns must already exist.');
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
