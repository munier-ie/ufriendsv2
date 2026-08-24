const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    }
});

/**
 * Generic send email function.
 * NOTE: Errors are swallowed here by design so non-critical emails
 * (welcome, alerts) never crash the calling flow.
 * Use sendEmailStrict() when the caller needs to know about failures.
 */
async function sendEmail(to, subject, html) {
    if (!process.env.SMTP_USER || process.env.SMTP_STATUS === 'Off') {
        console.log('Email sending disabled or not configured');
        return;
    }

    try {
        const settingsService = require('./settings.service');
        const siteName = await settingsService.getSetting('siteName', 'Ufriends');
        const siteEmail = await settingsService.getSetting('siteEmail', 'info@ufriends.com.ng');

        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"Ufriends Support" <info@ufriends.com.ng>',
            to,
            subject,
            html,
        });
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

/**
 * Strict send email — throws on any failure.
 * Use for transactional emails where the caller must know if delivery failed.
 */
async function sendEmailStrict(to, subject, html) {
    if (!process.env.SMTP_USER || process.env.SMTP_STATUS === 'Off') {
        throw new Error('EMAIL_NOT_CONFIGURED');
    }

    const settingsService = require('./settings.service');
    const siteName = await settingsService.getSetting('siteName', 'Ufriends');
    const siteEmail = await settingsService.getSetting('siteEmail', 'info@ufriends.com.ng');

    const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Ufriends Support" <info@ufriends.com.ng>',
        to,
        subject,
        html,
    });

    console.log('Password reset email sent: %s', info.messageId);
    return info;
}

/**
 * Send Welcome Email
 */
async function sendWelcomeEmail(user) {
    const subject = 'Welcome to Ufriends!';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e8f0; border-radius: 12px; padding: 0; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #004687; padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Welcome to Ufriends!</h1>
            </div>
            <div style="padding: 30px;">
                <h2 style="color: #004687; margin-top: 0;">Hello ${user.firstName},</h2>
            <p>We are excited to have you on board. Your account has been successfully created.</p>
            <p>You can now log in and start enjoying our services:</p>
            <ul>
                <li>Buy Internet Data & Airtime</li>
                <li>Pay Electricity & Cable TV Bills (DStv, GOtv, Startimes)</li>
                <li>Purchase Educational PINs (WAEC, NECO, NABTEB)</li>
                <li>Access Government Services (CAC, NIN, BVN)</li>
                <li>Convert Airtime to Cash</li>
                <li>Developer API Access (Vendors only)</li>
            </ul>
            <p>If you have any questions, feel free to contact our support team.</p>
            <br>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #004687, #1E90FF); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">
                    Login Into Your Account
                </a>
            </div>
            <br>
                <p>Best regards,<br>The Ufriends Team</p>
            </div>
            <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b;">
                &copy; ${new Date().getFullYear()} Ufriends. All rights reserved.
            </div>
        </div>
    `;
    return sendEmail(user.email, subject, html);
}

const axios = require('axios');

function isPrivateIp(ip) {
    if (!ip) return true;
    const cleanIp = ip.replace(/^::ffff:/, '');
    if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'localhost') return true;
    if (cleanIp.startsWith('10.') || cleanIp.startsWith('192.168.') || cleanIp.startsWith('fc00:') || cleanIp.startsWith('fe80:')) return true;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanIp)) return true;
    return false;
}

function parseDevice(userAgent) {
    if (!userAgent || typeof userAgent !== 'string') return 'Unknown Device';
    
    // Check for Mobile App (Flutter/Dart or custom app headers)
    if (userAgent.includes('Dart') || userAgent.includes('Flutter') || userAgent.includes('UfriendsMobile') || userAgent.includes('MobileApp')) {
        if (userAgent.includes('Android') || userAgent.includes('android')) return 'Ufriends Mobile App (Android)';
        if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'Ufriends Mobile App (iOS)';
        return 'Ufriends Mobile App';
    }

    let os = 'Unknown OS';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('iOS')) os = 'iOS';
    else if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';

    let browser = 'Unknown Browser';
    if (userAgent.includes('Edg/')) browser = 'Edge';
    else if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) browser = 'Chrome';
    else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) browser = 'Safari';
    else if (userAgent.includes('Firefox/')) browser = 'Firefox';
    else if (userAgent.includes('Opera/') || userAgent.includes('OPR/')) browser = 'Opera';

    if (browser !== 'Unknown Browser' && os !== 'Unknown OS') {
        return `${browser} on ${os}`;
    } else if (os !== 'Unknown OS') {
        return os;
    } else if (browser !== 'Unknown Browser') {
        return browser;
    }
    
    return userAgent.length > 50 ? userAgent.substring(0, 47) + '...' : userAgent;
}

function formatNigerianTime(date = new Date()) {
    try {
        const options = {
            timeZone: 'Africa/Lagos',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        };
        return new Intl.DateTimeFormat('en-NG', options).format(date) + ' (WAT)';
    } catch {
        const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
        const watDate = new Date(utc + (3600000 * 1));
        return watDate.toLocaleString() + ' (WAT)';
    }
}

async function resolveLocation(ip, reqHeaders = {}, userState = null) {
    // 1. Check Cloudflare / CDN geo-headers first
    const cfCountry = reqHeaders['cf-ipcountry'];
    const cfCity = reqHeaders['cf-ipcity'];
    if (cfCountry) {
        const countryName = cfCountry === 'NG' ? 'Nigeria' : cfCountry;
        if (cfCity) return `${cfCity}, ${countryName}`;
        if (userState && cfCountry === 'NG') return `${userState}, Nigeria`;
        return countryName;
    }

    // 2. If IP is private / local / missing, fallback to user registered state or Nigeria
    if (!ip || isPrivateIp(ip)) {
        return userState ? `${userState}, Nigeria` : 'Nigeria';
    }

    // 3. Perform fast IP geolocation lookup with 1.5s timeout
    try {
        const cleanIp = ip.replace(/^::ffff:/, '');
        const response = await axios.get(`http://ip-api.com/json/${cleanIp}?fields=status,country,regionName,city`, { timeout: 1500 });
        if (response.data && response.data.status === 'success') {
            const { city, regionName, country } = response.data;
            const parts = [city, regionName || country].filter(Boolean);
            if (parts.length > 0) {
                return parts.join(', ');
            }
        }
    } catch (err) {
        // Silently catch network/timeout errors
    }

    return userState ? `${userState}, Nigeria` : 'Nigeria';
}

/**
 * Send Login Alert
 */
async function sendLoginAlert(user, reqOrMeta) {
    let rawUserAgent = '';
    let ip = null;
    let reqHeaders = {};

    if (reqOrMeta && typeof reqOrMeta === 'object') {
        if (reqOrMeta.headers) {
            // Express req object
            rawUserAgent = reqOrMeta.headers['user-agent'] || '';
            reqHeaders = reqOrMeta.headers;
            ip = reqOrMeta.headers['cf-connecting-ip'] || 
                 reqOrMeta.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                 reqOrMeta.headers['x-real-ip'] || 
                 reqOrMeta.ip;
        } else {
            // Metadata object
            rawUserAgent = reqOrMeta.userAgent || reqOrMeta.device || '';
            reqHeaders = reqOrMeta.headers || {};
            ip = reqOrMeta.ip;
        }
    } else if (typeof reqOrMeta === 'string') {
        rawUserAgent = reqOrMeta;
    }

    const device = parseDevice(rawUserAgent);
    const location = await resolveLocation(ip, reqHeaders, user?.state);
    const timeStr = formatNigerianTime(new Date());
    const displayIp = ip && !isPrivateIp(ip) ? ip.replace(/^::ffff:/, '') : null;

    const subject = 'New Login Alert - Ufriends';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e8f0; border-radius: 12px; padding: 0; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #004687; padding: 25px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Security Alert: New Login</h1>
            </div>
            <div style="padding: 30px;">
                <h2 style="color: #004687; margin-top: 0; font-size: 18px;">Hello ${user.firstName},</h2>
                <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                    We noticed a new login to your Ufriends account. If this was you, you can safely disregard this email.
                </p>

                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 25px 0;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-weight: 500; width: 35%;">Date & Time:</td>
                            <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${timeStr}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-weight: 500; border-top: 1px solid #f1f5f9;">Device:</td>
                            <td style="padding: 8px 0; color: #0f172a; font-weight: 600; border-top: 1px solid #f1f5f9;">${device}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-weight: 500; border-top: 1px solid #f1f5f9;">Location:</td>
                            <td style="padding: 8px 0; color: #0f172a; font-weight: 600; border-top: 1px solid #f1f5f9;">${location}</td>
                        </tr>
                        ${displayIp ? `
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-weight: 500; border-top: 1px solid #f1f5f9;">IP Address:</td>
                            <td style="padding: 8px 0; color: #0f172a; font-weight: 600; border-top: 1px solid #f1f5f9;">${displayIp}</td>
                        </tr>
                        ` : ''}
                    </table>
                </div>

                <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 18px; margin-bottom: 25px; border-radius: 0 8px 8px 0;">
                    <p style="margin: 0; color: #991b1b; font-size: 13px; line-height: 1.5;">
                        <strong>Didn't log in?</strong> If you do not recognize this activity, your account may be compromised. Please secure your account immediately.
                    </p>
                </div>

                <div style="text-align: center; margin: 30px 0 10px 0;">
                    <a href="${process.env.FRONTEND_URL || 'https://ufriends.com.ng'}/login" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #004687, #1E90FF); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
                        Secure My Account
                    </a>
                </div>

                <br>
                <p style="margin: 0; color: #64748b; font-size: 13px;">Best regards,<br><strong style="color: #0f172a;">The Ufriends Security Team</strong></p>
            </div>
            <div style="background-color: #f8fafc; padding: 18px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                &copy; ${new Date().getFullYear()} Ufriends. All rights reserved.
            </div>
        </div>
    `;
    return sendEmail(user.email, subject, html);
}

/**
 * Send Transaction Receipt
 */
async function sendTransactionReceipt(user, transaction) {
    const subject = `Transaction Receipt - ${transaction.status === 0 || transaction.status === 'success' ? 'Success' : 'Failed'}`;
    const color = transaction.status === 0 || transaction.status === 'success' ? '#28a745' : '#dc3545';

    // Format amount properly (handle negative signs if present)
    const amount = Math.abs(parseFloat(transaction.amount)).toLocaleString();

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
            <h2 style="color: ${color}; text-align: center;">Transaction ${transaction.status === 0 || transaction.status === 'success' ? 'Successful' : 'Failed'}</h2>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h1 style="text-align: center; margin: 0; color: #333;">₦${amount}</h1>
                <p style="text-align: center; color: #666; margin-top: 5px;">${transaction.serviceName}</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">Description</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; text-align: right;">${transaction.description}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">Date</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; text-align: right;">${new Date().toLocaleString()}</td>
                </tr>
                 <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">Reference</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; text-align: right;">${transaction.reference}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; color: #666;">New Balance</td>
                    <td style="padding: 10px; font-weight: bold; text-align: right;">₦${parseFloat(transaction.newBalance).toLocaleString()}</td>
                </tr>
            </table>

            <br>
            <p style="text-align: center; font-size: 12px; color: #999;">Thank you for using Ufriends.</p>
        </div>
    `;
    return sendEmail(user.email, subject, html);
}

/**
 * Send Admin Alert
 */
async function sendAdminAlert(subject, message) {
    if (!process.env.ADMIN_EMAIL) return;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #dc3545; border-radius: 5px; padding: 20px;">
            <h2 style="color: #dc3545;">System Alert</h2>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <pre style="background: #eee; padding: 10px;">${message}</pre>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
    `;
    return sendEmail(process.env.ADMIN_EMAIL, `[Admin Alert] ${subject}`, html);
}

/**
 * Send Admin Service Request Notification
 */
async function sendAdminServiceRequestNotification(user, serviceType, amount, transRef, detailsHtml) {
    if (!process.env.ADMIN_EMAIL) return;

    const subject = `New Manual Service Request: ${serviceType}`;
    const amountStr = Math.abs(parseFloat(amount)).toLocaleString();

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #17a2b8; border-radius: 5px; padding: 20px;">
            <h2 style="color: #17a2b8;">New Service Request Submitted</h2>
            <div style="padding: 15px; background-color: #f8f9fa; border-left: 4px solid #17a2b8; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 16px;"><strong>${user.firstName} ${user.lastName}</strong> (${user.email} / ${user.phone}) has submitted a new request requiring your attention.</p>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">Service Type</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; text-align: right;">${serviceType}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">Amount Paid</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; text-align: right; color: #28a745;">₦${amountStr}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">Reference</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; text-align: right;">${transRef}</td>
                </tr>
            </table>
            
            <h3 style="color: #333; margin-top: 25px;">Submission Details:</h3>
            <div style="background: #fdfdfd; border: 1px solid #e9ecef; padding: 15px; border-radius: 5px;">
                ${detailsHtml}
            </div>

            <br>
            <div style="text-align: center; margin-top: 20px;">
                <a href="${process.env.FRONTEND_URL || 'https://ufriends.com.ng'}/admin/dashboard" style="background-color: #004687; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Review in Dashboard</a>
            </div>
        </div>
    `;
    return sendEmail(process.env.ADMIN_EMAIL, `[Action Required] ${subject}`, html);
}

/**
 * Send 2FA OTP Email
 */
async function send2FaOtpEmail(user, otpCode, isLoginPage = true) {
    const subject = isLoginPage ? 'Ufriends 2FA Login Code' : 'Ufriends 2FA Setup Code';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #004687; border-radius: 12px; padding: 30px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #004687; margin: 0; font-size: 24px;">Security Verification</h2>
            </div>
            <p style="color: #333333; font-size: 16px; margin-bottom: 20px;">Hello <strong>${user.firstName}</strong>,</p>
            <p style="color: #555555; font-size: 15px; line-height: 1.5; margin-bottom: 25px;">
                ${isLoginPage ? 'Someone is trying to log into your Ufriends account.' : 'You are setting up two-factor authentication on your account.'} 
                Use the verification code below to complete the process.
            </p>
            <div style="background-color: #f0f7ff; border: 2px dashed #004687; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 30px;">
                <span style="font-family: monospace; font-size: 42px; font-weight: bold; letter-spacing: 8px; color: #004687;">${otpCode}</span>
            </div>
            <p style="color: #999999; font-size: 12px; text-align: center; margin-bottom: 0;">
                This code expires in 10 minutes. If you did not request this, please change your password immediately.
            </p>
        </div>
    `;
    return sendEmail(user.email, subject, html);
}

/**
 * Send Email Verification OTP
 */
async function sendVerificationOtpEmail(user, otpCode) {
    const subject = 'Verify your Ufriends account';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #004687; border-radius: 12px; padding: 30px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #004687; margin: 0; font-size: 24px;">Welcome to Ufriends!</h2>
            </div>
            <p style="color: #333333; font-size: 16px; margin-bottom: 20px;">Hello <strong>${user.firstName}</strong>,</p>
            <p style="color: #555555; font-size: 15px; line-height: 1.5; margin-bottom: 25px;">
                Thank you for joining Ufriends. To complete your registration and start enjoying our services, please verify your email address using the code below:
            </p>
            <div style="background-color: #f0f7ff; border: 2px dashed #004687; border-radius: 8px; padding: 25px; text-align: center; margin-bottom: 30px;">
                <span style="font-family: monospace; font-size: 42px; font-weight: bold; letter-spacing: 8px; color: #004687;">${otpCode}</span>
            </div>
            <p style="color: #666666; font-size: 14px; text-align: center; margin-bottom: 25px;">
                This code will expire in 15 minutes.
            </p>
            <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0;">
            <p style="color: #999999; font-size: 12px; text-align: center; margin-bottom: 0; line-height: 1.4;">
                If you did not create an account on Ufriends, please ignore this email.
            </p>
        </div>
    `;
    return sendEmail(user.email, subject, html);
}

/**
 * Send System Update & Apology Email
 */
async function sendSystemUpdateEmail(user) {
    const subject = 'Important Account Update & Apology from Ufriends';
    const firstName = user && user.firstName ? user.firstName : 'Valued User';
    
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; padding: 30px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #004687;">Important Update from Ufriends</h2>
            </div>
            
            <p>Dear <strong>${firstName}</strong>,</p>
            
            <p>We want to sincerely apologize for the recent inconveniences and service downtimes you may have experienced. Our team has been working continuously to upgrade our infrastructure and ensure a much smoother and more reliable experience for you.</p>
            
            <h3 style="color: #1e90ff;">Exciting New Upgrades</h3>
            <p>We are thrilled to let you know that our system wide upgrade is complete! We've improved our platform performance, enhanced security, and added robust new features so everything is now running smoothly.</p>
            
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 0 4px 4px 0;">
                <h3 style="color: #856404; margin-top: 0;">⚠️ Important Login Change</h3>
                <p style="margin-bottom: 0;">As part of our security and system optimizations, we have updated our login process. <strong>Moving forward, you must log in using your registered Phone Number and Password</strong> instead of your email address. Your password remains exactly the same.</p>
            </div>
            
            <div style="background-color: #f8fbff; border: 2px dashed #1e90ff; padding: 15px; margin: 20px 0; text-align: center; border-radius: 8px;">
                <p style="margin: 0; font-size: 16px;"><strong>New Login Method:</strong></p>
                <p style="margin: 10px 0 0 0; color: #555;">Use your <strong style="color: #1e90ff;">Registered Phone Number</strong> and your existing Password to access your account.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'https://ufriends.com.ng'}/login" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #004687, #1E90FF); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">
                    Log In To Your Account
                </a>
            </div>
            
            <p>Thank you for your continued patience, understanding, and trust in Ufriends. If you experience any issues accessing your account, please reach out to our support team.</p>
            <br/>
            <p>Best regards,</p>
            <p><strong>The Ufriends Team</strong></p>
        </div>
    `;
    
    const emailTo = user && user.email ? user.email : user;
    return sendEmail(emailTo, subject, html);
}

/**
 * Send Reseller Setup Confirmation to User
 */
async function sendResellerConfirmation(request) {
    console.log(`[EmailService] Preparing reseller confirmation for: ${request.contactEmail}`);
    const subject = 'Payment Received - Reseller Portal Setup Started';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e8f0; border-radius: 12px; padding: 0; overflow: hidden; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 40px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">Setup Started!</h1>
            </div>
            <div style="padding: 40px;">
                <h2 style="color: #0f172a; margin-top: 0;">Payment Successful</h2>
                <p>We have successfully received your payment for the Ufriends Reseller Portal setup. Our team has been notified and the deployment process has been initiated.</p>
                
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin: 30px 0; text-align: center;">
                    <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">Your Tracking ID</p>
                    <h2 style="margin: 10px 0; color: #0f172a; font-family: monospace; font-size: 28px;">${request.paymentRef}</h2>
                </div>

                <div style="margin: 30px 0;">
                    <h3 style="font-size: 14px; color: #0f172a; border-b: 1px solid #eee; pb-10">Configuration Summary:</h3>
                    <ul style="list-style: none; padding: 0; font-size: 13px; color: #475569;">
                        <li><strong>Platforms:</strong> ${request.platforms.join(', ').toUpperCase()}</li>
                        <li><strong>Hosting Model:</strong> ${request.hostingType.toUpperCase()}</li>
                        <li><strong>Extras:</strong> ${request.extras.length > 0 ? request.extras.join(', ').toUpperCase() : 'None'}</li>
                    </ul>
                </div>

                <p>You can track the progress of your setup (Web, Android, iOS) and provide your branding details in real-time using our tracking portal.</p>
                
                <div style="text-align: center; margin: 40px 0;">
                    <a href="${process.env.FRONTEND_URL || 'https://ufriends.com.ng'}/reseller/status/${request.paymentRef}" style="display: inline-block; padding: 16px 32px; background-color: #004687; color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                        Track My Setup & Submit Branding
                    </a>
                </div>

                <p style="color: #64748b; font-size: 14px; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 20px">Note: Setup typically takes 2-5 business days depending on the complexity and platform publishing requirements.</p>
            </div>
        </div>
    `;
    console.log(`[EmailService] Sending reseller confirmation email...`);
    return sendEmail(request.contactEmail, subject, html);
}

/**
 * Send Reseller Admin Notification
 */
async function sendResellerAdminAlert(request) {
    if (!process.env.ADMIN_EMAIL) {
        console.warn('[EmailService] ADMIN_EMAIL not set, skipping reseller admin alert');
        return;
    }
    console.log(`[EmailService] Preparing reseller admin alert for ref: ${request.paymentRef}`);
    const subject = 'New PAID Reseller Setup Request';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #0f172a; border-radius: 12px; padding: 30px;">
            <h2 style="color: #004687;">Action Required: New Reseller Setup</h2>
            <p>A new reseller setup request has been PAID and is ready for processing.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">Customer Email</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">${request.contactEmail}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">Phone</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">${request.contactPhone}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">Platforms</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">${request.platforms.join(', ').toUpperCase()}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">Hosting</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">${request.hostingType.toUpperCase()}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">Extras</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">${request.extras.length > 0 ? request.extras.join(', ').toUpperCase() : 'None'}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">Amount</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #28a745;">₦${request.totalAmount.toLocaleString()}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">Tracking ID</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">${request.paymentRef}</td>
                </tr>
            </table>

            <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.FRONTEND_URL || 'https://ufriends.com.ng'}/admin/dashboard/reseller-requests" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Manage in Dashboard</a>
            </div>
        </div>
    `;
    return sendEmail(process.env.ADMIN_EMAIL, `[URGENT] ${subject}`, html);
}

/**
 * Send Reseller Deployment Ready Notification
 */
async function sendResellerDeploymentReady(request) {
    const subject = 'Your Reseller Portal is Live!';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e8f0; border-radius: 12px; padding: 0; overflow: hidden; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 40px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">Deployment Complete!</h1>
            </div>
            <div style="padding: 40px;">
                <h2 style="color: #0f172a; margin-top: 0;">Congratulations!</h2>
                <p>We are excited to inform you that your Ufriends Reseller Portal setup is now complete. All your assets are ready for use.</p>
                
                <div style="background-color: #f0fdf4; border: 1px solid #dcfce7; border-radius: 12px; padding: 25px; margin: 30px 0;">
                    <h3 style="margin: 0 0 15px 0; color: #166534; font-size: 14px; text-transform: uppercase;">Your Assets:</h3>
                    <ul style="margin: 0; padding: 0; list-style: none; space-y: 10px;">
                        ${request.webUrl ? `<li style="margin-bottom: 10px;">🌐 <strong>Web Portal:</strong> <a href="${request.webUrl}" style="color: #16a34a;">${request.webUrl}</a></li>` : ''}
                        ${request.apkUrl ? `<li style="margin-bottom: 10px;">📱 <strong>Android APK:</strong> <a href="${request.apkUrl}" style="color: #16a34a;">Download App</a></li>` : ''}
                        ${request.playStoreUrl ? `<li style="margin-bottom: 10px;">▶️ <strong>Play Store:</strong> <a href="${request.playStoreUrl}" style="color: #16a34a;">View on Play Store</a></li>` : ''}
                        ${request.appStoreUrl ? `<li style="margin-bottom: 10px;">🍎 <strong>App Store:</strong> <a href="${request.appStoreUrl}" style="color: #16a34a;">View on App Store</a></li>` : ''}
                    </ul>
                </div>

                ${request.adminNote ? `
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                    <p style="margin: 0; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase;">Admin Message:</p>
                    <p style="margin: 10px 0 0 0; color: #0f172a;">${request.adminNote}</p>
                </div>
                ` : ''}

                <div style="text-align: center; margin: 40px 0;">
                    <a href="${process.env.FRONTEND_URL || 'https://ufriends.com.ng'}/reseller/status/${request.paymentRef}" style="display: inline-block; padding: 16px 32px; background-color: #0f172a; color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px;">
                        View Setup Summary
                    </a>
                </div>

                <p>If you have any questions or need further customization, please contact your account manager.</p>
                <p>Best regards,<br>The Ufriends Enterprise Team</p>
            </div>
        </div>
    `;
    return sendEmail(request.contactEmail, subject, html);
}

/**
 * Send Manual Service Update Notification
 */
async function sendManualServiceUpdateNotification(user, serviceType, updatedStatus, transRef, adminNote) {
    const statusStr = updatedStatus === 1 ? 'Approved' : updatedStatus === 2 ? 'Rejected' : updatedStatus === 3 ? 'In Progress' : 'Pending';
    const color = updatedStatus === 1 ? '#28a745' : updatedStatus === 2 ? '#dc3545' : updatedStatus === 3 ? '#17a2b8' : '#ffc107';
    
    const subject = `Update on your Service Request: ${serviceType}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
            <h2 style="color: ${color}; text-align: center;">Request ${statusStr}</h2>
            <div style="padding: 15px; background-color: #f8f9fa; border-radius: 5px; margin: 20px 0;">
                <p>Hello <strong>${user.firstName}</strong>,</p>
                <p>Your manual service request for <strong>${serviceType}</strong> has been updated by an admin.</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">Reference</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; text-align: right;">${transRef}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">Status</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; text-align: right; color: ${color};">${statusStr}</td>
                </tr>
                ${adminNote ? `
                <tr>
                    <td colspan="2" style="padding: 10px; color: #666;">
                        <div style="background: #e9ecef; padding: 10px; border-radius: 5px; margin-top: 10px;">
                            <strong>Admin Note:</strong><br/>
                            ${adminNote.replace(/\n/g, '<br/>')}
                        </div>
                    </td>
                </tr>` : ''}
            </table>

            <br>
            <div style="text-align: center; margin-top: 20px;">
                <a href="${process.env.FRONTEND_URL || 'https://ufriends.com.ng'}/dashboard/manual-services" style="background-color: #004687; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View in Dashboard</a>
            </div>
        </div>
    `;
    return sendEmail(user.email, subject, html);
}

module.exports = {
    sendEmail,
    sendEmailStrict,
    sendWelcomeEmail,
    sendLoginAlert,
    sendTransactionReceipt,
    sendAdminAlert,
    sendAdminServiceRequestNotification,
    sendManualServiceUpdateNotification,
    send2FaOtpEmail,
    sendVerificationOtpEmail,
    sendSystemUpdateEmail,
    sendResellerConfirmation,
    sendResellerAdminAlert,
    sendResellerDeploymentReady
};

