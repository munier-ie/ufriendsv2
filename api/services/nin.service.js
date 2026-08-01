const prisma = require('../../prisma/client');
const crypto = require('crypto');
const axios = require('axios');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { getChromePath } = require('../utils/chrome');
const { getCache, setCache, acquireLock, releaseLock } = require('../utils/redis');

function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeHTML(strings, ...values) {
  let result = '';
  for (const str of strings) {
    result += str;
    if (values.length > 0) {
      const val = values.shift();
      if (val !== undefined) {
        result += val;
      }
    }
  }
  return result;
}

/**
 * Get Verification Settings from database
 */
async function getVerificationSettings() {
  let settings = await prisma.verificationSettings.findFirst();

  // Create default settings if none exist
  if (!settings) {
    settings = await prisma.verificationSettings.create({
      data: {
        ninRegularUserPrice: 150,
        ninRegularAgentPrice: 140,
        ninRegularVendorPrice: 130,
        ninRegularApiPrice: 100,
        ninStandardUserPrice: 200,
        ninStandardAgentPrice: 190,
        ninStandardVendorPrice: 180,
        ninStandardApiPrice: 150,
        ninPremiumUserPrice: 200,
        ninPremiumAgentPrice: 190,
        ninPremiumVendorPrice: 180,
        ninPremiumApiPrice: 150,
        ninVninUserPrice: 1000,
        ninVninAgentPrice: 900,
        ninVninVendorPrice: 800,
        ninVninApiPrice: 600,
        ninActive: true
      }
    });
  }

  return settings;
}

/**
 * Get NIN pricing based on slip type and user type
 */
async function getNinPricing(slipType, userType) {
  const validSlipTypes = ['regular', 'standard', 'premium', 'vnin'];
  if (!validSlipTypes.includes(slipType)) {
    throw new Error('Invalid slip type');
  }

  const settings = await getVerificationSettings();

  let userPrice, apiPrice;

  if (slipType === 'regular') {
    switch (userType) {
      case 2: userPrice = settings.ninRegularAgentPrice; apiPrice = settings.ninRegularApiPrice; break;
      case 3: userPrice = settings.ninRegularVendorPrice; apiPrice = settings.ninRegularApiPrice; break;
      default: userPrice = settings.ninRegularUserPrice; apiPrice = settings.ninRegularApiPrice; break;
    }
  } else if (slipType === 'standard') {
    switch (userType) {
      case 2: userPrice = settings.ninStandardAgentPrice; apiPrice = settings.ninStandardApiPrice; break;
      case 3: userPrice = settings.ninStandardVendorPrice; apiPrice = settings.ninStandardApiPrice; break;
      default: userPrice = settings.ninStandardUserPrice; apiPrice = settings.ninStandardApiPrice; break;
    }
  } else if (slipType === 'premium') {
    switch (userType) {
      case 2: userPrice = settings.ninPremiumAgentPrice; apiPrice = settings.ninPremiumApiPrice; break;
      case 3: userPrice = settings.ninPremiumVendorPrice; apiPrice = settings.ninPremiumApiPrice; break;
      default: userPrice = settings.ninPremiumUserPrice; apiPrice = settings.ninPremiumApiPrice; break;
    }
  } else if (slipType === 'vnin') {
    switch (userType) {
      case 2: userPrice = settings.ninVninAgentPrice; apiPrice = settings.ninVninApiPrice; break;
      case 3: userPrice = settings.ninVninVendorPrice; apiPrice = settings.ninVninApiPrice; break;
      default: userPrice = settings.ninVninUserPrice; apiPrice = settings.ninVninApiPrice; break;
    }
  }

  return { userPrice, apiPrice, settings };
}

// In-flight locks map for NIN / Phone verifications to prevent concurrent Prembly calls
const ninInFlightLocks = new Map();

/**
 * Generate normalized search variations (e.g., 08012345678, 2348012345678, +2348012345678)
 */
function getSearchVariations(val) {
  if (!val) return [];
  const raw = String(val).trim();
  const clean = raw.replace(/[\s\-]/g, '');
  const set = new Set([raw, clean]);
  const phoneDigits = clean.replace(/\+/g, '');
  if (phoneDigits.startsWith('234') && phoneDigits.length === 13) {
    set.add('0' + phoneDigits.slice(3));
    set.add('+' + phoneDigits);
    set.add(phoneDigits);
  } else if (phoneDigits.startsWith('0') && phoneDigits.length === 11) {
    set.add('234' + phoneDigits.slice(1));
    set.add('+234' + phoneDigits.slice(1));
    set.add(phoneDigits);
  }
  return Array.from(set).filter(v => v && v.length >= 5);
}

/**
 * Helper to check if a response/message indicates a non-existent or invalid record
 */
function isNotFoundResponse(data, msg) {
  const text = (String(msg || '') + ' ' + JSON.stringify(data || '')).toLowerCase();
  return (
    text.includes('not found') ||
    text.includes('no record') ||
    text.includes('invalid nin') ||
    text.includes('invalid bvn') ||
    text.includes('does not exist') ||
    text.includes('no data') ||
    text.includes('wrong nin') ||
    text.includes('wrong bvn') ||
    text.includes('details not found') ||
    text.includes('could not find') ||
    text.includes('unverified') ||
    text.includes('record not exist') ||
    text.includes('not exist')
  );
}

/**
 * Global helper to find cached NIN report by NIN number, phone number, trackingId, or JSON contents
 */
async function findCachedNinReport(searchVal) {
  if (!searchVal) return null;
  const variations = getSearchVariations(searchVal);
  if (variations.length === 0) return null;

  try {
    // 1. Try Redis L1 Cache
    for (const v of variations) {
      const redisCached = await getCache(`REPORT:NIN:${v}`);
      if (redisCached) {
        if (redisCached.notFound) {
          console.log(`[findCachedNinReport] REDIS L1 Cache HIT (NOT FOUND) for NIN/phone variation ${v}. Bypassing DB & Prembly.`);
          return {
            id: 'redis-cache-not-found',
            rawResponse: JSON.stringify(redisCached),
            ninNumber: v,
            notFound: true,
            message: redisCached.message || 'No record found for this NIN'
          };
        }
        console.log(`[findCachedNinReport] REDIS L1 Cache HIT for NIN/phone variation ${v}. Bypassing DB.`);
        return {
          id: 'redis-cache',
          rawResponse: JSON.stringify(redisCached),
          ninNumber: v
        };
      }
    }

    const orConditions = [];
    for (const v of variations) {
      orConditions.push({ ninNumber: v });
      orConditions.push({ trackingId: v });
      orConditions.push({ rawResponse: { contains: v } });
    }

    // 2. Search ninReport table in DB (L2 Cache)
    let report = await prisma.ninReport.findFirst({
      where: {
        rawResponse: { not: null },
        OR: orConditions
      },
      orderBy: { id: 'desc' }
    });

    if (report && report.rawResponse && report.rawResponse.length > 10) {
      try {
        const parsed = JSON.parse(report.rawResponse);
        if (parsed.notFound || report.status === 'NOT_FOUND') {
          console.log(`[findCachedNinReport] DB L2 Cache HIT (NOT FOUND) for NIN report ${report.id}. Bypassing Prembly.`);
          for (const v of variations) {
            setCache(`REPORT:NIN:${v}`, { notFound: true, message: parsed.message || 'No record found for this NIN' }, 86400 * 30).catch(() => {});
          }
          return {
            id: report.id,
            rawResponse: report.rawResponse,
            ninNumber: variations[0],
            notFound: true,
            message: parsed.message || 'No record found for this NIN'
          };
        }
        for (const v of variations) {
          setCache(`REPORT:NIN:${v}`, parsed, 86400 * 30).catch(() => {});
        }
      } catch (e) {}
      return report;
    }

    // 3. Search bvnReport table if NIN or phone was captured during BVN lookup
    const bvnOrConditions = [];
    for (const v of variations) {
      bvnOrConditions.push({ nin: v });
      bvnOrConditions.push({ phoneNumber: v });
      bvnOrConditions.push({ rawResponse: { contains: v } });
    }

    let bvnMatch = await prisma.bvnReport.findFirst({
      where: {
        rawResponse: { not: null },
        OR: bvnOrConditions
      },
      orderBy: { id: 'desc' }
    });

    if (bvnMatch && bvnMatch.rawResponse && bvnMatch.rawResponse.length > 10) {
      try {
        const parsed = JSON.parse(bvnMatch.rawResponse);
        if (parsed.notFound || bvnMatch.status === 'NOT_FOUND') {
          return {
            id: bvnMatch.id,
            rawResponse: bvnMatch.rawResponse,
            ninNumber: variations[0],
            notFound: true,
            message: parsed.message || 'No record found for this NIN'
          };
        }
        for (const v of variations) {
          setCache(`REPORT:NIN:${v}`, parsed, 86400 * 30).catch(() => {});
        }
      } catch (e) {}
      return {
        id: bvnMatch.id,
        rawResponse: bvnMatch.rawResponse,
        ninNumber: variations[0]
      };
    }

  } catch (err) {
    console.error('[findCachedNinReport] Search error:', err.message);
  }

  return null;
}

/**
 * Verify NIN using Prembly API
 */
async function verifyNin(ninNumber) {
  const cleanNin = String(ninNumber || '').trim().replace(/[\s\-]/g, '');
  if (!cleanNin) throw new Error('NIN number is required');

  const lockKey = `NIN:${cleanNin}`;
  let redisLockVal = null;

  // 1. Check in-flight lock (In-Memory)
  if (ninInFlightLocks.has(lockKey)) {
    console.log(`[verifyNin] IN-FLIGHT LOCK HIT for NIN ${cleanNin}. Waiting for active Prembly call to finish...`);
    try {
      await ninInFlightLocks.get(lockKey);
    } catch (e) {}
    const cachedAfterLock = await findCachedNinReport(cleanNin);
    if (cachedAfterLock && cachedAfterLock.rawResponse) {
      try {
        const parsed = JSON.parse(cachedAfterLock.rawResponse);
        if (cachedAfterLock.notFound || parsed.notFound) {
          return {
            success: false,
            notFound: true,
            cached: true,
            message: cachedAfterLock.message || parsed.message || 'No record found for this NIN'
          };
        }
        return {
          success: true,
          data: parsed,
          cached: true
        };
      } catch (e) {}
    }
  }

  // 2. Check Redis Distributed Lock across processes
  redisLockVal = await acquireLock(`LOCK:${lockKey}`, 30000);
  if (!redisLockVal && !ninInFlightLocks.has(lockKey)) {
    console.log(`[verifyNin] REDIS DISTRIBUTED LOCK BUSY for NIN ${cleanNin}. Waiting 1.5s...`);
    await new Promise(r => setTimeout(r, 1500));
    const cachedAfterRedisLock = await findCachedNinReport(cleanNin);
    if (cachedAfterRedisLock && cachedAfterRedisLock.rawResponse) {
      try {
        const parsed = JSON.parse(cachedAfterRedisLock.rawResponse);
        if (cachedAfterRedisLock.notFound || parsed.notFound) {
          return {
            success: false,
            notFound: true,
            cached: true,
            message: cachedAfterRedisLock.message || parsed.message || 'No record found for this NIN'
          };
        }
        return {
          success: true,
          data: parsed,
          cached: true
        };
      } catch (e) {}
    }
  }

  const executeVerification = async () => {
    const existing = await findCachedNinReport(cleanNin);
    if (existing && existing.rawResponse) {
      try {
        const cachedData = JSON.parse(existing.rawResponse);
        if (existing.notFound || cachedData.notFound || existing.status === 'NOT_FOUND') {
          console.log(`[verifyNin] GLOBAL DB/REDIS Cache HIT (NOT FOUND) for NIN ${cleanNin}. Bypassing Prembly API call.`);
          return {
            success: false,
            notFound: true,
            cached: true,
            message: existing.message || cachedData.message || 'No record found for this NIN',
            data: cachedData
          };
        }
        console.log(`[verifyNin] GLOBAL DB/REDIS Cache HIT for NIN ${cleanNin}. Bypassing Prembly API call.`);
        return {
          success: true,
          data: cachedData,
          cached: true
        };
      } catch (e) {
        console.warn(`[verifyNin] Could not parse rawResponse for report ${existing.id}`);
      }
    }

    const settings = await getVerificationSettings();

    if (!settings.ninActive) {
      throw new Error('NIN verification service is not active. Please contact administrator.');
    }

    if (!settings.apiKey) {
      throw new Error('NIN verification service is not configured. Please contact administrator.');
    }

    const headers = {
      'x-api-key': settings.apiKey,
      'Content-Type': 'application/json'
    };

    if (settings.appId) {
      headers['app-id'] = settings.appId;
    }

    const baseUrl = (settings.baseUrl || 'https://api.prembly.com').replace(/\/$/, '');
    const endpoint = baseUrl.includes('verification') ? '/vnin' : '/verification/vnin';
    const fullUrl = `${baseUrl}${endpoint}`;

    console.log('NIN Verification Request:');
    console.log('URL:', fullUrl);
    console.log('Payload sent to prembly (NIN redacted)');

    const response = await axios.post(
      fullUrl,
      {
        number_nin: cleanNin
      },
      {
        headers,
        timeout: 30000 // 30 second timeout
      }
    );

    console.log('--- PREMBLY NIN RESPONSE START ---');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('--- PREMBLY NIN RESPONSE END ---');

    if (response.data && response.data.status === true) {
      const resultData = response.data.data || response.data;
      // Populate Redis Cache
      const variations = getSearchVariations(cleanNin);
      for (const v of variations) {
        setCache(`REPORT:NIN:${v}`, resultData, 86400 * 30).catch(() => {});
      }
      return {
        success: true,
        data: resultData
      };
    } else {
      const errMsg = response.data?.message || 'NIN verification failed';
      const isNotFound = isNotFoundResponse(response.data, errMsg);
      if (isNotFound) {
        console.log(`[verifyNin] Prembly returned NOT_FOUND for NIN ${cleanNin}. Caching NOT_FOUND result.`);
        const variations = getSearchVariations(cleanNin);
        for (const v of variations) {
          setCache(`REPORT:NIN:${v}`, { notFound: true, message: errMsg }, 86400 * 30).catch(() => {});
        }
      }
      return {
        success: false,
        notFound: isNotFound,
        message: errMsg,
        data: response.data
      };
    }
  };

  const verificationPromise = executeVerification();
  ninInFlightLocks.set(lockKey, verificationPromise);

  try {
    return await verificationPromise;
  } catch (error) {
    console.error('NIN Verification Error:', error.response?.data || error.message);

    if (error.response) {
      const errMsg = error.response.data?.message || 'NIN verification failed';
      const isNotFound = error.response.status === 404 || error.response.status === 400 || isNotFoundResponse(error.response.data, errMsg);
      if (isNotFound) {
        console.log(`[verifyNin] Prembly error 404/400 NOT_FOUND for NIN ${cleanNin}. Caching NOT_FOUND result.`);
        const variations = getSearchVariations(cleanNin);
        for (const v of variations) {
          setCache(`REPORT:NIN:${v}`, { notFound: true, message: errMsg }, 86400 * 30).catch(() => {});
        }
      }
      return {
        success: false,
        notFound: isNotFound,
        message: errMsg,
        error: error.response.data
      };
    }

    return {
      success: false,
      message: error.message || 'System error during NIN verification'
    };
  } finally {
    ninInFlightLocks.delete(lockKey);
    if (redisLockVal) {
      await releaseLock(`LOCK:${lockKey}`, redisLockVal).catch(() => {});
    }
  }
}

/**
 * Verify NIN using phone number via Prembly Phone Number Advance API
 */
async function verifyNinByPhone(phoneNumber) {
  const cleanPhone = String(phoneNumber || '').trim().replace(/[\s\-]/g, '');
  if (!cleanPhone) throw new Error('Phone number is required');

  const lockKey = `NIN_PHONE:${cleanPhone}`;
  let redisLockVal = null;

  if (ninInFlightLocks.has(lockKey)) {
    console.log(`[verifyNinByPhone] IN-FLIGHT LOCK HIT for phone ${cleanPhone}. Waiting for active Prembly call to finish...`);
    try {
      await ninInFlightLocks.get(lockKey);
    } catch (e) {}
    const cachedAfterLock = await findCachedNinReport(cleanPhone);
    if (cachedAfterLock && cachedAfterLock.rawResponse) {
      try {
        const parsed = JSON.parse(cachedAfterLock.rawResponse);
        if (cachedAfterLock.notFound || parsed.notFound) {
          return {
            success: false,
            notFound: true,
            cached: true,
            message: cachedAfterLock.message || parsed.message || 'No record found for this phone number'
          };
        }
        return {
          success: true,
          data: parsed,
          cached: true
        };
      } catch (e) {}
    }
  }

  redisLockVal = await acquireLock(`LOCK:${lockKey}`, 30000);
  if (!redisLockVal && !ninInFlightLocks.has(lockKey)) {
    console.log(`[verifyNinByPhone] REDIS DISTRIBUTED LOCK BUSY for phone ${cleanPhone}. Waiting 1.5s...`);
    await new Promise(r => setTimeout(r, 1500));
    const cachedAfterRedisLock = await findCachedNinReport(cleanPhone);
    if (cachedAfterRedisLock && cachedAfterRedisLock.rawResponse) {
      try {
        const parsed = JSON.parse(cachedAfterRedisLock.rawResponse);
        if (cachedAfterRedisLock.notFound || parsed.notFound) {
          return {
            success: false,
            notFound: true,
            cached: true,
            message: cachedAfterRedisLock.message || parsed.message || 'No record found for this phone number'
          };
        }
        return {
          success: true,
          data: parsed,
          cached: true
        };
      } catch (e) {}
    }
  }

  const executeVerification = async () => {
    const existing = await findCachedNinReport(cleanPhone);
    if (existing && existing.rawResponse) {
      try {
        const cachedData = JSON.parse(existing.rawResponse);
        if (existing.notFound || cachedData.notFound || existing.status === 'NOT_FOUND') {
          console.log(`[verifyNinByPhone] GLOBAL DB/REDIS Cache HIT (NOT FOUND) for phone ${cleanPhone}. Bypassing Prembly API call.`);
          return {
            success: false,
            notFound: true,
            cached: true,
            message: existing.message || cachedData.message || 'No record found for this phone number',
            data: cachedData
          };
        }
        console.log(`[verifyNinByPhone] GLOBAL DB/REDIS Cache HIT for phone ${cleanPhone}. Bypassing Prembly API call.`);
        return {
          success: true,
          data: cachedData,
          cached: true
        };
      } catch (e) {
        console.warn(`[verifyNinByPhone] Could not parse rawResponse for report ${existing.id}`);
      }
    }

    const settings = await getVerificationSettings();

    if (!settings.ninActive) {
      throw new Error('NIN verification service is not active. Please contact administrator.');
    }

    if (!settings.apiKey) {
      throw new Error('NIN verification service is not configured. Please contact administrator.');
    }

    const headers = {
      'x-api-key': settings.apiKey,
      'Content-Type': 'application/json'
    };

    if (settings.appId) {
      headers['app-id'] = settings.appId;
    }

    const fullUrl = 'https://api.prembly.com/verification/phone_number/advance';

    console.log('NIN by Phone Verification Request:');
    console.log('URL:', fullUrl);

    const response = await axios.post(
      fullUrl,
      { number: cleanPhone },
      { headers, timeout: 30000 }
    );

    console.log('--- PREMBLY PHONE NIN RESPONSE START ---');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('--- PREMBLY PHONE NIN RESPONSE END ---');

    if (response.data && response.data.status === true) {
      const resultData = response.data.data || response.data;
      // Populate Redis Cache
      const variations = getSearchVariations(cleanPhone);
      for (const v of variations) {
        setCache(`REPORT:NIN:${v}`, resultData, 86400 * 30).catch(() => {});
      }
      return {
        success: true,
        data: resultData
      };
    } else {
      const errMsg = response.data?.message || 'Phone number verification failed';
      const isNotFound = isNotFoundResponse(response.data, errMsg);
      if (isNotFound) {
        console.log(`[verifyNinByPhone] Prembly returned NOT_FOUND for phone ${cleanPhone}. Caching NOT_FOUND result.`);
        const variations = getSearchVariations(cleanPhone);
        for (const v of variations) {
          setCache(`REPORT:NIN:${v}`, { notFound: true, message: errMsg }, 86400 * 30).catch(() => {});
        }
      }
      return {
        success: false,
        notFound: isNotFound,
        message: errMsg,
        data: response.data
      };
    }
  };

  const verificationPromise = executeVerification();
  ninInFlightLocks.set(lockKey, verificationPromise);

  try {
    return await verificationPromise;
  } catch (error) {
    console.error('NIN by Phone Verification Error:', error.response?.data || error.message);

    if (error.response) {
      const errMsg = error.response.data?.message || 'Phone number verification failed';
      const isNotFound = error.response.status === 404 || error.response.status === 400 || isNotFoundResponse(error.response.data, errMsg);
      if (isNotFound) {
        console.log(`[verifyNinByPhone] Prembly error 404/400 NOT_FOUND for phone ${cleanPhone}. Caching NOT_FOUND result.`);
        const variations = getSearchVariations(cleanPhone);
        for (const v of variations) {
          setCache(`REPORT:NIN:${v}`, { notFound: true, message: errMsg }, 86400 * 30).catch(() => {});
        }
      }
      return {
        success: false,
        notFound: isNotFound,
        message: errMsg,
        error: error.response.data
      };
    }

    return {
      success: false,
      message: error.message || 'System error during phone verification'
    };
  } finally {
    ninInFlightLocks.delete(lockKey);
    if (redisLockVal) {
      await releaseLock(`LOCK:${lockKey}`, redisLockVal).catch(() => {});
    }
  }
}

/**
 * Store NOT_FOUND NIN report in database so non-existent searches persist long-term
 */
async function storeNinNotFoundReport(userId, transactionRef, ninNumber, slipType, message) {
  try {
    const cleanNin = String(ninNumber || '').trim();
    let validUserId = userId;
    if (!validUserId) {
      const firstUser = await prisma.user.findFirst({ select: { id: true } });
      validUserId = firstUser?.id;
    }
    if (!validUserId) return null;
    const report = await prisma.ninReport.create({
      data: {
        userId: validUserId,
        transactionRef: transactionRef || `NOTFOUND-NIN-${cleanNin}-${Date.now()}`,
        ninNumber: cleanNin,
        slipType: slipType || 'regular',
        status: 'NOT_FOUND',
        rawResponse: JSON.stringify({ notFound: true, message: message || 'No record found for this NIN' }),
        updatedAt: new Date()
      }
    });
    return report;
  } catch (error) {
    console.error('[storeNinNotFoundReport] Error:', error.message);
    return null;
  }
}

/**
 * Store NIN report in database
 */
async function storeNinReport(userId, transactionRef, ninNumber, slipType, verificationData) {
  try {
    const report = await prisma.ninReport.create({
      data: {
        userId,
        transactionRef,
        ninNumber,
        slipType,
        trackingId: verificationData.trackingId || verificationData.tracking_id,
        firstName: verificationData.firstName || verificationData.first_name || verificationData.firstname,
        middleName: verificationData.middleName || verificationData.middle_name || verificationData.middlename,
        surname: verificationData.surname || verificationData.last_name || verificationData.lastname,
        dateOfBirth: verificationData.dateOfBirth || verificationData.date_of_birth || verificationData.birthdate || verificationData.dob || verificationData.birth_date || verificationData.birthDate,
        gender: verificationData.gender,
        residenceAddress: verificationData.residenceAddress || verificationData.residence_address || verificationData.address,
        residenceLga: verificationData.residenceLga || verificationData.residence_lga || verificationData.lga,
        residenceState: verificationData.residenceState || verificationData.residence_state || verificationData.state,
        base64Photo: verificationData.base64Photo || verificationData.base64_photo || verificationData.photo || verificationData.image,
        rawResponse: JSON.stringify(verificationData),
        status: 'verified',
        updatedAt: new Date()
      }
    });

    return report;
  } catch (error) {
    console.error('Store NIN Report Error:', error);
    throw error;
  }
}

/**
 * Generate QR Code as Data URL
 */
async function generateQRCode(data, options = {}) {
  try {
    const qrDataUrl = await QRCode.toDataURL(data, {
      width: options.width || 200,
      margin: options.margin || 1,
      errorCorrectionLevel: options.errorCorrectionLevel || 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrDataUrl;
  } catch (err) {
    console.error('QR Code generation error:', err);
    return null;
  }
}

/**
 * Generate NIN slip HTML based on slip type
 */
async function generateNinSlipHtml(reportData, slipType) {
  const ninFormatted = reportData.ninNumber
    ? `${reportData.ninNumber.substr(0, 4)} ${reportData.ninNumber.substr(4, 4)} ${reportData.ninNumber.substr(8)}`
    : '';

  const fullName = `${reportData.firstName || ''} ${reportData.middleName || ''} ${reportData.surname || ''}`.trim();

  // Generate QR code for standard and premium slips
  let qrCodeDataUrl = null;
  if (slipType === 'standard' || slipType === 'premium') {
    const qrData = `Fullname: ${fullName} | NIN: ${reportData.ninNumber}`;
    qrCodeDataUrl = await generateQRCode(qrData);
  }

  if (slipType === 'regular') {
    return generateRegularSlipHtml(reportData, ninFormatted, fullName);
  } else if (slipType === 'standard') {
    return generateStandardSlipHtml(reportData, ninFormatted, fullName, qrCodeDataUrl);
  } else if (slipType === 'premium') {
    return generatePremiumSlipHtml(reportData, ninFormatted, fullName, qrCodeDataUrl);
  } else if (slipType === 'vnin') {
    return generateVninSlipHtml(reportData, ninFormatted, fullName);
  }

  throw new Error('Invalid slip type');
}

/**
 * Load image as base64 data URL
 */
function loadImageAsBase64(imagePath) {
  try {
    // All paths are derived entirely from __dirname literals — no user input
    // reaches the filesystem. A switch statement makes this explicit to both
    // humans and static analysers.
    const base = path.normalize(path.join(__dirname, '../slip-assets'));
    let safePath;
    switch (imagePath) {
      case 'id-header-nimc-slip.jpg': safePath = path.join(base, 'id-header-nimc-slip.jpg'); break;
      case 'cloud-icon.jpg':          safePath = path.join(base, 'cloud-icon.jpg');          break;
      case 'internet-icon.jpeg':      safePath = path.join(base, 'internet-icon.jpeg');      break;
      case 'call-icon.png':           safePath = path.join(base, 'call-icon.png');           break;
      case 'save-icon.png':           safePath = path.join(base, 'save-icon.png');           break;
      case 'coat-of-arm.png':         safePath = path.join(base, 'coat-of-arm.png');         break;
      case 'id-back-solo.jpg':        safePath = path.join(base, 'id-back-solo.jpg');        break;
      case 'id-bkg-solo.jpg':         safePath = path.join(base, 'id-bkg-solo.jpg');         break;
      case 'id-header-premium.png':   safePath = path.join(base, 'id-header-premium.png');   break;
      case 'id-back-premium.jpg':     safePath = path.join(base, 'id-back-premium.jpg');     break;
      case 'id-bkg-premium.png':      safePath = path.join(base, 'id-bkg-premium.png');     break;
      case 'nimc.png':                safePath = path.join(base, 'nimc.png');                break;
      default: return ''; // Unknown key — reject immediately
    }
    if (fsSync.existsSync(safePath)) {
      const data = fsSync.readFileSync(safePath);
      const ext = path.extname(safePath).toLowerCase().replace('.', '');
      const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : 'image/jpeg';
      return `data:${mimeType};base64,${data.toString('base64')}`;
    }
  } catch (e) {
    console.error('Failed to load image:', imagePath, e.message);
  }
  return '';
}

/**
 * Load font as base64 data URL
 */
function loadFontAsBase64(fontName) {
  try {
    const base = path.normalize(path.join(__dirname, '../slip-assets/fonts'));
    let safePath;
    switch (fontName) {
      case 'roboto-latin-400-normal.woff2': safePath = path.join(base, 'roboto-latin-400-normal.woff2'); break;
      case 'roboto-latin-700-normal.woff2': safePath = path.join(base, 'roboto-latin-700-normal.woff2'); break;
      case 'roboto-latin-900-normal.woff2': safePath = path.join(base, 'roboto-latin-900-normal.woff2'); break;
      default: return '';
    }
    if (fsSync.existsSync(safePath)) {
      const data = fsSync.readFileSync(safePath);
      return `data:font/woff2;charset=utf-8;base64,${data.toString('base64')}`;
    }
  } catch (e) {
    console.error('Failed to load font:', fontName, e.message);
  }
  return '';
}

/**
 * Generate Regular NIN Slip HTML (Exact V3 NIMC Table Style)
 */
function generateRegularSlipHtml(reportData, ninFormatted, fullName) {
  const headerImg = escapeHtml(loadImageAsBase64('id-header-nimc-slip.jpg'));
  const cloudIcon = escapeHtml(loadImageAsBase64('cloud-icon.jpg'));
  const internetIcon = escapeHtml(loadImageAsBase64('internet-icon.jpeg'));
  const callIcon = escapeHtml(loadImageAsBase64('call-icon.png'));
  const saveIcon = escapeHtml(loadImageAsBase64('save-icon.png'));

  const rawPhotoSrc = reportData.base64Photo
    ? (reportData.base64Photo.startsWith('data') ? reportData.base64Photo : `data:image/png;base64,${reportData.base64Photo}`)
    : '';
  const photoSrc = escapeHtml(rawPhotoSrc);

  const nin = escapeHtml(reportData.ninNumber || '');
  const trackingId = escapeHtml(reportData.trackingId || '');
  const surname = escapeHtml(reportData.surname || '');
  const firstName = escapeHtml(reportData.firstName || '');
  const middleName = escapeHtml(reportData.middleName || '');
  const residenceAddress = escapeHtml(reportData.residenceAddress || '');
  const residenceLga = escapeHtml(reportData.residenceLga || '');
  const residenceState = escapeHtml(reportData.residenceState || '');
  const gender = escapeHtml(reportData.gender || '');

  return safeHTML`<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Regular Slip</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; background: #fff; margin: 0; padding: 20px; }
    .my-5 { margin-top: 3rem; margin-bottom: 3rem; }
    .text-black { color: #000; }
    table { border-collapse: collapse !important; font-family: Arial, Helvetica, sans-serif; }
    th, td { border: 2px solid #000000; padding: 3px 5px; font-size: 13px; }
    .border-right-thick { border-right: solid #000000 1px !important; }
    .border-left-thick { border-left: solid #000000 1px !important; }
    .border-top-thick { border-top: solid #000000 1px !important; }
    .border-bottom-thick { border-bottom: solid #000000 1px !important; }
    .border-right-none { border-right: none !important; }
    .border-left-none { border-left: none !important; }
    .border-top-none { border-top: none !important; }
    .border-bottom-none { border-bottom: none !important; }
    .border-none { border: none !important; }
    .border-thin { border: solid #000000 1px; }
    .width-100 { width: 100px; }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-bold { font-weight: bold; }
    .rounded { border-radius: 4px; }
    .text-danger { color: #dc3545; }
    .text-success { color: #28a745; }
    h2 { font-size: 1.5rem; }
  </style>
</head>
<body>
  <div class="my-5 text-black">
    <table border="2" class="border-right-thick border-left-thick border-top-thick border-bottom-thick" style="width: 100%;">
      <tr>
        <td colspan="6" class="text-center"><img src="${headerImg}" width="750" height="70"></td>
      </tr>
      <tr>
        <th class="width-100 border-right-none border-top-none">Tracking ID: </th>
        <td class="border-left-none border-top-none border-right-thick">${trackingId}</td>
        <th class="border-top-none border-bottom-none border-left-thick border-right-none" nowrap> Surname: </th>
        <td class="border-left-none border-top-none border-bottom-none">${surname}</td>
        <td rowspan="2" class="border-none"><b>Address:</b> <br> ${residenceAddress}</td>
        <td rowspan="4" class="border-left-none border-bottom-none border-top-none">
          ${photoSrc ? '<img src="' + photoSrc + '" height="150" width="120" class="rounded">' : '<div style="width:120px;height:150px;background:#eee;display:inline-block;"></div>'}
        </td>
      </tr>
      <tr>
        <th class="width-100 border-top-none border-right-none border-bottom-none">NIN: </th>
        <td class="border-none">${nin}</td>
        <th class="border-right-none border-bottom-none" nowrap>First Name:</th>
        <td class="border-left-none border-bottom-none">${firstName}</td>
      </tr>
      <tr>
        <td colspan="2" class="border-bottom-none border-right-none"></td>
        <th class="border-right-none border-bottom-none" nowrap> Middle Name: </th>
        <td class="border-left-none border-bottom-none">${middleName}</td>
        <td class="border-none">${residenceLga}</td>
      </tr>
      <tr>
        <td class="width-100 border-top-none border-right-none border-bottom-none" colspan="2"></td>
        <th class="border-right-none border-bottom-none">Gender:</th>
        <td class="border-left-none border-bottom-none">${gender}</td>
        <td class="border-none">${residenceState}</td>
      </tr>
      <tr>
        <td colspan="6" class="text-black border-bottom-none" style="margin: 5px 1px; font-size: 11px; padding: 5px 1px;">
          <b>Note:</b> The <b>National Identification Number (NIN) is your identity</b>. It is confidential and may only be released for legitimate transactions <br>
          You will be notified when your National Identity Card is ready (For any enquiries, please contact)
        </td>
      </tr>
      <tr>
        <td colspan="6">
          <table border="0" style="width: 100%;">
            <tr>
              <td class="text-center" style="width: 20%; padding: 0px;">
                ${cloudIcon ? '<img src="' + cloudIcon + '" height="40" width="40">' : ''}<br> helpdesk@nimc.gov.ng
              </td>
              <td class="text-center" style="width: 20%; padding: 0px;">
                ${internetIcon ? '<img src="' + internetIcon + '" height="40" width="40">' : ''}<br> www.nimc.gov.ng
              </td>
              <td class="text-center" style="width: 20%; padding: 0px;">
                ${callIcon ? '<img src="' + callIcon + '" height="40" width="40">' : ''}<br> 0700-CALL-NIMC
              </td>
              <td class="text-center" nowrap style="padding: 0px;">
                ${saveIcon ? '<img src="' + saveIcon + '" height="30" width="30">' : ''}<br>
                <b style="font-size: 12px;">National Identity Management Commission</b>
                <p style="font-size: 8px;"> 11 Sokode Crescent, Off Dalaba Street Zone 5, Wuse 900248, Abuja Nigeria </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

/**
 * Generate Standard NIN Slip HTML (Exact V3 ID Card with QR)
 */
function generateStandardSlipHtml(reportData, ninFormatted, fullName, qrCodeDataUrl) {
  const coatOfArm = escapeHtml(loadImageAsBase64('coat-of-arm.png'));
  const idBackSolo = escapeHtml(loadImageAsBase64('id-back-solo.jpg'));   // back of the card image
  const idBkgSolo = escapeHtml(loadImageAsBase64('id-bkg-solo.jpg'));     // front card background pattern

  const rawPhotoSrc = reportData.base64Photo
    ? (reportData.base64Photo.startsWith('data') ? reportData.base64Photo : `data:image/png;base64,${reportData.base64Photo}`)
    : '';
  const photoSrc = escapeHtml(rawPhotoSrc);
  const safeQrCode = escapeHtml(qrCodeDataUrl || '');

  const nin = reportData.ninNumber || '';
  const ninEscaped = escapeHtml(nin);
  const ninP1 = escapeHtml(nin.substr(0, 4));
  const ninP2 = escapeHtml(nin.substr(4, 3));
  const ninP3 = escapeHtml(nin.substr(7));
  const surname = escapeHtml((reportData.surname || '').toUpperCase());
  const firstname = escapeHtml((reportData.firstName || '').toUpperCase());
  const middlename = escapeHtml((reportData.middleName || '').toUpperCase());
  let dobDate = null;
  if (reportData.dateOfBirth) {
    const raw = reportData.dateOfBirth;
    const parts = raw.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        // DD-MM-YYYY format (Prembly API format)
        dobDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      } else if (parts[0].length === 4) {
        // YYYY-MM-DD format
        dobDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      } else {
        dobDate = new Date(raw);
      }
    } else {
      dobDate = new Date(raw);
    }
  }
  const dobStr = dobDate && !isNaN(dobDate.getTime()) ? `${String(dobDate.getDate()).padStart(2, '0')}  ${dobDate.toLocaleString('en-GB', { month: 'short' })} ${dobDate.getFullYear()}`.toUpperCase() : '';
  const dob = escapeHtml(dobStr);

  return safeHTML`<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Standard Slip</title>
  <style>
    body { font-family: Arial, sans-serif; background: #fff; margin: 0; padding: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .text-black { color: #000; }
    table { border-collapse: collapse; }
    td, th { padding-top: 0 !important; padding-bottom: 0 !important; }
    .id-bkg-solo { background-image: url(${idBkgSolo}); background-size: 100% 100%; background-repeat: no-repeat; }
    .txt-info { font-size: 13px; font-weight: 700; }
    .info-title { color: #333535; font-weight: 800; font-size: 10px; height: 12px; display: block; }
    .font-ocrb { font-family: 'OCR B', 'Courier New', monospace; }
    .font-13 { font-size: 13px; }
    .text-bold { font-weight: bold; }
    .nin { font-size: 18px; font-weight: bolder; }
    .nin-watermark { font-size: 12px; font-weight: 400; position: fixed; text-align: center; color: #b0afaf; z-index: 1000; }
    .nin-watermark-1 { transform-origin: center; transform: rotate(180deg); bottom: 210px; left: 280px; }
    .nin-watermark-2 { transform-origin: top left; transform: rotate(320deg); bottom: 80px; left: 50px; }
    .nin-watermark-3 { transform-origin: top left; transform: rotate(310deg); bottom: 45px; left: 50px; }
    .nin-watermark-4 { transform-origin: top right; transform: rotate(50deg); bottom: 40px; left: 290px; }
    .p-0 { padding: 0; }
    .pr-2 { padding-right: 8px; }
    .pr-5 { padding-right: 20px; }
    .pt-3 { padding-top: 12px; }
    .px-1 { padding-left: 4px; padding-right: 4px; }
    .mb-0 { margin-bottom: 0; }
    .mb-1 { margin-bottom: 4px; }
    .pt-2 { padding-top: 8px; }
    .d-flex { display: flex; }
    .flex-column { flex-direction: column; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    h5, h6 { margin: 0; }
    h2 { margin: 0; }
    p { margin: 0; }
  </style>
</head>
<body>
  <div class="text-black">
    <table border="1">
      <tr>
        <td class="id-bkg-solo">
          <table border="0" style="width: 320px; background: none; position: relative;">
            <tr>
              <td colspan="2" class="text-right p-0 px-1 pr-5">
                ${coatOfArm ? '<img src="' + coatOfArm + '" width="60" height="50">' : ''}
              </td>
              <td class="text-center text-black">
                <h6 class="mb-0 pt-2" style="font-weight: bold; font-family: Helvetica, sans-serif; color: rgb(34,34,34);"> NGA </h6>
                <span class="nin-watermark nin-watermark-1">${ninEscaped}</span>
              </td>
            </tr>
            <tr>
              <td rowspan="3" class="p-0 pr-2">
                ${photoSrc ? '<img src="' + photoSrc + '" width="75" height="100">' : '<div style="width:75px;height:100px;background:#ccc;display:inline-block;"></div>'}
              </td>
              <td rowspan="3" class="txt-info p-0" nowrap style="width: 160px !important;">
                <div class="d-flex flex-column">
                  <span class="info-title">Surname/Nom</span>
                  <div class="text-black font-ocrb font-13 py-0 my-0" style="margin-top: 0px !important;">${surname}</div>
                  <span class="info-title pt-0x mt-0x">Given names/Prenoms</span>
                  <div class="text-black font-ocrb text-bold">${firstname}, ${middlename}</div>
                  <span class="info-title">Date of Birth</span>
                  <div class="text-black font-ocrb">${dob}</div>
                </div>
              </td>
              <td rowspan="3" class="text-center p-0">
                ${safeQrCode ? safeHTML`<img src="${safeQrCode}" width="91" height="91" style="width: 90px; height: 90px;">` : ''}
              </td>
            </tr>
            <tr></tr>
            <tr></tr>
            <tr>
              <td colspan="3" class="text-center p-0 m-0" style="font-size: 11px; font-weight: bolder; font-family: Helvetica, Arial, sans-serif;">
                <p class="m-0 p-0 text-black" style="height: 10px;"> National Identification Number (NIN)</p>
                <h2 class="nin p-0 m-0" style="height: 29px;">
                  <span class="text-black font-ocrb" style="padding: 0px 5px;">
                    ${ninP1} ${ninP2} ${ninP3}
                  </span>
                </h2>
                <p class="mb-1" style="font-style: italic; font-size: 8px; font-weight: normal;"> Kindly ensure you scan the barcode to verify the credentials </p>
                <span class="nin-watermark nin-watermark-2">${ninEscaped}</span>
                <span class="nin-watermark nin-watermark-3">${ninEscaped}</span>
                <span class="nin-watermark nin-watermark-4">${ninEscaped}</span>
              </td>
            </tr>
          </table>
        </td>
        <td style="width: 10px;"></td>
        <td>
          ${idBackSolo ? '<img src="' + idBackSolo + '" width="310" height="192">' : ''}
        </td>
      </tr>
    </table>
    <div style="height: 5px; margin: 10px 0px; border-top: none;"></div>
  </div>
</body>
</html>`;
}

/**
 * Generate Premium NIN Slip HTML (Exact V3 Premium ID Card)
 */
function generatePremiumSlipHtml(reportData, ninFormatted, fullName, qrCodeDataUrl) {
  const premiumHeader = escapeHtml(loadImageAsBase64('id-header-premium.png'));
  const idBackPremium = escapeHtml(loadImageAsBase64('id-back-premium.jpg'));
  const idBkgPremium = escapeHtml(loadImageAsBase64('id-bkg-premium.png'));


  const rawPhotoSrc = reportData.base64Photo
    ? (reportData.base64Photo.startsWith('data') ? reportData.base64Photo : `data:image/png;base64,${reportData.base64Photo}`)
    : '';
  const photoSrc = escapeHtml(rawPhotoSrc);
  const safeQrCode = escapeHtml(qrCodeDataUrl || '');

  const nin = reportData.ninNumber || '';
  const ninEscaped = escapeHtml(nin);
  const ninP1 = escapeHtml(nin.substr(0, 4));
  const ninP2 = escapeHtml(nin.substr(4, 3));
  const ninP3 = escapeHtml(nin.substr(7));
  const surname = escapeHtml((reportData.surname || '').toUpperCase());
  const firstname = escapeHtml((reportData.firstName || '').toUpperCase());
  const middlename = escapeHtml((reportData.middleName || '').toUpperCase());
  let dobDate = null;
  if (reportData.dateOfBirth) {
    const raw = reportData.dateOfBirth;
    const parts = raw.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        // DD-MM-YYYY format (Prembly API format)
        dobDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      } else if (parts[0].length === 4) {
        // YYYY-MM-DD format
        dobDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      } else {
        dobDate = new Date(raw);
      }
    } else {
      dobDate = new Date(raw);
    }
  }
  const dobStr = dobDate && !isNaN(dobDate.getTime()) ? `${String(dobDate.getDate()).padStart(2, '0')}  ${dobDate.toLocaleString('en-GB', { month: 'short' })} ${dobDate.getFullYear()}`.toUpperCase() : '';
  const dob = escapeHtml(dobStr);
  const gender = escapeHtml((reportData.gender || '').toUpperCase());
  const issueD = reportData.createdAt ? new Date(reportData.createdAt) : new Date();
  const issueDate = escapeHtml(`${String(issueD.getDate()).padStart(2, '0')}  ${issueD.toLocaleString('en-GB', { month: 'short' })} ${issueD.getFullYear()}`.toUpperCase());

  return safeHTML`<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Premium Slip</title>
  <style>
    body { font-family: Arial, sans-serif; background: #fff; margin: 0; padding: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .text-black { color: #000; }
    table { border-collapse: collapse; }
    .id-bkg-premium { background-image: url(${idBkgPremium}); background-size: 100% 100%; background-repeat: no-repeat; background-position: center; }
    .txt-info { font-size: 11px; }
    .info-title { color: #8d8f8f; display: block; font-size: 9px; }
    .font-ocrb { font-family: 'OCR B', 'Courier New', monospace; }
    .data-info { font-size: 13px; font-weight: bold; }
    .nin { font-size: 1.5rem; font-weight: bold; }
    .p-0 { padding: 0; }
    .pr-2 { padding-right: 8px; }
    .pt-3 { padding-top: 12px; }
    .px-1 { padding-left: 4px; padding-right: 4px; }
    .pl-4 { padding-left: 16px; }
    .mb-1 { margin-bottom: 4px; }
    .mb-2 { margin-bottom: 8px; }
    .mb-3 { margin-bottom: 12px; }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .rounded { border-radius: 4px; }
    h5 { margin: 0; font-size: 1rem; }
    h2 { margin: 0; }
    p { margin: 0; }
  </style>
</head>
<body>
  <div class="text-black">
    <table border="1">
      <tr>
        <td class="id-bkg-premium">
          <table border="0" style="width: 320px; background: none;">
            <tr>
              <td colspan="2" class="text-left p-0 px-1 pt-3 pl-4">
                ${premiumHeader ? '<img src="' + premiumHeader + '" width="220" height="27" class="mb-1">' : ''}
              </td>
              <td rowspan="3" class="p-0 pr-2 pt-3">
                ${safeQrCode ? safeHTML`<img src="${safeQrCode}" width="101" height="101" style="width: 100px; height: 100px;">` : ''}
                <h5 class="text-center m-0 p-0" style="font-weight: bold; color: #000;"> NGA </h5>
              </td>
            </tr>
            <tr>
              <td rowspan="3" class="p-0 pr-2">
                ${photoSrc ? '<img src="' + photoSrc + '" width="90" height="120" class="mb-3 rounded">' : '<div style="width:90px;height:120px;background:#555;display:inline-block;border-radius:4px;"></div>'}
              </td>
              <td class="txt-info p-0" nowrap style="width: 160px !important; color: #000;">
                <span class="info-title">SURNAME/NOM</span><br>
                <span class="font-ocrb data-info" style="color:#000;">${surname}</span>
              </td>
            </tr>
            <tr class="txt-info">
              <td class="p-0" nowrap style="width: 160px; color: #000;">
                <span class="info-title">GIVEN NAMES/PRENOMS</span><br>
                <span class="font-ocrb data-info" style="color:#000;">${firstname}, ${middlename}</span>
              </td>
            </tr>
            <tr class="txt-info">
              <td class="p-0" nowrap style="color: #000;">
                <span class="info-title">DATE OF BIRTH &nbsp; SEX/SEXE</span><br>
                <span class="font-ocrb data-info" style="color:#000;">${dob} ${gender}</span>
              </td>
              <td class="text-center font-ocrb" style="color: #000;">
                <span style="font-size: 13px;"> ISSUE DATE <br> ${issueDate}</span>
              </td>
            </tr>
            <tr>
              <td colspan="3" class="text-center p-0 m-0" style="font-size: 17px; font-weight: bold; color: #000;">
                <p class="m-0 p-0" style="height: 20px;"> National Identification Number (NIN)</p>
                <h2 class="nin p-0 m-0 mb-2" style="height: 27px;">
                  <span class="font-ocrb" style="padding: 0px 5px; color: #000;">
                    ${ninP1} ${ninP2} ${ninP3}
                  </span>
                </h2>
              </td>
            </tr>
          </table>
        </td>
        <td style="width: 10px;"></td>
        <td class="id-bkg-premium" style="background: none;">
          ${idBackPremium ? '<img src="' + idBackPremium + '" width="330" height="190">' : ''}
        </td>
      </tr>
    </table>
    <div style="height: 5px; margin: 10px 0px; border-top: none;"></div>
  </div>
</body>
</html>`;
}

/**
 * Generate VNIN Slip HTML (Verification-as-a-Service Style)
 */
async function generateVninSlipHtml(reportData, ninFormatted, fullName) {
  // Assets
  const templateBase64 = escapeHtml(loadImageAsBase64('nimc.png'));

  // Only use photo if it's large enough to be a real face photo.
  // The NIMC API returns a tiny solid-green PNG placeholder (~few hundred bytes)
  // for NINs without a real photo. Real photos are always > 10,000 base64 chars.
  const isRealPhoto = reportData.base64Photo && reportData.base64Photo.replace(/\s/g, '').length > 10000;
  const rawPhotoSrc = isRealPhoto
    ? (reportData.base64Photo.startsWith('data') ? reportData.base64Photo : `data:image/png;base64,${reportData.base64Photo}`)
    : '';
  const photoSrc = escapeHtml(rawPhotoSrc);

  // Robust DOB parsing
  let dob = '';
  if (reportData.dateOfBirth) {
    let dobDate = new Date(reportData.dateOfBirth);
    
    // If invalid, try parsing DD-MM-YYYY or DD/MM/YYYY
    if (isNaN(dobDate.getTime())) {
      const parts = reportData.dateOfBirth.split(/[-/]/);
      if (parts.length === 3) {
        // Assume DD-MM-YYYY or DD/MM/YYYY
        if (parts[2].length === 4) {
          dobDate = new Date(parts[2], parts[1] - 1, parts[0]);
        } 
        // Assume YYYY-MM-DD
        else if (parts[0].length === 4) {
          dobDate = new Date(parts[0], parts[1] - 1, parts[2]);
        }
      }
    }

    if (!isNaN(dobDate.getTime())) {
      const day = String(dobDate.getDate()).padStart(2, '0');
      const month = dobDate.toLocaleString('en-GB', { month: 'short' }).toUpperCase();
      const year = dobDate.getFullYear();
      dob = escapeHtml(`${day} ${month} ${year}`);
    }
  }

  // Generate main QR (with standard density padding)
  const qrBlob = JSON.stringify({
    ref: reportData.transactionRef,
    nin: ninFormatted || '',
    surname: reportData.surname || '',
    firstName: reportData.firstName || '',
    middleName: reportData.middleName || '',
    dob: reportData.dateOfBirth || '',
    gender: reportData.gender || '',
    address: reportData.residenceAddress || '',
    lga: reportData.residenceLga || '',
    state: reportData.residenceState || '',
    trackingId: reportData.trackingId || ''
  });

  const qrCodeDataUrl = await generateQRCode(qrBlob, {
    width: 600, errorCorrectionLevel: 'M'
  });
  const safeQrCode = escapeHtml(qrCodeDataUrl || '');
  
  // Format timestamp with dashes: DD-MM-YYYY HH:mm:ss
  const now = reportData.createdAt ? new Date(reportData.createdAt) : new Date();
  const timestampStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const timestamp = escapeHtml(timestampStr);
  
  const agentId = escapeHtml(reportData.agentId || '');
  const transactionRef = escapeHtml(reportData.transactionRef || '');
  const surname = escapeHtml((reportData.surname || '').toUpperCase());
  const firstName = escapeHtml((reportData.firstName || '').toUpperCase());
  const middleName = escapeHtml((reportData.middleName || '').toUpperCase());

  return safeHTML`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>VNIN Verification Report</title>
  <style>
    @font-face {
      font-family: 'Roboto';
      font-style: normal;
      font-weight: 400;
      src: url('${escapeHtml(loadFontAsBase64('roboto-latin-400-normal.woff2'))}') format('woff2');
    }
    @font-face {
      font-family: 'Roboto';
      font-style: normal;
      font-weight: 700;
      src: url('${escapeHtml(loadFontAsBase64('roboto-latin-700-normal.woff2'))}') format('woff2');
    }
    @font-face {
      font-family: 'Roboto';
      font-style: normal;
      font-weight: 900;
      src: url('${escapeHtml(loadFontAsBase64('roboto-latin-900-normal.woff2'))}') format('woff2');
    }
    
    @page { size: A4; margin: 0; }
    body { 
      font-family: "Roboto", sans-serif !important;
      font-optical-sizing: auto;
      font-style: normal;
      font-variation-settings: "wdth" 100;
      margin: 0; 
      padding: 0; 
      background: #fff;
    }
    .wrapper { 
      width: 210mm; 
      height: 297mm; 
      position: relative; 
      overflow: hidden;
      background: #fff;
    }
    
    /* Background Template */
    .bg-template {
      position: absolute;
      top: 0; 
      left: 0; 
      width: 100%; 
      height: auto;
      z-index: 1;
    }

    /* Content Layer overlay */
    .content-layer {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      z-index: 10;
    }
    
    /* Photo Overlay */
    .m-photo {
      position: absolute;
      top: 72mm; 
      left: 19mm;
      width: 14mm;
      height: 18mm;
      object-fit: cover;
      background: #bbb;
      border-radius: 1px;
    }

    /* Mini-Card Details */
    .m-txt-surname {
      position: absolute;
      top: 76mm; 
      left: 34mm;
      font-size: 5pt;
      font-weight: 700;
      color: #000;
    }
    .m-txt-given {
      position: absolute;
      top: 82mm; 
      left: 34mm;
      font-size: 5pt;
      font-weight: 700;
      color: #000;
      width: 40mm;
      line-height: 1;
    }
    .m-txt-dob {
      position: absolute;
      top: 89mm; 
      left: 34mm;
      font-size: 5pt;
      font-weight: 700;
      color: #000;
    }

    /* Center Text Details */
    .d-val-surname {
      position: absolute;
      top: 72.5mm;
      left: 78mm;
      font-size: 12pt;
      color: #000;
      font-weight: 900;
    }
    .d-val-given {
      position: absolute;
      top: 84mm;
      left: 78mm;
      font-size: 12pt;
      color: #000;
      font-weight: 900;
      width: 70mm;
      line-height: 1.1;
    }
    
    /* Mini QR on Card */
    .mini-qr {
      position: absolute;
      top: 74mm;
      left: 58mm;
      width: 14mm;
      height: 14mm;
    }
    /* Main QR - Hidden by request */
    .main-qr {
      display: none;
    }
    
    /* Table Overlay Data */
    .t-row {
      position: absolute;
      top: 107.5mm;
      left: 12mm;
      width: 186mm;
      height: 10mm;
      display: flex;
      align-items: center;
      font-size: 8pt;
      font-weight: 100;
      color: #000;
      font-family: "Roboto", 'Consolas', 'Courier New', monospace !important;
    }
    .t-cell {
      text-align: center;
      white-space: nowrap;
    }
    .t-time { width: 33mm; padding-left:2mm; font-size:7pt;}
    .t-ref { width: 62mm; font-size: 6.5pt; text-transform: lowercase; }
    .t-type { width: 28mm; font-size: 6.5pt; letter-spacing: 0.5px;}
    .t-status { width: 25mm; font-size: 7.5pt; }
    .t-agent { width: 38mm; font-size: 8pt;} 

  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Master Background Template -->
    ${templateBase64 ? '<img src="' + templateBase64 + '" class="bg-template">' : ''}
    
    <div class="content-layer">
      
      <!-- Mini ID Card Overlays -->
      ${photoSrc ? '<img src="' + photoSrc + '" class="m-photo">' : '<div class="m-photo"></div>'}
      <div class="m-txt-surname">${surname}</div>
      <div class="m-txt-given">${firstName} ${middleName}</div>
      <div class="m-txt-dob">${dob}</div>
      
      <!-- Center Text Overlays -->
      <div class="d-val-surname">${surname}</div>
      <div class="d-val-given">${firstName} ${middleName}</div>
      
      <!-- Main QR Code Overlay -->
      <img src="${safeQrCode}" class="main-qr">
      <img src="${safeQrCode}" class="mini-qr">
      
      <!-- Table Data Overlay (Bottom Row) -->
      <div class="t-row">
        <div class="t-cell t-time">${timestamp}</div>
        <div class="t-cell t-ref">${transactionRef}</div>
        <div class="t-cell t-type"></div>
        <div class="t-cell t-status"></div>
        <div class="t-cell t-agent">${agentId}</div>
      </div>

    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate PDF from NIN report
 */
async function generateNinPdf(reportData, slipType) {
  try {
    // Resolve upload dir from __dirname literals only — no user input ever
    // reaches the filesystem. switch makes this provable to static analysers.
    const baseUploadsDir = path.normalize(path.join(__dirname, '../../uploads/slips/nin'));
    let safeUploadsDir;
    switch (slipType) {
      case 'regular':  safeUploadsDir = path.join(baseUploadsDir, 'regular');  break;
      case 'standard': safeUploadsDir = path.join(baseUploadsDir, 'standard'); break;
      case 'premium':  safeUploadsDir = path.join(baseUploadsDir, 'premium');  break;
      case 'vnin':     safeUploadsDir = path.join(baseUploadsDir, 'vnin');     break;
      default: throw new Error('Invalid slip type');
    }
    await fs.mkdir(safeUploadsDir, { recursive: true });

    // Generate HTML
    const html = await generateNinSlipHtml(reportData, slipType);

    // Generate PDF filename — use only a UUID, never user input
    const pdfFilename = `${crypto.randomUUID()}.pdf`;
    const safePdfPath = path.join(safeUploadsDir, pdfFilename);

    const chromePath = getChromePath();

    if (chromePath) {
      browser = await puppeteer.launch({
        executablePath: chromePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: 'new'
      });
    } else {
      // Fallback to bundled puppeteer browser if no path exists
      browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: 'new'
      });
    }

    let pdfBuffer;
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        printBackground: true
      });
    } finally {
      await browser.close();
    }

    // Save PDF — pdfFilename is a UUID, safeUploadsDir is from a switch literal above
    await fs.writeFile(path.join(safeUploadsDir, pdfFilename), pdfBuffer);

    // Prefix with /api so Vercel proxies it to the backend server
    const pdfUrl = `/api/uploads/slips/nin/${slipType}/${pdfFilename}`;

    // Update report with PDF URL
    await prisma.ninReport.update({
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
 * Complete NIN verification process
 * @param {string} lookupMethod - 'nin' (default) or 'phone'
 * @param {string} lookupValue - NIN number or phone number depending on method
 */
async function processNinVerification(userId, ninNumber, slipType, transactionRef, userType = 1, lookupMethod = 'nin') {
  try {
    // 1. Verify NIN with Prembly (by NIN or by phone number)
    const verificationResult = lookupMethod === 'phone'
      ? await verifyNinByPhone(ninNumber)
      : await verifyNin(ninNumber);

    if (!verificationResult.success) {
      if (verificationResult.notFound) {
        const cleanNin = String(ninNumber || '').trim().replace(/[\s\-]/g, '');
        const existingDb = await prisma.ninReport.findFirst({
          where: { ninNumber: cleanNin }
        });
        if (!existingDb) {
          await storeNinNotFoundReport(userId, transactionRef, ninNumber, slipType, verificationResult.message);
        }
      }
      return {
        success: false,
        notFound: verificationResult.notFound,
        message: verificationResult.message || 'NIN verification failed'
      };
    }

    // 2. Extract actual NIN from result (especially important for phone lookup)
    const actualNin = lookupMethod === 'phone' 
      ? (verificationResult.data?.nin || verificationResult.data?.number || ninNumber)
      : ninNumber;

    // 3. Store report in database
    const report = await storeNinReport(userId, transactionRef, actualNin, slipType, verificationResult.data);

    // 4. Generate PDF slip
    const pdfUrl = await generateNinPdf(report, slipType);

    // 5. Return success with report details
    const { rawResponse, ...safeReport } = report;
    safeReport.pdfUrl = pdfUrl;
    return {
      success: true,
      message: 'NIN verified successfully',
      report: safeReport
    };

  } catch (error) {
    console.error('Process NIN Verification Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to process NIN verification'
    };
  }
}

module.exports = {
  getVerificationSettings,
  getNinPricing,
  findCachedNinReport,
  verifyNin,
  verifyNinByPhone,
  storeNinReport,
  storeNinNotFoundReport,
  generateQRCode,
  generateNinSlipHtml,
  generateVninSlipHtml,
  generateNinPdf,
  processNinVerification
};
