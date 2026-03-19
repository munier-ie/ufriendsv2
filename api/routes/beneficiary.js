const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const auth = require('../middleware/auth');

// Get all beneficiaries for the user
router.get('/', auth, async (req, res) => {
    try {
        const beneficiaries = await prisma.beneficiary.findMany({
            where: { userId: req.user.id },
            orderBy: { name: 'asc' }
        });
        res.json(beneficiaries);
    } catch (error) {
        console.error('Get beneficiaries error:', error);
        res.status(500).json({ error: 'Failed to fetch beneficiaries' });
    }
});

// Add a new beneficiary
router.post('/', auth, async (req, res) => {
    try {
        const { name, phone, network, service, meterNo, smartCardMsg } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ error: 'Name and phone number are required' });
        }

        // Check if beneficiary already exists for this user
        const existing = await prisma.beneficiary.findFirst({
            where: {
                userId: req.user.id,
                phone: phone
            }
        });

        if (existing) {
            return res.status(400).json({ error: 'Beneficiary with this phone number already exists' });
        }

        const beneficiary = await prisma.beneficiary.create({
            data: {
                userId: req.user.id,
                name,
                phone,
                network,
                service,
                meterNo,
                smartCardMsg
            }
        });

        res.json({ message: 'Beneficiary added successfully', beneficiary });
    } catch (error) {
        console.error('Add beneficiary error:', error);
        res.status(500).json({ error: 'Failed to add beneficiary' });
    }
});

// Delete a beneficiary
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        // Ensure the beneficiary belongs to the user
        const beneficiary = await prisma.beneficiary.findFirst({
            where: {
                id: parseInt(id),
                userId: req.user.id
            }
        });

        if (!beneficiary) {
            return res.status(404).json({ error: 'Beneficiary not found' });
        }

        await prisma.beneficiary.delete({
            where: { id: parseInt(id) }
        });

        res.json({ message: 'Beneficiary deleted successfully' });
    } catch (error) {
        console.error('Delete beneficiary error:', error);
        res.status(500).json({ error: 'Failed to delete beneficiary' });
    }
});

module.exports = router;
