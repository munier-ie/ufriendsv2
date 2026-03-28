const prisma = require('../../prisma/client');

class SettingsService {
    constructor() {
        this.cache = null;
        this.lastFetch = 0;
        this.TTL = 60000; // 1 minute cache
    }

    async getAllSettings() {
        const now = Date.now();
        if (this.cache && (now - this.lastFetch < this.TTL)) {
            return this.cache;
        }

        const dbSettings = await prisma.appSetting.findMany();
        const settings = {};

        dbSettings.forEach(s => {
            let value = s.value;
            try {
                if (value === 'true') value = true;
                else if (value === 'false') value = false;
                else if (!isNaN(value) && value.trim() !== '') value = parseFloat(value);
                else if (value.startsWith('{') || value.startsWith('[')) {
                    value = JSON.parse(value);
                }
            } catch (e) {}
            settings[s.key] = value;
        });

        this.cache = settings;
        this.lastFetch = now;
        return settings;
    }

    async getSetting(key, defaultValue = null) {
        const settings = await this.getAllSettings();
        return settings[key] !== undefined ? settings[key] : defaultValue;
    }

    // Direct helper for common checks
    async isMaintenanceMode() {
        return await this.getSetting('maintenanceMode', false);
    }
}

module.exports = new SettingsService();
