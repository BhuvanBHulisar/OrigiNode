import nodemailer from 'nodemailer';

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'originode7@gmail.com';

const getTransporter = () => nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

export const sendExpertWelcomeEmail = async ({ name, email, password }) => {
    const appUrl = process.env.CLIENT_URL?.split(',')[0]?.trim() || 'http://localhost:5173';
    await getTransporter().sendMail({
        from: `"IndEase Support" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Welcome to IndEase — Your Expert Account is Ready',
        text: `Hello ${name},\n\nYour service expert account has been created on IndEase.\n\nLogin Credentials:\nEmail: ${email}\nPassword: ${password}\n\nLogin here: ${appUrl}/provider/login\n\nIMPORTANT — Before you can receive payments:\n1. Login to your account\n2. You will be prompted to add your bank details\n3. All earnings will be transferred to your bank account\n\nIf you need help, contact us at ${SUPPORT_EMAIL}\n\n– Team IndEase`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      
      <!-- HEADER -->
      <tr>
        <td style="background:linear-gradient(135deg,#1e40af 0%,#2563EB 100%);padding:40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">IndEase</h1>
          <p style="margin:8px 0 0;color:#93c5fd;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Industrial Service Platform</p>
        </td>
      </tr>

      <!-- WELCOME BADGE -->
      <tr>
        <td style="padding:40px 40px 0;text-align:center;">
          <div style="display:inline-block;background:#DBEAFE;border-radius:50px;padding:8px 20px;">
            <span style="color:#1d4ed8;font-size:13px;font-weight:600;">✓ Account Created Successfully</span>
          </div>
          <h2 style="margin:20px 0 8px;color:#111827;font-size:24px;font-weight:700;">Welcome, ${name}!</h2>
          <p style="margin:0;color:#6B7280;font-size:15px;line-height:1.6;">Your service expert account on IndEase is ready. You can now accept service requests from machine owners across India.</p>
        </td>
      </tr>

      <!-- CREDENTIALS BOX -->
      <tr>
        <td style="padding:32px 40px;">
          <div style="background:#F8FAFF;border:1px solid #DBEAFE;border-radius:12px;padding:24px;">
            <p style="margin:0 0 16px;color:#374151;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Your Login Credentials</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #E5E7EB;">
                  <span style="color:#6B7280;font-size:13px;">Email Address</span><br>
                  <span style="color:#111827;font-size:15px;font-weight:600;">${email}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;">
                  <span style="color:#6B7280;font-size:13px;">Temporary Password</span><br>
                  <span style="color:#111827;font-size:15px;font-weight:600;font-family:monospace;background:#F3F4F6;padding:4px 10px;border-radius:6px;">${password}</span>
                </td>
              </tr>
            </table>
            <p style="margin:16px 0 0;color:#EF4444;font-size:12px;">⚠ Please change your password after your first login for security.</p>
          </div>
        </td>
      </tr>

      <!-- MANDATORY ACTION -->
      <tr>
        <td style="padding:0 40px 32px;">
          <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:20px;">
            <p style="margin:0 0 12px;color:#92400E;font-size:14px;font-weight:700;">⚡ Action Required Before You Start</p>
            <p style="margin:0 0 12px;color:#78350F;font-size:13px;line-height:1.6;">To receive job payments and your monthly salary, complete your profile:</p>
            <table cellpadding="0" cellspacing="0">
              <tr><td style="padding:4px 0;color:#78350F;font-size:13px;">① Login to your account</td></tr>
              <tr><td style="padding:4px 0;color:#78350F;font-size:13px;">② Add your bank account details</td></tr>
              <tr><td style="padding:4px 0;color:#78350F;font-size:13px;">③ Complete your profile information</td></tr>
            </table>
          </div>
        </td>
      </tr>

      <!-- HOW IT WORKS -->
      <tr>
        <td style="padding:0 40px 32px;">
          <p style="margin:0 0 16px;color:#374151;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">How IndEase Works</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="33%" style="text-align:center;padding:16px 8px;background:#F8FAFF;border-radius:10px;margin:4px;">
                <div style="font-size:24px;margin-bottom:8px;">🔧</div>
                <p style="margin:0;color:#111827;font-size:12px;font-weight:600;">Accept Requests</p>
                <p style="margin:4px 0 0;color:#6B7280;font-size:11px;">Get notified when machine owners need your expertise</p>
              </td>
              <td width="4%"></td>
              <td width="33%" style="text-align:center;padding:16px 8px;background:#F8FAFF;border-radius:10px;">
                <div style="font-size:24px;margin-bottom:8px;">💬</div>
                <p style="margin:0;color:#111827;font-size:12px;font-weight:600;">Chat & Diagnose</p>
                <p style="margin:4px 0 0;color:#6B7280;font-size:11px;">Communicate directly with the machine owner</p>
              </td>
              <td width="4%"></td>
              <td width="33%" style="text-align:center;padding:16px 8px;background:#F8FAFF;border-radius:10px;">
                <div style="font-size:24px;margin-bottom:8px;">💰</div>
                <p style="margin:0;color:#111827;font-size:12px;font-weight:600;">Get Paid</p>
                <p style="margin:4px 0 0;color:#6B7280;font-size:11px;">Receive payments directly to your bank account</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- SALARY INFO -->
      <tr>
        <td style="padding:0 40px 32px;">
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:20px;">
            <p style="margin:0 0 8px;color:#14532D;font-size:14px;font-weight:700;">💼 Your Earnings Structure</p>
            <p style="margin:0 0 12px;color:#166534;font-size:13px;line-height:1.6;">At IndEase, you earn in two ways:</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:6px 0;border-bottom:1px solid #D1FAE5;">
                  <span style="color:#166534;font-size:13px;font-weight:600;">Per Job Payment</span>
                  <span style="color:#166534;font-size:13px;float:right;">90% of service cost</span>
                </td>
              </tr>
              <tr>
                <td style="padding:6px 0;">
                  <span style="color:#166534;font-size:13px;font-weight:600;">Monthly Salary</span>
                  <span style="color:#166534;font-size:13px;float:right;">Based on your level</span>
                </td>
              </tr>
            </table>
            <p style="margin:12px 0 0;color:#166534;font-size:12px;">Your level increases as you complete more jobs and earn positive ratings.</p>
          </div>
        </td>
      </tr>

      <!-- CTA BUTTON -->
      <tr>
        <td style="padding:0 40px 40px;text-align:center;">
          <a href="${appUrl}/provider/login" style="display:inline-block;background:#2563EB;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:15px;font-weight:700;">Login to Your Account →</a>
          <p style="margin:16px 0 0;color:#9CA3AF;font-size:12px;">Or copy this link: ${appUrl}/provider/login</p>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:24px 40px;text-align:center;">
          <p style="margin:0;color:#6B7280;font-size:12px;">Need help? Contact us at <a href="mailto:support@indease.com" style="color:#2563EB;">support@indease.com</a></p>
          <p style="margin:8px 0 0;color:#9CA3AF;font-size:11px;">© 2026 IndEase Systems. All rights reserved.</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
    });
};

export const sendExpertRemovalEmail = async ({ name, email, reason }) => {
    await getTransporter().sendMail({
        from: `"IndEase Support" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Your IndEase Expert Account Has Been Removed',
        text: `Hello ${name},\n\nYour account has been removed from the IndEase platform.\nReason: ${reason}\n\nIf you believe this is a mistake, contact ${SUPPORT_EMAIL}\n\n– Team IndEase`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      
      <!-- HEADER -->
      <tr>
        <td style="background:#111827;padding:40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">IndEase</h1>
          <p style="margin:8px 0 0;color:#9CA3AF;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Industrial Service Platform</p>
        </td>
      </tr>

      <!-- CONTENT -->
      <tr>
        <td style="padding:40px;text-align:center;">
          <div style="width:64px;height:64px;background:#FEE2E2;border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:28px;line-height:64px;">⚠</div>
          <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Account Removed</h2>
          <p style="margin:0;color:#6B7280;font-size:15px;">Hello ${name},</p>
        </td>
      </tr>

      <!-- REASON BOX -->
      <tr>
        <td style="padding:0 40px 32px;">
          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">Your service expert account has been removed from the IndEase platform.</p>
          <div style="background:#FEF2F2;border-left:4px solid #EF4444;border-radius:0 8px 8px 0;padding:16px 20px;">
            <p style="margin:0 0 6px;color:#991B1B;font-size:13px;font-weight:700;">Reason for Removal:</p>
            <p style="margin:0;color:#B91C1C;font-size:14px;">${reason}</p>
          </div>
        </td>
      </tr>

      <!-- WHAT HAPPENS NEXT -->
      <tr>
        <td style="padding:0 40px 32px;">
          <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:20px;">
            <p style="margin:0 0 12px;color:#374151;font-size:14px;font-weight:700;">What happens to your data:</p>
            <table cellpadding="0" cellspacing="0">
              <tr><td style="padding:4px 0;color:#6B7280;font-size:13px;">• Your account access has been deactivated</td></tr>
              <tr><td style="padding:4px 0;color:#6B7280;font-size:13px;">• Any pending payments will be processed within 7 days</td></tr>
              <tr><td style="padding:4px 0;color:#6B7280;font-size:13px;">• Your service history is retained for 90 days</td></tr>
            </table>
          </div>
        </td>
      </tr>

      <!-- CONTACT -->
      <tr>
        <td style="padding:0 40px 40px;text-align:center;">
          <p style="margin:0 0 16px;color:#374151;font-size:14px;">If you believe this is a mistake or have questions:</p>
          <a href="mailto:support@indease.com" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:600;">Contact Support</a>
          <p style="margin:16px 0 0;color:#6B7280;font-size:13px;">Email: <a href="mailto:support@indease.com" style="color:#2563EB;">support@indease.com</a></p>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:24px 40px;text-align:center;">
          <p style="margin:8px 0 0;color:#9CA3AF;font-size:11px;">© 2026 IndEase Systems. All rights reserved.</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
    });
};

export const sendSupportEmail = async ({ name, email, subject, message }) => {
    await getTransporter().sendMail({
        from: `"IndEase Support" <${process.env.SMTP_USER}>`,
        to: SUPPORT_EMAIL,
        replyTo: email,
        subject: `Support Request - ${subject}`,
        text: `User: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
        html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#3b82f6,#6366f1);padding:28px 40px;text-align:center;">
            <h2 style="margin:0;color:#ffffff;font-size:20px;font-weight:800;">New Support Request</h2>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Subject: ${subject}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0 0 8px;font-size:14px;color:#64748b;"><span style="font-weight:700;color:#1e293b;">Name:</span> ${name}</p>
                <p style="margin:0;font-size:14px;color:#64748b;"><span style="font-weight:700;color:#1e293b;">Email:</span> <a href="mailto:${email}" style="color:#3b82f6;">${email}</a></p>
              </td></tr>
            </table>
            <h4 style="margin:0 0 12px;color:#1e293b;font-size:14px;font-weight:700;">Message:</h4>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;">
              <p style="margin:0;color:#475569;font-size:14px;line-height:1.7;white-space:pre-wrap;">${message}</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">IndEase Support System &copy; 2026</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
    });
};

export async function sendBankDetailsRequestEmail(name, email) {
    const appUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const transporter = getTransporter();
    await transporter.sendMail({
        from: `"IndEase Support" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Action Required — Add Your Bank Details to Receive Payments',
        html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <tr>
        <td style="background:linear-gradient(135deg,#1e40af 0%,#2563EB 100%);padding:40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">IndEase</h1>
          <p style="margin:8px 0 0;color:#93c5fd;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Industrial Service Platform</p>
        </td>
      </tr>
      <tr>
        <td style="padding:40px 40px 0;text-align:center;">
          <div style="display:inline-block;background:#FEF3C7;border-radius:50px;padding:8px 20px;">
            <span style="color:#92400E;font-size:13px;font-weight:600;">⚠ Action Required</span>
          </div>
          <h2 style="margin:20px 0 8px;color:#111827;font-size:22px;font-weight:700;">Hello, ${name}!</h2>
          <p style="margin:0;color:#6B7280;font-size:15px;line-height:1.6;">Your bank details are missing. Without them, we are unable to transfer your job payments and monthly salary to you.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:32px 40px;">
          <div style="background:#FEF2F2;border-left:4px solid #EF4444;border-radius:0 8px 8px 0;padding:16px 20px;">
            <p style="margin:0 0 6px;color:#991B1B;font-size:14px;font-weight:700;">Your salary is currently on hold</p>
            <p style="margin:0;color:#B91C1C;font-size:13px;line-height:1.6;">All earnings from completed jobs and your monthly salary will be released to your bank account as soon as you add your details.</p>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:0 40px 32px;">
          <div style="background:#F8FAFF;border:1px solid #DBEAFE;border-radius:12px;padding:24px;">
            <p style="margin:0 0 16px;color:#374151;font-size:14px;font-weight:700;">How to add your bank details:</p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr><td style="padding:8px 0;border-bottom:1px solid #E5E7EB;">
                <span style="color:#2563EB;font-weight:700;font-size:13px;">Step 1</span>
                <span style="color:#374151;font-size:13px;margin-left:8px;">Login to your IndEase expert account</span>
              </td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #E5E7EB;">
                <span style="color:#2563EB;font-weight:700;font-size:13px;">Step 2</span>
                <span style="color:#374151;font-size:13px;margin-left:8px;">Go to My Account → Bank Details section</span>
              </td></tr>
              <tr><td style="padding:8px 0;">
                <span style="color:#2563EB;font-weight:700;font-size:13px;">Step 3</span>
                <span style="color:#374151;font-size:13px;margin-left:8px;">Enter your Account Number, IFSC Code, and Account Holder Name</span>
              </td></tr>
            </table>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:0 40px 32px;">
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:20px;">
            <p style="margin:0 0 8px;color:#14532D;font-size:14px;font-weight:700;">💰 What you will receive</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:6px 0;border-bottom:1px solid #D1FAE5;color:#166534;font-size:13px;">Per job payment</td>
                <td style="padding:6px 0;border-bottom:1px solid #D1FAE5;color:#166534;font-size:13px;text-align:right;">90% of each service amount</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#166534;font-size:13px;">Monthly salary</td>
                <td style="padding:6px 0;color:#166534;font-size:13px;text-align:right;">Based on your performance level</td>
              </tr>
            </table>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:0 40px 40px;text-align:center;">
          <a href="${appUrl}/provider/login" style="display:inline-block;background:#2563EB;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:15px;font-weight:700;">Login &amp; Add Bank Details →</a>
        </td>
      </tr>
      <tr>
        <td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:24px 40px;text-align:center;">
          <p style="margin:0;color:#6B7280;font-size:12px;">Questions? Contact us at <a href="mailto:support@indease.com" style="color:#2563EB;">support@indease.com</a></p>
          <p style="margin:8px 0 0;color:#9CA3AF;font-size:11px;">© 2026 IndEase Systems. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
    });
}
