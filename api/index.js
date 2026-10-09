const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
if (!process.env.NODE_ENV && process.env.API_NODE_ENV) {
    process.env.NODE_ENV = process.env.API_NODE_ENV;
}

const app = require('./app');

if (require.main === module) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`API server listening on port ${port}`);
    });
}

module.exports = app;
