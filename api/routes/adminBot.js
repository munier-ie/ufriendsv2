const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const { runSmartRouting, updateCronSchedule, getCronConfig } = require('../services/smartRouting.service');
const prisma = require('../../prisma/client');

/**
 * GET /api/admin/bot/stats
 * Get summary of the last bot run and general stats
 */
router.get('/stats', adminAuth, async (req, res) => {
    try {
        const lastSyncPlan = await prisma.dataPlan.findFirst({ orderBy: { updatedAt: 'desc' } });
        const lastSyncRouting = await prisma.providerRouting.findFirst({ orderBy: { updatedAt: 'desc' } });

        // Count all inactive bot-discovered plans across DataPlan + Service (cable/exam)
        const [dataPlanCount, serviceCount] = await Promise.all([
            prisma.dataPlan.count({ where: { active: false, apiProviderId: { not: null } } }),
            prisma.service.count({ where: { active: false, apiProviderId: { not: null }, type: { in: ['cable', 'exam'] } } })
        ]);

        const cronConfig = getCronConfig();

        res.json({
            success: true,
            stats: {
                lastSync: lastSyncRouting?.updatedAt || lastSyncPlan?.updatedAt || null,
                pendingDiscoveries: dataPlanCount + serviceCount,
                status: 'online',
                schedule: cronConfig
            }
        });
    } catch (error) {
        console.error('Bot stats error:', error);
        res.status(500).json({ error: 'Failed to fetch bot stats' });
    }
});

/**
 * POST /api/admin/bot/sync
 * Manually trigger the smart routing bot
 */
router.post('/sync', adminAuth, async (req, res) => {
    try {
        console.log(`[Admin] Manual Smart Routing Sync triggered by ${req.admin.username}`);
        await runSmartRouting();
        res.json({
            success: true,
            message: 'Smart Routing Bot completed successfully. Data, Cable, and Exam plans synced.'
        });
    } catch (error) {
        console.error('Manual Bot Sync failed:', error);
        res.status(500).json({ error: 'Bot sync failed during execution' });
    }
});

/**
 * GET /api/admin/bot/schedule
 * Get the current cron schedule configuration
 */
router.get('/schedule', adminAuth, (req, res) => {
    try {
        const config = getCronConfig();
        res.json({ success: true, schedule: config });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get schedule' });
    }
});

/**
 * PUT /api/admin/bot/schedule
 * Update the cron schedule
 * Body: { mode: 'hourly'|'every_n_hours'|'daily'|'custom', value?: number, customCron?: string, hour?: number }
 */
router.put('/schedule', adminAuth, (req, res) => {
    try {
        const { mode, value, customCron, hour } = req.body;
        let expression;

        switch (mode) {
            case 'hourly':
                expression = '0 * * * *';
                break;
            case 'every_n_hours':
                if (!value || value < 1 || value > 23) return res.status(400).json({ error: 'value must be between 1 and 23' });
                expression = `0 */${value} * * *`;
                break;
            case 'daily':
                expression = `0 ${hour ?? 0} * * *`;
                break;
            case 'custom':
                if (!customCron) return res.status(400).json({ error: 'customCron expression is required' });
                expression = customCron;
                break;
            default:
                return res.status(400).json({ error: 'Invalid mode. Use: hourly, every_n_hours, daily, custom' });
        }

        const result = updateCronSchedule(expression, { mode, value, hour, customCron });
        if (!result.success) return res.status(400).json({ error: result.error });

        console.log(`[Admin] Bot schedule updated by ${req.admin.username}: ${expression}`);
        res.json({ success: true, message: `Bot schedule updated to: ${expression}`, expression });
    } catch (error) {
        console.error('Update schedule error:', error);
        res.status(500).json({ error: 'Failed to update schedule' });
    }
});

/**
 * GET /api/admin/bot/discovered-plans
 * Returns ALL inactive bot-discovered plans across Data, Cable, and Exam types.
 * Query: ?type=data|cable|exam|all, ?page=1, ?limit=50
 */
router.get('/discovered-plans', adminAuth, async (req, res) => {
    try {
        const { type = 'all', page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const results = { data: [], cable: [], exam: [] };

        // --- DATA PLANS ---
        if (type === 'all' || type === 'data') {
            const where = { active: false, apiProviderId: { not: null } };
            const plans = await prisma.dataPlan.findMany({
                where,
                include: { apiProvider: { select: { name: true } } },
                orderBy: [{ network: 'asc' }, { dataName: 'asc' }],
                ...(type === 'data' ? { skip, take } : {})
            });
            results.data = plans.map(p => ({
                ...p,
                _type: 'data',
                displayName: `${p.network} ${p.dataName} (${p.dataType})`,
                displayCode: p.planId,
                displayPrice: p.userPrice
            }));
        }

        // --- CABLE & EXAM from Service table ---
        if (type === 'all' || type === 'cable') {
            const where = { active: false, apiProviderId: { not: null }, type: 'cable' };
            const plans = await prisma.service.findMany({
                where,
                include: { apiProvider: { select: { name: true } } },
                orderBy: [{ provider: 'asc' }, { name: 'asc' }],
                ...(type === 'cable' ? { skip, take } : {})
            });
            results.cable = plans.map(p => ({
                ...p,
                _type: 'cable',
                displayName: `${(p.provider || '').toUpperCase()} – ${p.name}`,
                displayCode: p.code,
                displayPrice: p.price
            }));
        }

        if (type === 'all' || type === 'exam') {
            const where = { active: false, apiProviderId: { not: null }, type: 'exam' };
            const plans = await prisma.service.findMany({
                where,
                include: { apiProvider: { select: { name: true } } },
                orderBy: [{ provider: 'asc' }, { name: 'asc' }],
                ...(type === 'exam' ? { skip, take } : {})
            });
            results.exam = plans.map(p => ({
                ...p,
                _type: 'exam',
                displayName: `${p.provider} – ${p.name}`,
                displayCode: p.code,
                displayPrice: p.price
            }));
        }

        const allPlans = [...results.data, ...results.cable, ...results.exam];
        const total = allPlans.length;

        res.json({
            success: true,
            plans: type === 'all' ? allPlans : (results[type] || []),
            total,
            counts: {
                data: results.data.length,
                cable: results.cable.length,
                exam: results.exam.length,
                total
            },
            pagination: { page: parseInt(page), pages: Math.ceil(total / take), total }
        });
    } catch (error) {
        console.error('Discovered plans error:', error);
        res.status(500).json({ error: 'Failed to fetch discovered plans' });
    }
});

/**
 * PUT /api/admin/bot/discovered-plans/:id/activate
 * Activate a single discovered plan. Works with both DataPlan (data) and Service (cable/exam).
 * Query: ?serviceType=data|cable|exam
 */
router.put('/discovered-plans/:id/activate', adminAuth, async (req, res) => {
    try {
        const planId = parseInt(req.params.id);
        const serviceType = req.query.serviceType || req.body.serviceType || 'data';

        if (serviceType === 'data') {
            // Activate from DataPlan table
            const plan = await prisma.dataPlan.findUnique({ where: { id: planId } });
            if (!plan) return res.status(404).json({ error: 'Data plan not found' });

            await prisma.dataPlan.update({ where: { id: planId }, data: { active: true } });

            // Also activate corresponding Service record
            await prisma.service.updateMany({
                where: { type: 'data', code: plan.planId, apiProviderId: plan.apiProviderId, active: false },
                data: { active: true }
            });

            return res.json({
                success: true,
                message: `Data plan "${plan.network} ${plan.dataName} (${plan.dataType})" activated`
            });
        } else {
            // cable or exam — activate directly in Service table
            const service = await prisma.service.findUnique({ where: { id: planId } });
            if (!service) return res.status(404).json({ error: 'Service plan not found' });

            await prisma.service.update({ where: { id: planId }, data: { active: true } });

            return res.json({
                success: true,
                message: `${serviceType === 'cable' ? 'Cable TV' : 'Exam'} plan "${service.name}" activated`
            });
        }
    } catch (error) {
        console.error('Activate plan error:', error);
        res.status(500).json({ error: 'Failed to activate plan' });
    }
});

/**
 * PUT /api/admin/bot/discovered-plans/activate-all
 * Activate ALL inactive plans across all types
 * Body: { type?: 'data'|'cable'|'exam'|'all' }
 */
router.put('/discovered-plans/activate-all', adminAuth, async (req, res) => {
    try {
        const type = req.body.type || 'all';
        let count = 0;

        if (type === 'all' || type === 'data') {
            const inactivePlans = await prisma.dataPlan.findMany({
                where: { active: false, apiProviderId: { not: null } }
            });
            const result = await prisma.dataPlan.updateMany({
                where: { active: false, apiProviderId: { not: null } },
                data: { active: true }
            });
            count += result.count;
            for (const plan of inactivePlans) {
                await prisma.service.updateMany({
                    where: { type: 'data', code: plan.planId, apiProviderId: plan.apiProviderId, active: false },
                    data: { active: true }
                });
            }
        }

        if (type === 'all' || type === 'cable') {
            const result = await prisma.service.updateMany({
                where: { active: false, apiProviderId: { not: null }, type: 'cable' },
                data: { active: true }
            });
            count += result.count;
        }

        if (type === 'all' || type === 'exam') {
            const result = await prisma.service.updateMany({
                where: { active: false, apiProviderId: { not: null }, type: 'exam' },
                data: { active: true }
            });
            count += result.count;
        }

        res.json({ success: true, message: `${count} plan(s) activated successfully`, count });
    } catch (error) {
        console.error('Activate all plans error:', error);
        res.status(500).json({ error: 'Failed to activate plans' });
    }
});

/**
 * DELETE /api/admin/bot/discovered-plans/:id
 * Dismiss/delete a single discovered plan
 * Query: ?serviceType=data|cable|exam
 */
router.delete('/discovered-plans/:id', adminAuth, async (req, res) => {
    try {
        const planId = parseInt(req.params.id);
        const serviceType = req.query.serviceType || 'data';

        if (serviceType === 'data') {
            await prisma.dataPlan.delete({ where: { id: planId } });
        } else {
            await prisma.service.delete({ where: { id: planId } });
        }

        res.json({ success: true, message: 'Plan dismissed successfully' });
    } catch (error) {
        console.error('Delete plan error:', error);
        res.status(500).json({ error: 'Failed to delete plan' });
    }
});

module.exports = router;
