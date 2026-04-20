const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const { z } = require('zod');

const waitlistSchema = z.object({
    email: z.string().trim().email().toLowerCase(),
    platform: z.enum(['ios', 'android'])
});

const TEMP_MAIL_DOMAINS = [
    'mailinator.com', 'guerrillamail.com', 'tempmail.com', '10minutemail.com', 
    'throwawaymail.com', 'yopmail.com', 'dispostable.com'
];

// Add to waitlist
router.post('/', async (req, res) => {
    try {
        const validation = waitlistSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.errors[0].message });
        }

        const { email, platform } = validation.data;
        const domain = email.split('@')[1];

        if (TEMP_MAIL_DOMAINS.includes(domain)) {
            return res.status(400).json({ error: 'Please use a permanent email address.' });
        }

        // Check if already exists
        const existing = await prisma.waitlist.findUnique({
            where: { email }
        });

        if (existing) {
            return res.status(400).json({ error: 'This email is already on our waitlist!' });
        }

        // Add to waitlist
        await prisma.waitlist.create({
            data: { email, platform }
        });

        res.status(201).json({ message: 'Successfully added to waitlist!' });
    } catch (error) {
        console.error('Waitlist error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
