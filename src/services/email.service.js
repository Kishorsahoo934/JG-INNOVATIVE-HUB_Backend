import NativeSMTPClient from './nativeSmtp.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Service to handle dynamic routing of emails (Security vs Operational vs Support)
 * Uses a pure native SMTP implementation without Nodemailer.
 * using standard SMTP.
 * Uses a pure native SMTP implementation without Nodemailer or Brevo.
 */

// We configure two separate clients if the SMTP_USER changes, but here we assume the primary 
// SMTP authentication is done via the main info account or a central app password.
// For Gmail, as long as the authenticated user is an admin or has aliases set up, 
// they can send "From" the alias addresses (EMAIL_FROM_NOREPLY and EMAIL_FROM_INFO).
const smtpConfig = {
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
};
  secure: process.env.SMTP_SECURE === 'true', // false for 587, true for 465
  auth: {
const getClient = () => {
  return new NativeSMTPClient({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const getClient = () => {
  if (!smtpConfig.user || !smtpConfig.pass) {
    console.warn('SMTP credentials missing! Emails will not be sent.');
  }
  return new NativeSMTPClient(smtpConfig);
  });
};

export const emailService = {
  /**
   * Test the SMTP connection.
   */
  async verifyConfiguration() {
    try {
      const client = getClient();
      await client.verifyConnection();
      await transporter.verify();
      console.log('[Email Service] SMTP Configuration is valid.');
      return true;
    } catch (err) {
      console.error('[Email Service] Verification failed:', err.message);
      return false;
    }
  },

  /**
   * Send Authentication / Security Emails (OTPs, Password Resets)
   * Dispatched using EMAIL_FROM_NOREPLY.
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} html - HTML content
   */
  async sendSecurityEmail(to, subject, html) {
    if (!to || !subject || !html) throw new Error('Missing required fields (to, subject, html)');
    try {
      const client = getClient();
      const from = process.env.EMAIL_FROM_NOREPLY || '"Innovative Hub" <no-reply@inovative-hub.com>';
      
      const result = await client.sendMail({
      const result = await transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      console.log(`[Security Email] Sent to ${to}`);
      return result;
    } catch (error) {
      console.error('[Security Email] Error:', error.message);
      throw error;
    }
  },

  /**
   * Send Transactional / Operational Emails (Invoices, Receipts, Delivery)
   * Dispatched using EMAIL_FROM_INFO.
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} html - HTML content
   */
  async sendOperationalEmail(to, subject, html) {
    if (!to || !subject || !html) throw new Error('Missing required fields (to, subject, html)');
    try {
      const client = getClient();
      const from = process.env.EMAIL_FROM_INFO || '"Innovative Hub" <Info@inovative-hub.com>';
      
      const result = await client.sendMail({
      const result = await transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      console.log(`[Operational Email] Sent to ${to}`);
      return result;
    } catch (error) {
      console.error('[Operational Email] Error:', error.message);
      throw error;
    }
  },

  /**
   * Send Contact Us / Support Inquiries Form
   * Sent From EMAIL_FROM_INFO, To CONTACT_RECEIVER_EMAIL.
   * Reply-To is set to the visitor's email.
   * @param {Object} visitor - { name, email, subject, message }
   */
  async sendSupportInquiry(visitor) {
    if (!visitor || !visitor.email || !visitor.message) {
      throw new Error('Invalid visitor data for support inquiry');
    }
    
    try {
      const client = getClient();
      const from = process.env.EMAIL_FROM_INFO || '"Innovative Hub" <Info@inovative-hub.com>';
      const to = process.env.CONTACT_RECEIVER_EMAIL || 'supportinnovativehub@gmail.com';
      const replyTo = `"${visitor.name || 'Visitor'}" <${visitor.email}>`;
      const subject = `Support Inquiry: ${visitor.subject || 'New Message'}`;
      
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #333; border-bottom: 2px solid #ea580c; padding-bottom: 10px;">New Support Inquiry</h2>
          <table style="width: 100%; margin-bottom: 20px;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Name:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${visitor.name || 'N/A'}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Email:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><a href="mailto:${visitor.email}">${visitor.email}</a></td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Subject:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${visitor.subject || 'N/A'}</td></tr>
          </table>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; white-space: pre-wrap; font-size: 15px; line-height: 1.5; color: #444;">${visitor.message}</div>
          <p style="margin-top: 25px; font-size: 13px; color: #888;">Reply directly to this email to respond to the visitor.</p>
        </div>
      `;

      const result = await client.sendMail({
      const result = await transporter.sendMail({
        from,
        to,
        replyTo,
        subject,
        html,
      });
      console.log(`[Support Inquiry] Forwarded from ${visitor.email} to ${to}`);
      return result;
    } catch (error) {
      console.error('[Support Inquiry] Error:', error.message);
      throw error;
    }
  }
};
