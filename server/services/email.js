import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

const isProduction = process.env.NODE_ENV === 'production';
const emailEnabled = Boolean(process.env.SMTP_HOST);

let transporter = null;

if (emailEnabled) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
} else if (isProduction) {
  logger.warn('Email service disabled — SMTP_HOST not configured');
}

export async function sendPasswordResetEmail(email, resetToken) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

  if (!emailEnabled) {
    logger.info('Password reset (dev — no email sent)', { email, resetUrl });
    return { success: true, mode: 'dev', resetUrl };
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'Guardian Flow <noreply@guardianflow.com>',
    to: email,
    subject: 'Password Reset Request — Guardian Flow',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>You requested a password reset. Click the button below to choose a new password:</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Reset Password</a>
        </p>
        <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });

  logger.info('Password reset email sent', { email });
  return { success: true };
}

export { emailEnabled };
