const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const adminAuth = require('../middleware/adminAuth');

// All admin routes require admin authentication

// GET /api/admin/stats - Enhanced with user type breakdown
router.get('/stats', adminAuth, async (req, res) => {
    try {
        // Get today's date range for daily visits
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [
            userWallets,
            agentWallets,
            vendorWallets,
            referralWallets,
            totalTransactions,
            totalProfit,
            dailyVisits,
            activeAlphaRequests,
            unreadMessages,
            recentTransactions,
            apiWallets
        ] = await Promise.all([
            // User wallet totals (type = 1)
            prisma.user.aggregate({
                where: { type: 1 },
                _sum: { wallet: true },
                _count: true
            }),
            // Agent wallet totals (type = 2)
            prisma.user.aggregate({
                where: { type: 2 },
                _sum: { wallet: true },
                _count: true
            }),
            // Vendor wallet totals (type = 3)
            prisma.user.aggregate({
                where: { type: 3 },
                _sum: { wallet: true },
                _count: true
            }),
            // Referral wallet totals (type = 4)
            prisma.user.aggregate({
                where: { type: 4 },
                _sum: { wallet: true },
                _count: true
            }),
            // Total transactions
            prisma.transaction.count(),
            // Total profit from successful transactions
            prisma.transaction.aggregate({
                where: { status: 0 },
                _sum: { profit: true }
            }),
            // Daily visits - users with lastVisit today
            prisma.user.count({
                where: {
                    lastVisit: { gte: todayStart }
                }
            }),
            // Active Alpha Requests (Status 1 = Pending usually)
            prisma.alphaTopupOrder.count({
                where: { status: 1 }
            }).catch(() => 0), // Catch in case table doesn't exist yet
            // Unread Messages (Support tickets or messages)
            prisma.contactMessage.count({
                where: { status: 0 } // Typically 0 is unread/pending in ContactMessage
            }).catch(() => 0), // Catch if not exists
            // Recent Transactions (Last 10)
            prisma.transaction.findMany({
                take: 10,
                orderBy: { date: 'desc' },
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                            type: true
                        }
                    }
                }
            }),
            // API Wallets breakdown
            prisma.apiWallet.findMany({
                include: {
                    apiProvider: {
                        select: { name: true }
                    }
                }
            })
        ]);

        res.json({
            wallets: {
                user: userWallets._sum.wallet || 0,
                agent: agentWallets._sum.wallet || 0,
                vendor: vendorWallets._sum.wallet || 0,
                referral: referralWallets._sum.wallet || 0,
                total: (userWallets._sum.wallet || 0) +
                    (agentWallets._sum.wallet || 0) +
                    (vendorWallets._sum.wallet || 0) +
                    (referralWallets._sum.wallet || 0)
            },
            users: {
                subscribers: userWallets._count || 0,
                agents: agentWallets._count || 0,
                vendors: vendorWallets._count || 0,
                referrals: referralWallets._count || 0,
                total: (userWallets._count || 0) +
                    (agentWallets._count || 0) +
                    (vendorWallets._count || 0) +
                    (referralWallets._count || 0)
            },
            transactions: {
                total: totalTransactions,
                profit: totalProfit._sum.profit || 0,
                recent: recentTransactions
            },
            dailyVisits,
            activity: {
                activeAlphaRequests: activeAlphaRequests || 0,
                unreadMessages: unreadMessages || 0
            },
            apiWallets: apiWallets.map(w => ({
                provider: w.apiProvider.name,
                balance: w.balance,
                lowBalanceAlert: w.lowBalanceAlert
            }))
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
});

// GET /api/admin/users
router.get('/users', adminAuth, async (req, res) => {
    try {
        const { limit = 50, offset = 0, search } = req.query;
        const where = {};

        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    wallet: true,
                    regStatus: true,
                    type: true,
                    createdAt: true
                },
                take: parseInt(limit),
                skip: parseInt(offset),
                orderBy: { createdAt: 'desc' }
            }),
            prisma.user.count({ where })
        ]);

        res.json({ users, total });
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// POST /api/admin/users - Manually create a user
router.post('/users', adminAuth, async (req, res) => {
    try {
        const { firstName, lastName, email, phone, password, state, type } = req.body;
        const bcrypt = require('bcryptjs');

        if (!firstName || !lastName || !email || !phone || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if user exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { phone }
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'User with this email or phone already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                firstName,
                lastName,
                email,
                phone,
                state: state || null,
                password: hashedPassword,
                type: type ? parseInt(type) : 1, // Default to subscriber
                wallet: 0,
                regStatus: 0 // Active
            }
        });

        // Log the action
        await prisma.userAction.create({
            data: {
                userId: newUser.id,
                action: 'USER_CREATED_BY_ADMIN',
                details: JSON.stringify({ createdBy: req.admin.username }),
                adminId: req.admin.id
            }
        });

        const { password: _, ...safeUser } = newUser;

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: safeUser
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// POST /api/admin/users/:id/fund
router.post('/users/:id/fund', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, description } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const newBalance = user.wallet + parseFloat(amount);

        // Update user wallet and create transaction
        const [updatedUser, transaction] = await prisma.$transaction([
            prisma.user.update({
                where: { id: parseInt(id) },
                data: { wallet: newBalance }
            }),
            prisma.transaction.create({
                data: {
                    reference: `ADMIN-FUND-${Date.now()}`,
                    serviceName: 'Wallet Funding',
                    description: description || 'Admin wallet funding',
                    amount: parseFloat(amount),
                    status: 0, // Success
                    oldBalance: user.wallet,
                    newBalance: newBalance,
                    userId: parseInt(id),
                    type: 'funding'
                }
            })
        ]);

        res.json({
            success: true,
            message: 'User wallet funded successfully',
            user: {
                id: updatedUser.id,
                wallet: updatedUser.wallet
            },
            transaction
        });
    } catch (error) {
        console.error('Fund user error:', error);
        res.status(500).json({ error: 'Failed to fund user wallet' });
    }
});

// POST /api/admin/users/:id/debit
router.post('/users/:id/debit', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, description } = req.body;

        if (!amount || parseFloat(amount) <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const debitAmount = parseFloat(amount);
        if (user.wallet < debitAmount) {
            return res.status(400).json({ error: `Insufficient wallet balance. User has ₦${user.wallet.toFixed(2)}` });
        }

        const newBalance = user.wallet - debitAmount;

        const [updatedUser, transaction] = await prisma.$transaction([
            prisma.user.update({
                where: { id: parseInt(id) },
                data: { wallet: newBalance }
            }),
            prisma.transaction.create({
                data: {
                    reference: `ADMIN-DEBIT-${Date.now()}`,
                    serviceName: 'Admin Debit',
                    description: description || 'Admin wallet debit',
                    amount: -debitAmount,
                    status: 0,
                    oldBalance: user.wallet,
                    newBalance: newBalance,
                    userId: parseInt(id),
                    type: 'debit'
                }
            })
        ]);

        // Log the action
        await prisma.userAction.create({
            data: {
                userId: parseInt(id),
                action: 'WALLET_DEBITED',
                details: JSON.stringify({ amount: debitAmount, description, adminName: req.admin.name }),
                adminId: req.admin.id
            }
        });

        res.json({
            success: true,
            message: `Debited ₦${debitAmount.toLocaleString()} from user wallet successfully`,
            user: {
                id: updatedUser.id,
                wallet: updatedUser.wallet
            },
            transaction
        });
    } catch (error) {
        console.error('Debit user error:', error);
        res.status(500).json({ error: 'Failed to debit user wallet' });
    }
});



// PUT /api/admin/users/:id/status
router.put('/users/:id/status', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { regStatus } = req.body;

        if (regStatus === undefined) {
            return res.status(400).json({ error: 'Registration status is required' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { regStatus: parseInt(regStatus) },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                regStatus: true
            }
        });

        res.json({
            success: true,
            message: `User ${regStatus === 1 ? 'blocked' : 'unblocked'} successfully`,
            user: updatedUser
        });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'User not found' });
        }
        console.error('Update user status error:', error);
        res.status(500).json({ error: 'Failed to update user status' });
    }
});

// PUT /api/admin/users/:id/type - Change user type
router.put('/users/:id/type', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.body;

        // Validate type: 1=User, 2=Agent, 3=Vendor, 4=Referral
        if (![1, 2, 3, 4].includes(type)) {
            return res.status(400).json({ error: 'Invalid user type. Must be 1, 2, 3, or 4' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { type }
        });

        // Log the action
        await prisma.userAction.create({
            data: {
                userId: parseInt(id),
                action: 'TYPE_CHANGE',
                details: JSON.stringify({ newType: type }),
                adminId: req.admin.id
            }
        });

        const typeNames = { 1: 'Subscriber', 2: 'Agent', 3: 'Vendor', 4: 'Referral' };
        res.json({
            success: true,
            message: `User type changed to ${typeNames[type]}`,
            user: updatedUser
        });
    } catch (error) {
        console.error('Change user type error:', error);
        res.status(500).json({ error: 'Failed to change user type' });
    }
});

// POST /api/admin/users/:id/reset-api-key - Reset user's API key
router.post('/users/:id/reset-api-key', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const crypto = require('crypto');
        const newApiKey = crypto.randomUUID();

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { apiKey: newApiKey }
        });

        // Log the action
        await prisma.userAction.create({
            data: {
                userId: parseInt(id),
                action: 'API_RESET',
                details: 'API key reset by admin',
                adminId: req.admin.id
            }
        });

        res.json({
            success: true,
            message: 'API key reset successfully',
            apiKey: newApiKey  // Return the new key (one-time visibility)
        });
    } catch (error) {
        console.error('Reset API key error:', error);
        res.status(500).json({ error: 'Failed to reset API key' });
    }
});

// DELETE /api/admin/users/:id - Delete user account
router.delete('/users/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if super admin (role === 1)
        if (req.admin.role !== 1) {
            return res.status(403).json({ error: 'Only super admins can delete user accounts' });
        }

        // Soft delete by setting regStatus = 2
        const deletedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { regStatus: 2 }
        });

        // Log the action
        await prisma.userAction.create({
            data: {
                userId: parseInt(id),
                action: 'DELETED',
                details: JSON.stringify({ deletedBy: req.admin.name }),
                adminId: req.admin.id
            }
        });

        res.json({
            success: true,
            message: 'User account deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user account' });
    }
});

// PUT /api/admin/users/:id/password - Reset user password
router.put('/users/:id/password', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        const bcrypt = require('bcryptjs');

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { password: hashedPassword }
        });

        // Log the action
        await prisma.userAction.create({
            data: {
                userId: parseInt(id),
                action: 'PASSWORD_RESET',
                details: 'Password reset by admin',
                adminId: req.admin.id
            }
        });

        res.json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// GET /api/admin/users/:id/transactions - View user's transaction history
router.get('/users/:id/transactions', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 50 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where: { userId: parseInt(id) },
                orderBy: { date: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.transaction.count({
                where: { userId: parseInt(id) }
            })
        ]);

        res.json({
            success: true,
            transactions,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get user transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch user transactions' });
    }
});

// GET /api/admin/users/:id/actions - View user action history
router.get('/users/:id/actions', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const actions = await prisma.userAction.findMany({
            where: { userId: parseInt(id) },
            include: {
                adminUser: {
                    select: {
                        id: true,
                        name: true,
                        username: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, actions });
    } catch (error) {
        console.error('Get user actions error:', error);
        res.status(500).json({ error: 'Failed to fetch user actions' });
    }
});

// GET /api/admin/transactions
router.get('/transactions', adminAuth, async (req, res) => {
    try {
        const { limit = 50, offset = 0, search, status } = req.query;
        const where = {};

        if (status !== undefined && status !== '') {
            where.status = parseInt(status);
        }

        if (search) {
            where.OR = [
                { reference: { contains: search } },
                { serviceName: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true
                        }
                    }
                },
                take: parseInt(limit),
                skip: parseInt(offset),
                orderBy: { date: 'desc' }
            }),
            prisma.transaction.count({ where })
        ]);

        res.json({ transactions, total });
    } catch (error) {
        console.error('Admin transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// API Provider Management
router.get('/providers', adminAuth, async (req, res) => {
    try {
        const providers = await prisma.apiProvider.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(providers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch providers' });
    }
});

router.post('/providers', adminAuth, async (req, res) => {
    try {
        const { name, baseUrl, apiKey, apiToken, username, active } = req.body;
        const provider = await prisma.apiProvider.create({
            data: { name, baseUrl, apiKey, apiToken, username, active }
        });
        res.status(201).json(provider);
    } catch (error) {
        res.status(400).json({ error: 'Failed to create provider' });
    }
});

router.put('/providers/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, baseUrl, apiKey, apiToken, username, active } = req.body;
        const provider = await prisma.apiProvider.update({
            where: { id: parseInt(id) },
            data: { name, baseUrl, apiKey, apiToken, username, active }
        });
        res.json(provider);
    } catch (error) {
        res.status(400).json({ error: 'Failed to update provider' });
    }
});

// Service Management (Enhanced)
router.get('/services', adminAuth, async (req, res) => {
    try {
        const services = await prisma.service.findMany({
            include: { apiProvider: true },
            orderBy: { type: 'asc' }
        });
        res.json(services);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch services' });
    }
});

router.post('/services', adminAuth, async (req, res) => {
    try {
        const { type, name, code, price, agentPrice, vendorPrice, apiPrice, apiProviderId, active } = req.body;

        if (!type || !name || price === undefined) {
            return res.status(400).json({ error: 'Type, name, and price are required' });
        }

        const service = await prisma.service.create({
            data: {
                type,
                name,
                code,
                provider: type, // Using type as default provider for backward compatibility
                price: parseFloat(price),
                agentPrice: agentPrice !== undefined ? parseFloat(agentPrice) : null,
                vendorPrice: vendorPrice !== undefined ? parseFloat(vendorPrice) : null,
                apiPrice: apiPrice !== undefined ? parseFloat(apiPrice) : null,
                apiProviderId: apiProviderId ? parseInt(apiProviderId) : null,
                active: active !== undefined ? active : true
            }
        });

        res.status(201).json(service);
    } catch (error) {
        console.error('Failed to create service:', error);
        res.status(500).json({ error: 'Failed to create service' });
    }
});

router.put('/services/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            code,
            price,
            agentPrice,
            vendorPrice,
            apiPrice,
            active,
            apiProviderId
        } = req.body;

        const service = await prisma.service.update({
            where: { id: parseInt(id) },
            data: {
                name,
                code,
                price: parseFloat(price),
                agentPrice: agentPrice ? parseFloat(agentPrice) : null,
                vendorPrice: vendorPrice ? parseFloat(vendorPrice) : null,
                apiPrice: apiPrice ? parseFloat(apiPrice) : null,
                active,
                apiProviderId: apiProviderId ? parseInt(apiProviderId) : null
            }
        });
        res.json(service);
    } catch (error) {
        console.error('Update service error:', error);
        res.status(400).json({ error: 'Failed to update service' });
    }
});

// Sales Reporting (Advanced)
router.get('/reports/sales', adminAuth, async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const where = { status: 0 }; // Success

        if (dateFrom && dateTo) {
            where.date = {
                gte: new Date(dateFrom),
                lte: new Date(dateTo)
            };
        }

        // Top users by spending
        const topUsers = await prisma.transaction.groupBy({
            by: ['userId'],
            where,
            _sum: { amount: true },
            orderBy: { _sum: { amount: 'desc' } },
            take: 10
        });

        // Resolve user names
        const users = await prisma.user.findMany({
            where: { id: { in: topUsers.map(u => u.userId) } },
            select: { id: true, firstName: true, lastName: true, email: true }
        });

        const report = topUsers.map(tu => ({
            ...tu,
            user: users.find(u => u.id === tu.userId)
        }));

        res.json(report);
    } catch (error) {
        console.error('Sales report error:', error);
        res.status(500).json({ error: 'Failed to generate sales report' });
    }
});

// ============================================
// PHASE 4: TRANSACTION MANAGEMENT
// ============================================

// PUT /api/admin/transactions/:id/status - Update transaction status
router.put('/transactions/:id/status', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { newStatus, reason, refund } = req.body;

        const transaction = await prisma.transaction.findUnique({
            where: { id: parseInt(id) },
            include: { user: true }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Update transaction status
        const updated = await prisma.transaction.update({
            where: { id: parseInt(id) },
            data: { status: parseInt(newStatus) }
        });

        // Log the status change
        await prisma.transactionStatusUpdate.create({
            data: {
                transactionId: parseInt(id),
                oldStatus: transaction.status,
                newStatus: parseInt(newStatus),
                adminId: req.admin.id,
                reason,
                refunded: refund || false
            }
        });

        // If refunding, credit user wallet
        if (refund && transaction.status !== 0) {
            await prisma.user.update({
                where: { id: transaction.userId },
                data: {
                    wallet: {
                        increment: transaction.amount
                    }
                }
            });
        }

        res.json({
            success: true,
            message: `Transaction ${refund ? 'refunded and ' : ''}updated successfully`,
            transaction: updated
        });
    } catch (error) {
        console.error('Update transaction status error:', error);
        res.status(500).json({ error: 'Failed to update transaction status' });
    }
});

// GET /api/admin/transactions/:id/history - Get transaction status history
router.get('/transactions/:id/history', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const history = await prisma.transactionStatusUpdate.findMany({
            where: { transactionId: parseInt(id) },
            include: {
                adminUser: {
                    select: {
                        id: true,
                        name: true,
                        username: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, history });
    } catch (error) {
        console.error('Get transaction history error:', error);
        res.status(500).json({ error: 'Failed to fetch transaction history' });
    }
});

// POST /api/admin/transactions/:id/retry - Retry failed transaction
router.post('/transactions/:id/retry', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const transaction = await prisma.transaction.findUnique({
            where: { id: parseInt(id) }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (transaction.status === 0) {
            return res.status(400).json({ error: 'Transaction already successful' });
        }

        // Update status to pending for retry
        await prisma.transaction.update({
            where: { id: parseInt(id) },
            data: { status: 1 } // 1 = pending
        });

        // Log the action
        await prisma.transactionStatusUpdate.create({
            data: {
                transactionId: parseInt(id),
                oldStatus: transaction.status,
                newStatus: 1,
                adminId: req.admin.id,
                reason: 'Manual retry by admin'
            }
        });

        res.json({
            success: true,
            message: 'Transaction queued for retry'
        });
    } catch (error) {
        console.error('Retry transaction error:', error);
        res.status(500).json({ error: 'Failed to retry transaction' });
    }
});

// ============================================
// PHASE 5: NOTIFICATIONS & COMMUNICATION
// ============================================

// POST /api/admin/broadcast - Send broadcast notification
router.post('/broadcast', adminAuth, async (req, res) => {
    try {
        const { title, message, userType } = req.body;

        // Get users based on type filter
        const where = userType ? { type: parseInt(userType) } : {};
        const users = await prisma.user.findMany({
            where,
            select: { id: true }
        });

        // Create notification for each user
        const notifications = users.map(user => ({
            userId: user.id,
            title,
            message,
            isRead: false
        }));

        await prisma.notification.createMany({
            data: notifications
        });

        res.json({
            success: true,
            message: `Broadcast sent to ${notifications.length} users`
        });
    } catch (error) {
        console.error('Broadcast error:', error);
        res.status(500).json({ error: 'Failed to send broadcast' });
    }
});

// ============================================
// PHASE 6: ANALYTICS & REPORTS
// ============================================

// GET /api/admin/analytics/service-breakdown - Service-specific analytics
router.get('/analytics/service-breakdown', adminAuth, async (req, res) => {
    try {
        const { startDate, endDate, serviceType } = req.query;

        const where = { status: 0 }; // Only successful transactions

        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        if (serviceType) {
            where.type = serviceType;
        }

        const breakdown = await prisma.transaction.groupBy({
            by: ['serviceName'],
            where,
            _sum: {
                amount: true,
                profit: true
            },
            _count: true
        });

        const formatted = breakdown.map(item => ({
            service: item.serviceName,
            totalTransactions: item._count,
            totalRevenue: item._sum.amount || 0,
            totalProfit: item._sum.profit || 0
        }));

        res.json({ success: true, breakdown: formatted });
    } catch (error) {
        console.error('Service breakdown error:', error);
        res.status(500).json({ error: 'Failed to fetch service breakdown' });
    }
});

// GET /api/admin/analytics/daily-report - Daily transaction report
router.get('/analytics/daily-report', adminAuth, async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days));

        const transactions = await prisma.transaction.findMany({
            where: {
                date: { gte: daysAgo }
            },
            select: {
                date: true,
                amount: true,
                profit: true,
                status: true
            }
        });

        // Group by date
        const grouped = transactions.reduce((acc, tx) => {
            const date = tx.date.toISOString().split('T')[0];
            if (!acc[date]) {
                acc[date] = {
                    date,
                    total: 0,
                    successful: 0,
                    failed: 0,
                    revenue: 0,
                    profit: 0
                };
            }
            acc[date].total++;
            if (tx.status === 0) {
                acc[date].successful++;
                acc[date].revenue += tx.amount;
                acc[date].profit += tx.profit;
            } else if (tx.status === 2) {
                acc[date].failed++;
            }
            return acc;
        }, {});

        const report = Object.values(grouped).sort((a, b) =>
            new Date(a.date) - new Date(b.date)
        );

        res.json({ success: true, report });
    } catch (error) {
        console.error('Daily report error:', error);
        res.status(500).json({ error: 'Failed to generate daily report' });
    }
});

// GET /api/admin/users/:id - Get full user details
router.get('/users/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            include: {
                transactions: {
                    take: 10,
                    orderBy: { date: 'desc' }
                },
                virtualAccounts: true,
                verifications: {
                    take: 5,
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        // Remove sensitive data like password if needed, but admin might need to see some?
        // Definitely remove password
        const { password, ...safeUser } = user;

        res.json({ success: true, user: safeUser });
    } catch (error) {
        console.error('Fetch user details error:', error);
        res.status(500).json({ error: 'Failed to fetch user details' });
    }
});

// PUT /api/admin/users/:id - Update user profile
router.put('/users/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, email, phone, state, type, kycStatus, nin, bvn } = req.body;

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: {
                firstName,
                lastName,
                email,
                phone,
                state,
                type: type ? parseInt(type) : undefined,
                kycStatus,
                nin,
                bvn
            }
        });

        const { password, ...safeUser } = updatedUser;
        res.json({ success: true, message: 'User updated successfully', user: safeUser });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// GET /api/admin/users/:id/kyc - Get KYC details (Redundant if GET /users/:id returns everything, but good for specific calls)
// We'll skip for now as GET /users/:id covers it.

module.exports = router;
