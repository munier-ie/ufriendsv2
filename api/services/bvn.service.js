const prisma = require('../../prisma/client');
const axios = require('axios');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Get Verification Settings from database
 */
async function getVerificationSettings() {
  let settings = await prisma.verificationSettings.findFirst();

  // Create default settings if none exist
  if (!settings) {
    settings = await prisma.verificationSettings.create({
      data: {
        bvnUserPrice: 500,
        bvnAgentPrice: 450,
        bvnVendorPrice: 400,
        bvnApiPrice: 300,
        ninRegularUserPrice: 150,
        ninRegularAgentPrice: 140,
        ninRegularVendorPrice: 130,
        ninRegularApiPrice: 100,
        active: false // Inactive until admin configures API keys
      }
    });
  }

  return settings;
}

/**
 * Get BVN pricing based on user type
 */
async function getBvnPricing(userType, slipType = 'regular') {
  const settings = await getVerificationSettings();

  let userPrice, apiPrice;
  const isPlastic = slipType === 'plastic';

  switch (userType) {
    case 2: // Agent
      userPrice = isPlastic ? settings.bvnPlasticAgentPrice : settings.bvnAgentPrice;
      break;
    case 3: // Vendor
      userPrice = isPlastic ? settings.bvnPlasticVendorPrice : settings.bvnVendorPrice;
      break;
    default: // Regular user
      userPrice = isPlastic ? settings.bvnPlasticUserPrice : settings.bvnUserPrice;
  }

  apiPrice = isPlastic ? settings.bvnPlasticApiPrice : settings.bvnApiPrice;

  return { userPrice, apiPrice, settings };
}

/**
 * Verify BVN using Prembly API
 */
async function verifyBvn(bvnNumber) {
  try {
    const settings = await getVerificationSettings();

    // Check if service is active and configured
    if (!settings.active) {
      throw new Error('BVN verification service is not active. Please contact administrator.');
    }

    if (!settings.apiKey) {
      throw new Error('BVN verification service is not configured. Please contact administrator.');
    }

    const headers = {
      'x-api-key': settings.apiKey,
      'Content-Type': 'application/json'
    };

    if (settings.appId) {
      headers['app-id'] = settings.appId;
    }

    // Call Prembly API
    // Use the configured base URL, ensuring no double slashes if it ends with /
    const baseUrl = (settings.baseUrl || 'https://api.prembly.com').replace(/\/$/, '');
    const endpoint = baseUrl.includes('verification') ? '/bvn' : '/verification/bvn';

    const fullUrl = `${baseUrl}${endpoint}`;

    console.log('BVN Verification Request:');
    console.log('URL:', fullUrl);
    console.log('Payload:', { number: bvnNumber });

    const response = await axios.post(
      fullUrl,
      {
        number: bvnNumber
      },
      {
        headers,
        timeout: 30000 // 30 second timeout
      }
    );

    // Check response status
    if (response.data && response.data.status === true) {
      return {
        success: true,
        data: response.data.data || response.data
      };
    } else {
      return {
        success: false,
        message: response.data?.message || 'BVN verification failed',
        data: response.data
      };
    }

  } catch (error) {
    console.error('BVN Verification Error:', error.response?.data || error.message);

    if (error.response) {
      return {
        success: false,
        message: error.response.data?.message || 'BVN verification failed',
        error: error.response.data
      };
    }

    return {
      success: false,
      message: error.message || 'System error during BVN verification'
    };
  }
}

/**
 * Store BVN report in database
 */
async function storeBvnReport(userId, transactionRef, bvnNumber, verificationData, slipType = 'regular') {
  try {
    const report = await prisma.bvnReport.create({
      data: {
        userId,
        transactionRef,
        bvnNumber,
        firstName: verificationData.firstName || verificationData.first_name,
        middleName: verificationData.middleName || verificationData.middle_name,
        lastName: verificationData.lastName || verificationData.last_name,
        dateOfBirth: verificationData.dateOfBirth || verificationData.date_of_birth,
        gender: verificationData.gender,
        maritalStatus: verificationData.maritalStatus || verificationData.marital_status,
        phoneNumber: verificationData.phoneNumber1 || verificationData.phone_number || verificationData.phoneNumber,
        nin: verificationData.nin,
        enrollmentBank: verificationData.enrollmentBank || verificationData.enrollment_bank,
        enrollmentBranch: verificationData.enrollmentBranch || verificationData.enrollment_branch,
        stateOfOrigin: verificationData.stateOfOrigin || verificationData.state_of_origin,
        lgaOfOrigin: verificationData.lgaOfOrigin || verificationData.lga_of_origin,
        stateOfResidence: verificationData.stateOfResidence || verificationData.state_of_residence,
        lgaOfResidence: verificationData.lgaOfResidence || verificationData.lga_of_residence,
        residentialAddress: verificationData.residentialAddress || verificationData.residential_address,
        base64Image: verificationData.base64Image || verificationData.base64_image || verificationData.image,
        rawResponse: JSON.stringify(verificationData),
        slipType,
        status: 'verified',
        updatedAt: new Date()
      }
    });

    return report;
  } catch (error) {
    console.error('Store BVN Report Error:', error);
    throw error;
  }
}

/**
 * Generate BVN slip HTML (Exact V3 Design)
 */
function generateBvnSlipHtml(reportData) {
  const fs = require('fs');
  const path = require('path');

  function loadImg(filename) {
    try {
      const fullPath = path.join(__dirname, '../slip-assets', filename);
      if (fs.existsSync(fullPath)) {
        const data = fs.readFileSync(fullPath);
        const ext = path.extname(filename).toLowerCase().replace('.', '');
        const mime = (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : 'image/png';
        return `data:${mime};base64,${data.toString('base64')}`;
      }
    } catch (e) { /* ignore */ }
    return '';
  }

  const coatOfArm = loadImg('coat-of-arm.png');
  const bvn = reportData.bvnNumber || '';
  const photoSrc = reportData.base64Image
    ? (reportData.base64Image.startsWith('data:') ? reportData.base64Image : `data:image/jpg;base64,${reportData.base64Image}`)
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>BVN Verification Slip</title>
  <style>
    body { font-family: Arial, sans-serif; background: #fff; margin: 0; padding: 20px; }
    .mt-5 { margin-top: 3rem; }
    .mb-3 { margin-bottom: 1rem; }
    .text-black { color: #000; }
    .text-bold { font-weight: bold; }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-success { color: #28a745; }
    .text-danger { color: #dc3545; }
    table { border-collapse: collapse; width: 100%; }
    th, td { padding: 6px 10px; font-size: 13px; border: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: bold; white-space: nowrap; }
    h2 { margin: 0; }
    h4 { margin: 0; }
    ol { margin: 0; padding-left: 18px; }
    li { margin-bottom: 4px; }
  </style>
</head>
<body>
  <div id="BVN-Data-Result-Container">
    <div>
      <table border="0" class="mt-5 mb-3 text-black">
        <tr>
          <td class="text-center" colspan="5">
            <h4>
              ${coatOfArm ? `<img src="${coatOfArm}" width="70" height="50">` : ''}
              <span class="text-bold">Federal Republic of Nigeria</span><br>
              <span class="text-bold"> Verified BVN Details </span>
            </h4>
          </td>
        </tr>
        <tr>
          <th nowrap>First Name:</th>
          <td class="text-left" width="150px" nowrap>${reportData.firstName || ''}</td>
          <td rowspan="6" colspan="2" class="text-center" nowrap>
            ${photoSrc ? `<img src="${photoSrc}" width="130" height="130">` : '<div style="width:130px;height:130px;background:#eee;display:inline-block;"></div>'}
            <br><b>BVN</b> <br>
            <h4 class="text-bold">${bvn.substr(0, 4)} ${bvn.substr(4, 3)} ${bvn.substr(7)}</h4>
          </td>
          <td rowspan="8" class="text-center text-black text-bold" width="40%" style="font-size: 10px;">
            <h2 class="text-success">Verified</h2>
            <div>
              Please do note that;
              <ol class="text-left">
                <li> The information on this slip remains valid until altered/modified where necessary by an authorized body. </li>
                <li> Any person/authority using the information should verify it at anyverify.com.ng or any other channel approved by the federal government of Nigeria. </li>
                <li> The information shown on this slip is valid for the lifetime of the holder and <span class="text-danger">DOES NOT EXPIRE</span>. </li>
                <li> The Verifier should not be blamed for any unauthorized alteration/copy/erasure etc done on this slip. </li>
              </ol>
            </div>
          </td>
        </tr>
        <tr>
          <th nowrap>Middle Name:</th>
          <td class="text-left" nowrap>${reportData.middleName || ''}</td>
        </tr>
        <tr>
          <th nowrap>Last Name:</th>
          <td class="text-left" nowrap>${reportData.lastName || ''}</td>
        </tr>
        <tr>
          <th nowrap>Date of birth:</th>
          <td class="text-left">${reportData.dateOfBirth || ''}</td>
        </tr>
        <tr>
          <th nowrap>Gender:</th>
          <td class="text-left">${reportData.gender || ''}</td>
        </tr>
        <tr>
          <th nowrap>Marital Status:</th>
          <td class="text-left">${reportData.maritalStatus || ''}</td>
        </tr>
        <tr>
          <th nowrap>Phone Number:</th>
          <td>${reportData.phoneNumber || ''}</td>
          <th>NIN: ${reportData.nin || ''}</th>
          <td></td>
        </tr>
        <tr>
          <th>Enrollment Institution:</th>
          <td>${reportData.enrollmentBank || ''}</td>
          <th>Enrollment Branch:</th>
          <td>${reportData.enrollmentBranch || ''}</td>
        </tr>
        <tr>
          <th>Origin State:</th>
          <td>${reportData.stateOfOrigin || ''}</td>
          <th>Origin LGA:</th>
          <td>${reportData.lgaOfOrigin || ''}</td>
        </tr>
        <tr>
          <th>Residence State:</th>
          <td>${reportData.stateOfResidence || ''}</td>
          <th>Residence LGA:</th>
          <td>${reportData.lgaOfResidence || ''}</td>
        </tr>
        <tr>
          <th>Residential Address:</th>
          <td colspan="3">${reportData.residentialAddress || ''}</td>
        </tr>
      </table>
    </div>
    <div style="margin-top: 70px;"></div>
  </div>
</body>
</html>`;
}

/**
 * Generate BVN Plastic Slip HTML (Premium Card Design)
 */
function generateBvnPlasticSlipHtml(reportData) {
  const fs = require('fs');
  const path = require('path');

  function loadImg(filename) {
    try {
      const fullPath = path.join(__dirname, '../slip-assets', filename);
      if (fs.existsSync(fullPath)) {
        const data = fs.readFileSync(fullPath);
        const ext = path.extname(filename).toLowerCase().replace('.', '');
        const mime = (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : 'image/png';
        return `data:${mime};base64,${data.toString('base64')}`;
      }
    } catch (e) { /* ignore */ }
    return '';
  }

  const background = loadImg('bvn-plastic-bg.png'); // Need to ensure this exists
  const bvn = reportData.bvnNumber || '';
  const photoSrc = reportData.base64Image
    ? (reportData.base64Image.startsWith('data:') ? reportData.base64Image : `data:image/jpg;base64,${reportData.base64Image}`)
    : '';

  // Format issue date (today)
  const issueDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>BVN Plastic Slip</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #fff; margin: 0; padding: 0; display: flex; flex-direction: column; align-items: center; }
    .card {
      position: relative;
      width: 504px; /* Approx 3.375in at 150dpi */
      height: 318px; /* Approx 2.125in at 150dpi */
      margin-bottom: 20px;
      overflow: hidden;
      border-radius: 12px;
      border: 1px solid #ccc;
    }
    .card-bg {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 636px; /* Dual-side background */
      background-image: url('${background}');
      background-size: cover;
      background-repeat: no-repeat;
    }
    .back .card-bg { top: -318px; } /* Shift up for back side */
    
    .content { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
    
    .photo {
      position: absolute;
      top: 72px;
      left: 18px;
      width: 104px;
      height: 110px;
      border: 1px solid #ddd;
      background: #f0f0f0;
      object-fit: cover;
    }
    
    .label { font-size: 10px; font-weight: bold; color: #555; position: absolute; }
    .value { font-size: 13px; font-weight: bold; color: #000; position: absolute; }
    
    /* Front Labels */
    .surname-label { top: 76px; left: 135px; }
    .firstname-label { top: 110px; left: 135px; }
    .dob-label { top: 146px; left: 135px; }
    .gender-label { top: 146px; left: 280px; }
    .issue-label { top: 168px; left: 375px; }
    
    /* Front Values */
    .surname-val { top: 88px; left: 135px; }
    .firstname-val { top: 124px; left: 135px; }
    .dob-val { top: 160px; left: 135px; }
    .gender-val { top: 160px; left: 280px; }
    .issue-val { top: 182px; left: 375px; text-transform: uppercase; }
    
    /* BVN Number Section */
    .bvn-heading {
      position: absolute;
      bottom: 60px;
      left: 0;
      width: 100%;
      text-align: center;
      font-size: 14px;
      font-weight: bold;
      color: #1e3a8a; /* Blue color */
      letter-spacing: 0.5px;
    }
    
    .bvn-number {
      position: absolute;
      bottom: 25px;
      left: 0;
      width: 100%;
      text-align: center;
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 5px;
      color: #000;
    }
    
    .back-text {
      position: absolute;
      top: 155px;
      right: 170px;
      text-align: right;
      line-height: 1;
    }
    .back-text-top { font-size: 14px; font-weight: bold; }
    .back-text-mid { font-size: 14px; font-weight: bold; }
    .back-text-bot { font-size: 14px; font-weight: bold; }
    
  </style>
</head>
<body>
  <!-- Front Side -->
  <div class="card">
    <div class="card-bg"></div>
    <div class="content">
      <img src="${photoSrc}" class="photo">
      
      <div class="label surname-label">SURNAME</div>
      <div class="value surname-val">${(reportData.lastName || '').toUpperCase()}</div>
      
      <div class="label firstname-label">FIRSTNAME/OTHER NAMES</div>
      <div class="value firstname-val">${(reportData.firstName || '').toUpperCase()} ${(reportData.middleName || '').toUpperCase()}</div>
      
      <div class="label dob-label">DATE OF BIRTH</div>
      <div class="value dob-val">${(reportData.dateOfBirth || '').toUpperCase()}</div>
      
      <div class="label gender-label">GENDER</div>
      <div class="value gender-val">${(reportData.gender || '').toUpperCase()}</div>
      
      <div class="label issue-label">ISSUE DATE</div>
      <div class="value issue-val">${issueDate}</div>
      
      <div class="bvn-heading">BANK VERIFICATION NUMBER (BVN)</div>
      <div class="bvn-number">${bvn.substr(0, 4)} ${bvn.substr(4, 3)} ${bvn.substr(7)}</div>
    </div>
  </div>
  
  <!-- Back Side -->
  <div class="card back">
    <div class="card-bg"></div>
  </div>
</body>
</html>`;
}

/**
 * Generate PDF from BVN report
 */
async function generateBvnPdf(reportData) {
  try {
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '../../uploads/slips/bvn');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Generate HTML
    const isPlastic = reportData.slipType === 'plastic';
    const html = isPlastic ? generateBvnPlasticSlipHtml(reportData) : generateBvnSlipHtml(reportData);

    // Generate PDF filename
    const pdfFilename = `${reportData.transactionRef}.pdf`;
    const pdfPath = path.join(uploadsDir, pdfFilename);

    // PDF options
    const browser = await puppeteer.launch({
      executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: 'new'
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfOptions = {
      format: 'A4',
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      printBackground: true
    };

    // For plastic slip, we might want a different size or layout, 
    // but keeping A4 and letting the CSS handle the card size is safer for printing.

    const pdfBuffer = await page.pdf(pdfOptions);
    await browser.close();

    // Save PDF to file
    await fs.writeFile(pdfPath, pdfBuffer);

    // Return relative URL
    const pdfUrl = `/uploads/slips/bvn/${pdfFilename}`;

    // Update report with PDF URL
    await prisma.bvnReport.update({
      where: { id: reportData.id },
      data: { pdfUrl }
    });

    return pdfUrl;

  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw error;
  }
}

/**
 * Complete BVN verification process
 */
async function processBvnVerification(userId, bvnNumber, transactionRef, userType = 1, slipType = 'regular') {
  try {
    // 1. Verify BVN with Prembly
    const verificationResult = await verifyBvn(bvnNumber);

    if (!verificationResult.success) {
      return {
        success: false,
        message: verificationResult.message || 'BVN verification failed'
      };
    }

    // 2. Store report in database
    const report = await storeBvnReport(userId, transactionRef, bvnNumber, verificationResult.data, slipType);

    // 3. Generate PDF slip
    const pdfUrl = await generateBvnPdf(report);

    // 4. Return success with report details
    return {
      success: true,
      message: 'BVN verified successfully',
      report: {
        id: report.id,
        transactionRef: report.transactionRef,
        firstName: report.firstName,
        lastName: report.lastName,
        pdfUrl: pdfUrl
      }
    };

  } catch (error) {
    console.error('Process BVN Verification Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to process BVN verification'
    };
  }
}

module.exports = {
  getVerificationSettings,
  getBvnPricing,
  verifyBvn,
  storeBvnReport,
  generateBvnSlipHtml,
  generateBvnPdf,
  processBvnVerification
};
