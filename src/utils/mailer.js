import { sendBrevoEmail } from '../services/brevoEmail.service.js';

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
  if (!sender) {
    console.warn('Mail: sender not configured (set SMTP_FROM or SMTP_USER); skipping email');
    return false;
  }

  if (!process.env.BREVO_API_KEY) {
    console.warn('Mail: Brevo API key not configured; skipping email');
    return false;
  }

  try {
    await sendBrevoEmail({
      sender: {
        email: sender.email,
        name: sender.name,
      },
      to: {
        email: toEmail,
        name: toName,
      },
      subject,
      html,
      replyTo: replyTo ? { email: replyTo.email, name: replyTo.name } : undefined,
    });
    return true;
  } catch (err) {
    // Keep the provider response in Render logs. It is the actionable reason
    // for delivery failures (invalid key, unverified sender, IP restriction,
    // quota, etc.) without exposing it to a public API response.
    console.error(`[Brevo] Email failed for ${toEmail}: ${err?.message || String(err)}`);
    return false;
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
      <p>Total: <strong>₹${Number(order?.totalAmount || 0).toFixed(2)}</strong></p>
      <p>We will notify you when your order is packed and shipped.</p>
      <p>Track your order: ${orderLinkHtml(order?._id, baseUrl, 'View order details')}</p>
      <p>— Innovative Hub Team</p>
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
      <p>Total: <strong>₹${Number(order?.totalAmount || 0).toFixed(2)}</strong></p>
      <p>We will send you another email when it is shipped with tracking details.</p>
      <p>${orderLinkHtml(order?._id, baseUrl, 'View order')}</p>
      <p>— Innovative Hub Team</p>
    </div>
  `;
  await sendEmailWithFallback({ toEmail: email, toName: name, subject, html });
};

export const sendOrderShippedEmail = async ({ email, name, order, trackingLink, trackingMessage }) => {
  const subject = `Order Shipped - ${order?._id} | Innovative Hub`;
  const baseUrl = getFrontendBaseUrl();
  const trackingSection = (trackingLink || trackingMessage)
    ? `<p><strong>Tracking:</strong> ${trackingLink ? `<a href="${trackingLink}">Track your shipment</a>` : ''} ${trackingMessage ? ` – ${trackingMessage}` : ''}</p>`
    : '<p>You will receive tracking details soon.</p>';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p>Hi ${name || 'Customer'},</p>
      <p><strong>Your order has been shipped.</strong></p>
      <p>Order ID: <strong>${order?._id}</strong></p>
      <p>Total: <strong>₹${Number(order?.totalAmount || 0).toFixed(2)}</strong></p>
      ${trackingSection}
      <p>${orderLinkHtml(order?._id, baseUrl, 'View order')}</p>
      <p>— Innovative Hub Team</p>
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
      <p>Total: <strong>₹${Number(order?.totalAmount || 0).toFixed(2)}</strong></p>
      <p>Thank you for shopping with us. We hope you are satisfied with your purchase.</p>
      <p>You can view your order details here: <a href="${orderPageUrl}">View order</a>.</p>
      <p>— Innovative Hub Team</p>
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
      <p>— Innovative Hub Team</p>
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
      <p>— Innovative Hub Team</p>
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
      <p>— Innovative Hub Team</p>
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
  const subject = 'Welcome to Innovative Hub';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p>Hi ${name || 'Customer'},</p>
      <p>Welcome to Innovative Hub!</p>
      <p>Your account has been successfully verified.</p>
      <p>We are excited to have you on board.</p>
      <p>- Innovative Hub Team</p>
    </div>
  `;
  await sendEmailWithFallback({ toEmail: email, toName: name, subject, html });
};


export const sendOrderSuccessEmail = async ({ email, name, order }) => {
  return sendOrderConfirmedEmail({ email, name, order });
};
