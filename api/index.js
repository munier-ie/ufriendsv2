const app = require('./app');

if (require.main === module) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`API server listening on port ${port}`);
    });
}

module.exports = app;
