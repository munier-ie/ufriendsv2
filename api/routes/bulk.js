const express = require('express');
const router = express.Router();
const multer = require('multer');
const csvParser = require('csv-parser');
const prisma = require('../../prisma/client');
const { verifyToken } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Bulk Transaction Processing Routes
 * Handles CSV upload, validation, batch processing, and results download
 * with job tracking and error logging
 */

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});

// Upload and validate CSV
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
    try {
        const userId = req.user.id;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Parse CSV and validate
        const rows = [];
        const errors = [];

        await new Promise((resolve, reject) => {
            fs.createReadStream(file.path)
                .pipe(csvParser())
                .on('data', (row) => {
                    // Validate row
                    const validation = validateBulkRow(row, rows.length + 1);
                    if (validation.valid) {
                        rows.push(row);
                    } else {
                        errors.push(validation.error);
                    }
                })
                .on('end', resolve)
                .on('error', reject);
        });

        // Check row limit
        const maxRows = parseInt(process.env.BULK_MAX_ROWS || '1000');
        if (rows.length > maxRows) {
            fs.unlinkSync(file.path);
            return res.status(400).json({
                message: `Maximum ${maxRows} rows allowed`
            });
        }

        // If validation errors, return them
        if (errors.length > 0) {
            fs.unlinkSync(file.path);
            return res.status(400).json({
                message: 'Validation errors found',
                errors: errors.slice(0, 10) // Return first 10 errors
            });
        }

        // Create bulk job
        const job = await prisma.bulkJob.create({
            data: {
                userId,
                fileName: file.originalname,
                totalRows: rows.length,
                status: 'pending'
            }
        });

        // Save validated data for processing into a secure filename
        const dataPath = path.join('uploads', `bulk_${job.id}_${crypto.randomBytes(8).toString('hex')}.json`);
        fs.writeFileSync(dataPath, JSON.stringify(rows));

        // Clean up uploaded file
        fs.unlinkSync(file.path);

        // Start background processing
        processBulkJob(job.id, userId, rows);

        res.json({
            status: 0,
            message: 'File uploaded successfully',
            jobId: job.id,
            totalRows: rows.length
        });

    } catch (error) {
        console.error('Bulk upload error:', error);
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Failed to upload file' });
    }
});

// Get job status
router.get('/status/:jobId', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const jobId = parseInt(req.params.jobId);

        const job = await prisma.bulkJob.findFirst({
            where: {
                id: jobId,
                userId
            }
        });

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        res.json({
            status: 0,
            id: job.id,
            fileName: job.fileName,
            totalRows: job.totalRows,
            processed: job.processed,
            successful: job.successful,
            failed: job.failed,
            status: job.status,
            resultUrl: job.resultUrl
        });

    } catch (error) {
        console.error('Get job status error:', error);
        res.status(500).json({ message: 'Failed to fetch job status' });
    }
});

// Download results
router.get('/download/:jobId', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const jobId = parseInt(req.params.jobId);

        const job = await prisma.bulkJob.findFirst({
            where: {
                id: jobId,
                userId,
                status: 'completed'
            }
        });

        if (!job) {
            return res.status(404).json({ message: 'Job not found or not completed' });
        }

        if (!job.resultUrl) {
            return res.status(404).json({ message: 'Results not available' });
        }

        // Send file
        const filePath = path.join(__dirname, '../../', job.resultUrl);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Results file not found' });
        }

        res.download(filePath, `bulk_results_${jobId}.csv`);

    } catch (error) {
        console.error('Download results error:', error);
        res.status(500).json({ message: 'Failed to download results' });
    }
});

// Helper: Validate bulk row
function validateBulkRow(row, rowNumber) {
    const requiredFields = ['service', 'phone', 'amount', 'variation_code'];

    // Check required fields
    for (const field of requiredFields) {
        if (!row[field]) {
            return {
                valid: false,
                error: `Row ${rowNumber}: Missing ${field}`
            };
        }
    }

    // Validate service type
    const validServices = ['airtime', 'data', 'cable', 'electricity'];
    if (!validServices.includes(row.service.toLowerCase())) {
        return {
            valid: false,
            error: `Row ${rowNumber}: Invalid service type`
        };
    }

    // Validate phone number
    if (!/^\d{11}$/.test(row.phone)) {
        return {
            valid: false,
            error: `Row ${rowNumber}: Invalid phone number`
        };
    }

    // Validate amount
    const amount = parseFloat(row.amount);
    if (isNaN(amount) || amount <= 0) {
        return {
            valid: false,
            error: `Row ${rowNumber}: Invalid amount`
        };
    }

    return { valid: true };
}

// Helper: Process bulk job (background)
async function processBulkJob(jobId, userId, rows) {
    try {
        // Update job status to processing
        await prisma.bulkJob.update({
            where: { id: jobId },
            data: { status: 'processing' }
        });

        const results = [];
        let successful = 0;
        let failed = 0;

        // Get user for PIN verification
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        // [SEC-HIGH-02] Pre-flight balance check for the entire batch
        const totalRequired = rows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
        if (user.wallet < totalRequired) {
            await prisma.bulkJob.update({
                where: { id: jobId },
                data: { 
                    status: 'failed',
                    errorLog: `Job failed: Insufficient wallet balance for the total batch amount (₦${totalRequired.toLocaleString()})`
                }
            });
            return; // Abort processing early
        }

        // Process each row
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            try {
                // Attempt transaction (simplified - would call actual service routes)
                const result = await processBulkTransaction(userId, row);

                results.push({
                    ...row,
                    status: 'success',
                    reference: result.reference,
                    message: result.message
                });
                successful++;

            } catch (error) {
                results.push({
                    ...row,
                    status: 'failed',
                    message: error.message
                });
                failed++;
            }

            // Update progress
            await prisma.bulkJob.update({
                where: { id: jobId },
                data: {
                    processed: i + 1,
                    successful,
                    failed
                }
            });
        }

        // Save results to CSV
        const resultPath = `uploads/bulk_results_${jobId}.csv`;
        const csvContent = generateResultsCSV(results);
        fs.writeFileSync(resultPath, csvContent);

        // Update job as completed
        await prisma.bulkJob.update({
            where: { id: jobId },
            data: {
                status: 'completed',
                resultUrl: resultPath
            }
        });

    } catch (error) {
        console.error('Bulk processing error:', error);

        await prisma.bulkJob.update({
            where: { id: jobId },
            data: {
                status: 'failed',
                errorLog: error.message
            }
        });
    }
}

// Helper: Process single bulk transaction
async function processBulkTransaction(userId, row) {
    const amount = parseFloat(row.amount);

    // Lookup service to get cost price
    let costPrice = amount; // Default to no profit if service not found
    let serviceName = `Bulk ${row.service}`;

    try {
        const service = await prisma.service.findFirst({
            where: {
                type: row.service.toLowerCase(),
                OR: [
                    { serviceId: row.variation_code },
                    { variation_code: row.variation_code }
                ]
            }
        });

        if (service) {
            serviceName = service.name;
            if (service.apiPrice) {
                costPrice = service.apiPrice;
            }
        }
    } catch (e) {
        console.error('Service lookup failed in bulk processing:', e);
    }

    const reference = `BULK-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const result = await prisma.$transaction(async (tx) => {
        const currentUser = await tx.user.findUnique({
            where: { id: userId },
            select: { wallet: true }
        });

        if (currentUser.wallet < amount) {
            throw new Error('Insufficient balance');
        }

        const newBalance = currentUser.wallet - amount;

        // Deduct balance
        await tx.user.update({
            where: { id: userId },
            data: { wallet: newBalance }
        });

        // Create transaction record
        await tx.transaction.create({
            data: {
                userId,
                reference,
                serviceName: serviceName,
                type: row.service.toLowerCase(),
                amount: -amount,
                status: 0,
                description: `Bulk ${row.service} purchase for ${row.phone}`,
                oldBalance: currentUser.wallet,
                newBalance: newBalance,
                profit: amount - costPrice
            }
        });

        return {
            reference,
            message: `${row.service} purchase successful`
        };
    });

    return result;
}

// Helper: Generate results CSV
function generateResultsCSV(results) {
    const headers = ['service', 'phone', 'amount', 'variation_code', 'status', 'reference', 'message'];
    const rows = results.map(r => {
        return headers.map(h => r[h] || '').join(',');
    });

    return [headers.join(','), ...rows].join('\n');
}

module.exports = router;
