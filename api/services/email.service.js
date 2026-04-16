const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
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
        const siteEmail = await settingsService.getSetting('siteEmail', 'support@ufriends.com');

        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || `"${siteName} Support" <${siteEmail}>`,
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
    const siteEmail = await settingsService.getSetting('siteEmail', 'support@ufriends.com');

    const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || `"${siteName} Support" <${siteEmail}>`,
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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #007bff;">Welcome to Ufriends, ${user.firstName}!</h2>
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
            <p>Best regards,</p>
            <p>The Ufriends Team</p>
        </div>
    `;
    return sendEmail(user.email, subject, html);
}

/**
 * Send Login Alert
 */
async function sendLoginAlert(user, deviceInfo) {
    const subject = 'New Login Alert - Ufriends';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545;">New Login Detected</h2>
            <p>Hello ${user.firstName},</p>
            <p>We detected a new login to your Ufriends account.</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Device:</strong> ${deviceInfo || 'Unknown Device'}</p>
            <br>
            <p>If this was you, you can ignore this email. If you did not authorize this login, please contact support immediately and change your password.</p>
            <br>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #004687, #1E90FF); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">
                    Log In to Secure Account
                </a>
            </div>
            <br>
            <p>Best regards,</p>
            <p>The Ufriends Team</p>
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
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/dashboard" style="background-color: #17a2b8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Review in Dashboard</a>
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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #1e90ff; border-radius: 12px; padding: 30px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #1e90ff; margin: 0; font-size: 24px;">Security Verification</h2>
            </div>
            <p style="color: #333333; font-size: 16px; margin-bottom: 20px;">Hello <strong>${user.firstName}</strong>,</p>
            <p style="color: #555555; font-size: 15px; line-height: 1.5; margin-bottom: 25px;">
                ${isLoginPage ? 'Someone is trying to log into your Ufriends account.' : 'You are setting up two-factor authentication on your account.'} 
                Use the verification code below to complete the process.
            </p>
            <div style="background-color: #f8fbff; border: 2px dashed #1e90ff; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 30px;">
                <span style="font-family: monospace; font-size: 42px; font-weight: bold; letter-spacing: 8px; color: #1e90ff;">${otpCode}</span>
            </div>
            <p style="color: #999999; font-size: 12px; text-align: center; margin-bottom: 0;">
                This code expires in 10 minutes. If you did not request this, please change your password immediately.
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

module.exports = {
    sendEmail,
    sendEmailStrict,
    sendWelcomeEmail,
    sendLoginAlert,
    sendTransactionReceipt,
    sendAdminAlert,
    sendAdminServiceRequestNotification,
    send2FaOtpEmail,
    sendSystemUpdateEmail
};

