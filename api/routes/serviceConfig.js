const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const adminAuth = require('../middleware/adminAuth');
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const path = require('path');

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// ============================================
// DATA PLAN MANAGEMENT
// ============================================

// GET /api/admin/services/data-plans - List all data plans
router.get('/data-plans', adminAuth, async (req, res) => {
    try {
        const { network } = req.query;
        const where = network ? { network } : {};

        const plans = await prisma.dataPlan.findMany({
            where,
            orderBy: [
                { network: 'asc' },
                { dataName: 'asc' }
            ]
        });

        res.json({ success: true, plans });
    } catch (error) {
        console.error('Get data plans error:', error);
        res.status(500).json({ error: 'Failed to fetch data plans' });
    }
});

// POST /api/admin/services/data-plans - Add new data plan
router.post('/data-plans', adminAuth, async (req, res) => {
    try {
        const { network, dataName, dataType, planId, duration, userPrice, agentPrice, vendorPrice, apiPrice, referralCommission } = req.body;

        const plan = await prisma.dataPlan.create({
            data: {
                network,
                dataName,
                dataType,
                planId,
                duration,
                userPrice: parseFloat(userPrice),
                agentPrice: parseFloat(agentPrice),
                vendorPrice: parseFloat(vendorPrice),
                apiPrice: parseFloat(apiPrice),
                referralCommission: parseFloat(referralCommission || 0),
                updatedAt: new Date()
            }
        });

        res.json({ success: true, message: 'Data plan created successfully', plan });
    } catch (error) {
        console.error('Create data plan error:', error);
        res.status(500).json({ error: 'Failed to create data plan' });
    }
});

// PUT /api/admin/services/data-plans/:id - Update data plan
router.put('/data-plans/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { network, dataName, dataType, planId, duration, userPrice, agentPrice, vendorPrice, apiPrice, active, referralCommission } = req.body;

        const plan = await prisma.dataPlan.update({
            where: { id: parseInt(id) },
            data: {
                network,
                dataName,
                dataType,
                planId,
                duration,
                userPrice: parseFloat(userPrice),
                agentPrice: parseFloat(agentPrice),
                vendorPrice: parseFloat(vendorPrice),
                apiPrice: parseFloat(apiPrice),
                active,
                referralCommission: parseFloat(referralCommission || 0),
                updatedAt: new Date()
            }
        });

        res.json({ success: true, message: 'Data plan updated successfully', plan });
    } catch (error) {
        console.error('Update data plan error:', error);
        res.status(500).json({ error: 'Failed to update data plan' });
    }
});

// DELETE /api/admin/services/data-plans/:id - Delete data plan
router.delete('/data-plans/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.dataPlan.delete({
            where: { id: parseInt(id) }
        });

        res.json({ success: true, message: 'Data plan deleted successfully' });
    } catch (error) {
        console.error('Delete data plan error:', error);
        res.status(500).json({ error: 'Failed to delete data plan' });
    }
});

// ============================================
// CABLE PLAN MANAGEMENT
// ============================================

// GET /api/admin/services/cable-plans - List all cable plans
router.get('/cable-plans', adminAuth, async (req, res) => {
    try {
        const { provider } = req.query;
        const where = { type: 'cable' };
        if (provider) where.provider = provider;

        const services = await prisma.service.findMany({
            where,
            orderBy: [{ provider: 'asc' }, { name: 'asc' }]
        });

        const plans = services.map(s => ({
            id: s.id,
            provider: s.provider,
            planName: s.name,
            planId: s.code,
            duration: 'Monthly',
            userPrice: s.price,
            agentPrice: s.agentPrice,
            vendorPrice: s.vendorPrice,
            apiPrice: s.apiPrice,
            apiProviderId: s.apiProviderId,
            referralCommission: s.referralCommission,
            active: s.active
        }));

        res.json({ success: true, plans });
    } catch (error) {
        console.error('Get cable plans error:', error);
        res.status(500).json({ error: 'Failed to fetch cable plans' });
    }
});

// POST /api/admin/services/cable-plans - Add new cable plan
router.post('/cable-plans', adminAuth, async (req, res) => {
    try {
        const { provider, planName, planId, duration, userPrice, agentPrice, vendorPrice, apiPrice, apiProviderId, referralCommission } = req.body;

        const plan = await prisma.service.create({
            data: {
                type: 'cable',
                provider,
                name: planName,
                code: planId,
                price: parseFloat(userPrice),
                agentPrice: parseFloat(agentPrice),
                vendorPrice: parseFloat(vendorPrice),
                apiPrice: parseFloat(apiPrice),
                apiProviderId: apiProviderId ? parseInt(apiProviderId) : null,
                active: true,
                referralCommission: parseFloat(referralCommission || 0),
                updatedAt: new Date()
            }
        });

        res.json({ success: true, message: 'Cable plan created successfully', plan });
    } catch (error) {
        console.error('Create cable plan error:', error);
        res.status(500).json({ error: 'Failed to create cable plan' });
    }
});

// PUT /api/admin/services/cable-plans/:id - Update cable plan
router.put('/cable-plans/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { provider, planName, planId, duration, userPrice, agentPrice, vendorPrice, apiPrice, apiProviderId, active, referralCommission } = req.body;

        const plan = await prisma.service.update({
            where: { id: parseInt(id) },
            data: {
                provider,
                name: planName,
                code: planId,
                price: parseFloat(userPrice),
                agentPrice: parseFloat(agentPrice),
                vendorPrice: parseFloat(vendorPrice),
                apiPrice: parseFloat(apiPrice),
                apiProviderId: apiProviderId ? parseInt(apiProviderId) : null,
                active,
                referralCommission: parseFloat(referralCommission || 0),
                updatedAt: new Date()
            }
        });

        res.json({ success: true, message: 'Cable plan updated successfully', plan });
    } catch (error) {
        console.error('Update cable plan error:', error);
        res.status(500).json({ error: 'Failed to update cable plan' });
    }
});

// DELETE /api/admin/services/cable-plans/:id - Delete cable plan
router.delete('/cable-plans/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.service.delete({
            where: { id: parseInt(id) }
        });

        res.json({ success: true, message: 'Cable plan deleted successfully' });
    } catch (error) {
        console.error('Delete cable plan error:', error);
        res.status(500).json({ error: 'Failed to delete cable plan' });
    }
});

// ============================================
// ELECTRICITY PROVIDERS
// ============================================

// GET /api/admin/services/electricity - List all electricity providers
router.get('/electricity', adminAuth, async (req, res) => {
    try {
        const services = await prisma.service.findMany({
            where: { type: 'electricity' },
            orderBy: { name: 'asc' }
        });

        const providers = services.map(s => ({
            id: s.id,
            provider: s.name,
            charge: s.price,
            referralCommission: s.referralCommission,
            active: s.active
        }));

        res.json({ success: true, providers });
    } catch (error) {
        console.error('Get electricity providers error:', error);
        res.status(500).json({ error: 'Failed to fetch electricity providers' });
    }
});

// PUT /api/admin/services/electricity/:id - Update electricity provider
router.put('/electricity/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { charge, active, referralCommission } = req.body;

        const provider = await prisma.service.update({
            where: { id: parseInt(id) },
            data: {
                price: parseFloat(charge),
                active,
                referralCommission: parseFloat(referralCommission || 0),
                updatedAt: new Date()
            }
        });

        res.json({ success: true, message: 'Electricity provider updated successfully', provider });
    } catch (error) {
        console.error('Update electricity provider error:', error);
        res.status(500).json({ error: 'Failed to update electricity provider' });
    }
});

// POST /api/admin/services/electricity/ - Add new electricity provider
router.post('/electricity', adminAuth, async (req, res) => {
    try {
        const { provider, charge, active, referralCommission } = req.body;

        let safeProvider = provider.toLowerCase();
        if (safeProvider.includes('ikeja')) safeProvider = 'ikeja';
        else if (safeProvider.includes('eko')) safeProvider = 'eko';
        else if (safeProvider.includes('abuja')) safeProvider = 'abuja';
        else if (safeProvider.includes('kano')) safeProvider = 'kano';
        else if (safeProvider.includes('port harcourt') || safeProvider.includes('phed')) safeProvider = 'port harcourt';
        else if (safeProvider.includes('jos')) safeProvider = 'jos';
        else if (safeProvider.includes('ibadan')) safeProvider = 'ibadan';
        else if (safeProvider.includes('kaduna')) safeProvider = 'kaduna';

        const newProvider = await prisma.service.create({
            data: {
                type: 'electricity',
                provider: safeProvider,
                name: provider,
                code: safeProvider,
                price: parseFloat(charge) || 0,
                agentPrice: parseFloat(charge) || 0,
                vendorPrice: parseFloat(charge) || 0,
                apiPrice: 0,
                referralCommission: parseFloat(referralCommission || 0),
                active: active !== undefined ? active : true,
                updatedAt: new Date()
            }
        });

        res.json({ success: true, message: 'Electricity provider created successfully', provider: newProvider });
    } catch (error) {
        console.error('Create electricity provider error:', error);
        res.status(500).json({ error: 'Failed to create electricity provider' });
    }
});

// DELETE /api/admin/services/electricity/:id - Delete electricity provider
router.delete('/electricity/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.service.delete({ where: { id: parseInt(id) } });
        res.json({ success: true, message: 'Electricity provider deleted successfully' });
    } catch (error) {
        console.error('Delete electricity provider error:', error);
        res.status(500).json({ error: 'Failed to delete electricity provider' });
    }
});

// ============================================
// PIN STOCK MANAGEMENT
// ============================================

// GET /api/admin/services/pins/airtime-stock - Get airtime PIN stock
router.get('/pins/airtime-stock', adminAuth, async (req, res) => {
    try {
        const { network } = req.query;
        const where = network ? { network, used: false } : { used: false };

        const stock = await prisma.airtimePinStock.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        // Group by network and amount
        const summary = await prisma.$queryRaw`
            SELECT network, amount, COUNT(*) as total, 
                   SUM(CASE WHEN used = false THEN 1 ELSE 0 END) as available
            FROM airtime_pin_stocks
            GROUP BY network, amount
            ORDER BY network, amount
        `;

        res.json({ success: true, stock, summary });
    } catch (error) {
        console.error('Get airtime PIN stock error:', error);
        res.status(500).json({ error: 'Failed to fetch airtime PIN stock' });
    }
});

// GET /api/admin/services/pins/data-stock - Get data PIN stock
router.get('/pins/data-stock', adminAuth, async (req, res) => {
    try {
        const { network } = req.query;
        const where = network ? { network, used: false } : { used: false };

        const stock = await prisma.dataPinStock.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        // Group by network and data name
        const summary = await prisma.$queryRaw`
            SELECT network, "dataName", COUNT(*) as total,
                   SUM(CASE WHEN used = false THEN 1 ELSE 0 END) as available
            FROM data_pin_stocks
            GROUP BY network, "dataName"
            ORDER BY network, "dataName"
        `;

        res.json({ success: true, stock, summary });
    } catch (error) {
        console.error('Get data PIN stock error:', error);
        res.status(500).json({ error: 'Failed to fetch data PIN stock' });
    }
});

// POST /api/admin/services/pins/upload-airtime - Upload airtime PINs via CSV
router.post('/pins/upload-airtime', adminAuth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const pins = [];
        const filePath = req.file.path;

        // Parse CSV file
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (row) => {
                // Expected columns: network, amount, pin, serialNo
                pins.push({
                    network: row.network.toUpperCase(),
                    amount: parseFloat(row.amount),
                    pin: row.pin,
                    serialNo: row.serialNo || row.serial || ''
                });
            })
            .on('end', async () => {
                // Insert pins to database
                await prisma.airtimePinStock.createMany({
                    data: pins,
                    skipDuplicates: true
                });

                // Delete uploaded file
                fs.unlinkSync(filePath);

                res.json({
                    success: true,
                    message: `${pins.length} airtime PINs uploaded successfully`
                });
            })
            .on('error', (error) => {
                fs.unlinkSync(filePath);
                throw error;
            });
    } catch (error) {
        console.error('Upload airtime PINs error:', error);
        res.status(500).json({ error: 'Failed to upload airtime PINs' });
    }
});

// POST /api/admin/services/pins/upload-data - Upload data PINs via CSV
router.post('/pins/upload-data', adminAuth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const pins = [];
        const filePath = req.file.path;

        // Parse CSV file
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (row) => {
                // Expected columns: network, dataName, pin, serialNo
                pins.push({
                    network: row.network.toUpperCase(),
                    dataName: row.dataName,
                    pin: row.pin,
                    serialNo: row.serialNo || row.serial || ''
                });
            })
            .on('end', async () => {
                // Insert pins to database
                await prisma.dataPinStock.createMany({
                    data: pins,
                    skipDuplicates: true
                });

                // Delete uploaded file
                fs.unlinkSync(filePath);

                res.json({
                    success: true,
                    message: `${pins.length} data PINs uploaded successfully`
                });
            })
            .on('error', (error) => {
                fs.unlinkSync(filePath);
                throw error;
            });
    } catch (error) {
        console.error('Upload data PINs error:', error);
        res.status(500).json({ error: 'Failed to upload data PINs' });
    }
});

// DELETE /api/admin/services/pins/clear-used - Clear used PINs
router.delete('/pins/clear-used', adminAuth, async (req, res) => {
    try {
        const { type } = req.query; // 'airtime' or 'data'

        if (type === 'airtime') {
            const result = await prisma.airtimePinStock.deleteMany({
                where: { used: true }
            });
            res.json({ success: true, message: `${result.count} used airtime PINs cleared` });
        } else if (type === 'data') {
            const result = await prisma.dataPinStock.deleteMany({
                where: { used: true }
            });
            res.json({ success: true, message: `${result.count} used data PINs cleared` });
        } else {
            return res.status(400).json({ error: 'Type must be "airtime" or "data"' });
        }
    } catch (error) {
        console.error('Clear used PINs error:', error);
        res.status(500).json({ error: 'Failed to clear used PINs' });
    }
});

module.exports = router;
