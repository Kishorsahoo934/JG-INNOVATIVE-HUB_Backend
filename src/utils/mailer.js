import { sendBrevoEmail } from '../services/brevoEmail.service.js';
import { emailService } from '../services/email.service.js';

const getSenderDetails = () => {
  const rawFrom = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || process.env.SMTP_FROM;
  if (!rawFrom) return null;

  const match = rawFrom.match(/^(.*)<(.+)>$/);
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, '');
    const email = match[2].trim();
    return { rawFrom, email, name: name || undefined };
  }

  return {
    rawFrom: rawFrom.trim(),
    email: rawFrom.trim(),
    name: process.env.BREVO_SENDER_NAME?.trim() || undefined,
  };
};

const formatReplyTo = (replyTo) => {
  if (!replyTo?.email) return undefined;
  return replyTo.name ? `"${replyTo.name}" <${replyTo.email}>` : replyTo.email;
};

export const getFrontendBaseUrl = () => {
  const u = process.env.FRONTEND_URL?.trim();
  if (u) return u.replace(/\/$/, '');
  const login = process.env.LOGIN_URL?.trim();
  if (login) return login.replace(/\/login\/?$/, '').replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production' && process.env.DOMAIN?.trim()) {
    const d = process.env.DOMAIN.trim().replace(/^https?:\/\//, '');
    return `https://${d}`;
  }
  return 'http://localhost:5177';
};

const sendEmailWithFallback = async ({ toEmail, toName, subject, html, attachments = [], replyTo }) => {
  const sender = getSenderDetails();
  let brevoFailed = false;

  if (!sender) {
    console.warn('Mail: sender not configured; skipping Brevo');
    brevoFailed = true;
  } else if (!process.env.BREVO_API_KEY) {
    console.warn('Mail: Brevo API key not configured; skipping Brevo');
    brevoFailed = true;
  }

  if (!brevoFailed) {
    try {
      await sendBrevoEmail({
        sender: { email: sender.email, name: sender.name },
        to: { email: toEmail, name: toName },
        subject,
        html,
        replyTo: replyTo ? { email: replyTo.email, name: replyTo.name } : undefined,
      });
      console.log(`[Brevo] Email successfully sent to ${toEmail}`);
      return true;
    } catch (err) {
      console.error(`[Brevo] Failed for ${toEmail}: ${err?.message}`);
      brevoFailed = true;
    }
  }

  if (brevoFailed) {
    console.log(`[Fallback] Attempting to send email using NodeMailer (Gmail SMTP) to ${toEmail}`);
    try {
      await emailService.sendOperationalEmail(toEmail, subject, html, attachments, replyTo);
      console.log(`[Fallback] Email successfully sent via SMTP to ${toEmail}`);
      return true;
    } catch (err) {
      console.error(`[Fallback] SMTP Failed for ${toEmail}: ${err?.message}`);
      return false;
    }
  }
};

const orderLinkHtml = (orderId, baseUrl, label = 'View order') => {
  const base = baseUrl || getFrontendBaseUrl();
  return `<a href="${base.replace(/\/$/, '')}/order/${orderId}">${label}</a>`;
};

export const sendOrderConfirmedEmail = async ({ email, name, order }) => {
  const subject = `Order Confirmed - ${order?._id} | Innovative Hub`;
  const baseUrl = getFrontendBaseUrl();
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p>Hi ${name || 'Customer'},</p>
      <p><strong>Your order has been confirmed.</strong></p>
      <p>Order ID: <strong>${order?._id}</strong></p>
      <p>Total: <strong>â‚¹${Number(order?.totalAmount || 0).toFixed(2)}</strong></p>
      <p>We will notify you when your order is packed and shipped.</p>
      <p>Track your order: ${orderLinkHtml(order?._id, baseUrl, 'View order details')}</p>
      <p>â€” Innovative Hub Team</p>
    </div>
  `;
  await sendEmailWithFallback({ toEmail: email, toName: name, subject, html });
};

export const sendOrderPackedEmail = async ({ email, name, order }) => {
  const subject = `Order Packed - ${order?._id} | Innovative Hub`;
  const baseUrl = getFrontendBaseUrl();
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p>Hi ${name || 'Customer'},</p>
      <p><strong>Your order has been packed and is ready to ship.</strong></p>
      <p>Order ID: <strong>${order?._id}</strong></p>
      <p>Total: <strong>â‚¹${Number(order?.totalAmount || 0).toFixed(2)}</strong></p>
      <p>We will send you another email when it is shipped with tracking details.</p>
      <p>${orderLinkHtml(order?._id, baseUrl, 'View order')}</p>
      <p>â€” Innovative Hub Team</p>
    </div>
  `;
  await sendEmailWithFallback({ toEmail: email, toName: name, subject, html });
};

export const sendOrderShippedEmail = async ({ email, name, order, trackingLink, trackingMessage }) => {
  const subject = `Order Shipped - ${order?._id} | Innovative Hub`;
  const baseUrl = getFrontendBaseUrl();
  const trackingSection = (trackingLink || trackingMessage)
    ? `<p><strong>Tracking:</strong> ${trackingLink ? `<a href="${trackingLink}">Track your shipment</a>` : ''} ${trackingMessage ? ` â€“ ${trackingMessage}` : ''}</p>`
    : '<p>You will receive tracking details soon.</p>';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p>Hi ${name || 'Customer'},</p>
      <p><strong>Your order has been shipped.</strong></p>
      <p>Order ID: <strong>${order?._id}</strong></p>
      <p>Total: <strong>â‚¹${Number(order?.totalAmount || 0).toFixed(2)}</strong></p>
      ${trackingSection}
      <p>${orderLinkHtml(order?._id, baseUrl, 'View order')}</p>
      <p>â€” Innovative Hub Team</p>
    </div>
  `;
  await sendEmailWithFallback({ toEmail: email, toName: name, subject, html });
};

export const sendOrderDeliveredEmail = async ({ email, name, order }) => {
  const orderId = order?._id != null ? String(order._id) : '';
  const subject = `Order Delivered - ${orderId} | Innovative Hub`;
  const baseUrl = getFrontendBaseUrl();
  const orderPageUrl = `${baseUrl}/order/${orderId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p>Hi ${name || 'Customer'},</p>
      <p><strong>Your order has been successfully delivered.</strong></p>
      <p>Order ID: <strong>${orderId}</strong></p>
      <p>Total: <strong>â‚¹${Number(order?.totalAmount || 0).toFixed(2)}</strong></p>
      <p>Thank you for shopping with us. We hope you are satisfied with your purchase.</p>
      <p>You can view your order details here: <a href="${orderPageUrl}">View order</a>.</p>
      <p>â€” Innovative Hub Team</p>
    </div>
  `;

  return sendEmailWithFallback({ toEmail: email, toName: name, subject, html });
};

export const sendOrderFailedEmail = async ({ email, name, reason }) => {
  const subject = 'Payment Failed - Innovative Hub';
  const baseUrl = getFrontendBaseUrl();
  const checkoutUrl = `${baseUrl}/checkout`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p>Hi ${name || 'Customer'},</p>
      <p><strong>Your payment could not be completed.</strong></p>
      ${reason ? `<p>Reason: ${reason}</p>` : ''}
      <p>No order was placed. Your cart items are still saved. You can try again when ready.</p>
      <p><a href="${checkoutUrl}">Go to Checkout</a></p>
      <p>If the problem continues, please contact us or try a different payment method.</p>
      <p>â€” Innovative Hub Team</p>
    </div>
  `;

  return sendEmailWithFallback({ toEmail: email, toName: name, subject, html });
};

/** Sends reset link only. Never includes old/new password or token as plain text. */
export const sendPasswordResetEmail = async ({ email, name, resetUrl }) => {
  const subject = 'Reset your Innovative Hub password';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p>Hi ${name || 'Customer'},</p>
      <p>We received a request to reset your password.</p>
      <p>Click the button below to set a new password:</p>
      <p><a href="${resetUrl}" style="display:inline-block;background:#0d6efd;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:600;">Reset my password</a></p>
      <p>This link will expire in 1 hour. If you did not request this, you can ignore this email.</p>
      <p>â€” Innovative Hub Team</p>
    </div>
  `;

  return sendEmailWithFallback({ toEmail: email, toName: name, subject, html });
};

/** Sends email verification link with a button. Account is active only after user clicks. */
export const sendVerificationEmail = async ({ email, name, verifyUrl }) => {
  const subject = 'Verify your Innovative Hub account';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p>Hi ${name || 'Customer'},</p>
      <p>Thanks for signing up! Please verify your email address to activate your account.</p>
      <p>Click the button below to verify:</p>
      <p><a href="${verifyUrl}" style="display:inline-block;background:#0d6efd;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:600;">Verify my email</a></p>
      <p>This link will expire in 24 hours. If you did not create an account, you can ignore this email.</p>
      <p>â€” Innovative Hub Team</p>
    </div>
  `;

  return sendEmailWithFallback({ toEmail: email, toName: name, subject, html });
};

export const sendContactEmail = async ({ toEmail, fromName, fromEmail, subject, message, attachments, attachmentList }) => {
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>New Contact Message</h2>
      <p><strong>Name:</strong> ${fromName || 'N/A'}</p>
      <p><strong>Email:</strong> ${fromEmail || 'N/A'}</p>
      ${subject ? `<p><strong>Subject:</strong> ${subject}</p>` : ''}
      <p><strong>Message:</strong></p>
      <p>${(message || '').toString().replace(/\n/g, '<br />')}</p>
      ${attachmentList?.length ? `<p><strong>Attachments:</strong> ${attachmentList.join(', ')}</p>` : ''}
    </div>
  `;

  const sent = await sendEmailWithFallback({
    toEmail,
    toName: 'Innovative Hub',
    subject: subject ? `Contact: ${subject}` : 'New Contact Message',
    html,
    attachments: attachments || [],
    replyTo: fromEmail ? { email: fromEmail, name: fromName } : undefined,
  });
  return sent;
};


export const sendWelcomeEmail = async ({ email, name }) => {
  const subject = 'Welcome to Innovative Hub! ðŸš€';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p>Hello ${name || 'User'},</p>
      <p><strong>Welcome to Innovative Hub! ðŸš€</strong></p>
      <p>Your account has been successfully created.</p>
      <p>You're now part of an ecosystem built for <strong>people who don't just learn technology â€” they build with it.</strong></p>
      <p>At Innovative Hub, you can explore:</p>
      <p>ðŸ”§ <strong>Components & Electronics</strong><br>Find the tools and components you need for your next project.</p>
      <p>ðŸ¤– <strong>Projects & Project Kits</strong><br>Turn ideas into working prototypes through practical projects.</p>
      <p>ðŸ“š <strong>Learning & Workshops</strong><br>Learn robotics, electronics, embedded systems, IoT and emerging technologies.</p>
      <p>ðŸ’¡ <strong>Innovation & Product Development</strong><br>Explore ideas, develop prototypes and work towards real-world solutions.</p>
      <p>Your account is your starting point.<br><strong>What you build from here is up to you.</strong></p>
      <h3>Think. Build. Innovate.</h3>
      <p>We're excited to have you with us and look forward to seeing what you create.</p>
      <p><strong>Welcome to the Hub.</strong></p>
      <p>Regards,<br><strong>Team Innovative Hub</strong><br><em>Where Ideas Become Innovation.</em></p>
      <p>ðŸŒ <a href="http://www.inovative-hub.com">www.inovative-hub.com</a></p>
      <p style="font-size: 0.85em; color: #555; margin-top: 20px;"><em>This is an automated email. Please do not reply to this message.</em></p>
    </div>
  `;
  await sendEmailWithFallback({ toEmail: email, toName: name, subject, html });
};


export const sendOrderSuccessEmail = async ({ email, name, order }) => {
  return sendOrderConfirmedEmail({ email, name, order });
};

export const sendInternshipApplicationEmail = async ({ email, name, category }) => {
  const subject = 'Internship Application Received - Innovative Hub';
  const categoryName = category === 'paid' ? 'Paid Internship' : 'Self-Funded Internship';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p>Hello ${name || 'Applicant'},</p>
      <p><strong>Your internship application has been received successfully!</strong></p>
      <p>Thank you for applying for the <strong>${categoryName}</strong> program at Innovative Hub.</p>
      <p>Our team will review your application and get back to you shortly with further updates.</p>
      <p>If you have any questions, feel free to contact us.</p>
      <br/>
      <p>Regards,<br><strong>Team Innovative Hub</strong></p>
    </div>
  `;
  await sendEmailWithFallback({ toEmail: email, toName: name, subject, html });
};

