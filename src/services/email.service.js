import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const emailService = {
  async verifyConfiguration() {
    try {
      await transporter.verify();
      console.log('[Email Service] SMTP Configuration is valid.');
      return true;
    } catch (err) {
      console.error('[Email Service] Verification failed:', err.message);
      return false;
    }
  },

  async sendSecurityEmail(to, subject, html) {
    if (!to || !subject || !html) throw new Error('Missing required fields (to, subject, html)');
    try {
      const from = process.env.EMAIL_FROM_NOREPLY || `"JG Innovative Hub" <${process.env.SMTP_USER}>`;
      const result = await transporter.sendMail({ from, to, subject, html });
      console.log(`[Security Email] Sent to ${to}`);
      return result;
    } catch (error) {
      console.error('[Security Email] Error:', error.message);
      throw error;
    }
  },

  async sendOperationalEmail(to, subject, html, attachments = [], replyTo = undefined) {
    if (!to || !subject || !html) throw new Error('Missing required fields (to, subject, html)');
    try {
      const from = process.env.EMAIL_FROM_INFO || `"JG Innovative Hub" <${process.env.SMTP_USER}>`;
      const mailOptions = { from, to, subject, html };
      if (replyTo) mailOptions.replyTo = replyTo.email || replyTo;
      if (attachments && attachments.length > 0) mailOptions.attachments = attachments;
      const result = await transporter.sendMail(mailOptions);
      console.log(`[Operational Email] Sent to ${to}`);
      return result;
    } catch (error) {
      console.error('[Operational Email] Error:', error.message);
      throw error;
    }
  },

  async sendSupportInquiry(visitor) {
    if (!visitor || !visitor.email || !visitor.message) {
      throw new Error('Invalid visitor data for support inquiry');
    }
    try {
      const from = process.env.EMAIL_FROM_INFO || `"JG Innovative Hub" <${process.env.SMTP_USER}>`;
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
      const result = await transporter.sendMail({ from, to, replyTo, subject, html });
      console.log(`[Support Inquiry] Forwarded from ${visitor.email} to ${to}`);
      return result;
    } catch (error) {
      console.error('[Support Inquiry] Error:', error.message);
      throw error;
    }
  }
};

