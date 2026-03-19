const fs = require('fs');
const path = require('path');
const { generateNinSlipHtml, generateNinPdf, verifyNin } = require('./api/services/nin.service.js');

const mockReport = {
    id: 'mock_test_123',
    transactionRef: 'TEST_REF_123',
    ninNumber: '12345678901',
    firstName: 'JOHN',
    middleName: 'MARK',
    surname: 'DOE',
    dateOfBirth: '1990-01-01',
    gender: 'Male',
    createdAt: new Date(),
    base64Photo: ''
};

async function test() {
    try {
        const standardHtml = await generateNinSlipHtml(mockReport, 'standard');
        fs.writeFileSync('./standard-test.html', standardHtml);
        console.log('Standard HTML generated');

        const premiumHtml = await generateNinSlipHtml(mockReport, 'premium');
        fs.writeFileSync('./premium-test.html', premiumHtml);
        console.log('Premium HTML generated');

        // Test PDF generation
        // Mock the prisma dependency inside nin.service.js if possible, or just generate HTML tests
    } catch (error) {
        console.error('Error:', error);
    }
}

test();
