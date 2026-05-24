import nodemailer from 'nodemailer';

/**
 * Configure Transporter
 */
const createTransporter = async () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

/**
 * Send Verification Email
 */
export const sendVerificationEmail = async (email, token) => {
    const transporter = await createTransporter();
    const url = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

    const info = await transporter.sendMail({
        from: '"IndEase Industrial" <' + process.env.SMTP_USER + '>',
        to: email,
        subject: "Industrial Identity: Verify Your Email",
        html: `<p>Please verify your email by clicking <a href="${url}">here</a>.</p>`,
    });

    if (process.env.NODE_ENV !== 'production') {
        console.log("[Email] Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }
};

/**
 * Send Password Reset Email
 */
export const sendPasswordResetEmail = async (email, token) => {
    const transporter = await createTransporter();
    const url = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

    const htmlTemplate = `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="background-color: #0f172a; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">IndEase Industrial</h1>
            </div>
            <div style="padding: 30px;">
                <h2 style="color: #0f172a; font-size: 20px;">Password Reset Request</h2>
                <p style="font-size: 16px; color: #475569; line-height: 1.5;">
                    We received a request to reset the password for your industrial access account.
                    Please click the button below to set a new password.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${url}" style="background-color: #3b82f6; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 700; display: inline-block;">Reset Password</a>
                </div>
                <p style="font-size: 14px; color: #64748b; margin-top: 10px;">
                    <strong>Note:</strong> This link will expire securely in exactly 1 hour.
                </p>
            </div>
            <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-radius: 0 0 8px 8px;">
                <p style="margin: 0;">If you didn't request this change, you can safely ignore this email. Your industrial credentials remain secure.</p>
                <p style="margin: 5px 0 0;">&copy; 2026 IndEase Platform. All rights reserved.</p>
            </div>
        </div>
    `;

    const info = await transporter.sendMail({
        from: '"IndEase Industrial" <' + process.env.SMTP_USER + '>',
        to: email,
        subject: "Industrial Integrity: Password Reset",
        html: htmlTemplate,
    });

    if (process.env.NODE_ENV !== 'production') {
        console.log("[Email] Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }
};
