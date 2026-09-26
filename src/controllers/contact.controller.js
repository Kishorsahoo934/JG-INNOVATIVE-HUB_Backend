import { sendContactEmail } from '../utils/mailer.js';
import ConsultationBooking from '../models/ConsultationBooking.model.js';

export const submitContactForm = async (req, res, next) => {
  try {
    const body = req.body || {};
    const name = (body.name || '').trim();
    const email = (body.email || '').trim();
    const subject = (body.subject || '').trim();
    const message = (body.message || '').trim();

    if (!name || !email || !message) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Contact validation failed. req.body keys:', Object.keys(body));
      }
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required.',
      });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    const attachments = files
      .filter((file) => file && file.buffer)
      .map((file) => ({
        filename: file.originalname || 'attachment',
        content: file.buffer,
        contentType: file.mimetype,
      }));
    const attachmentList = files.map((f) => `${f.originalname || 'file'} (${Math.round((f.size || 0) / 1024)} KB)`);

    const receiver = process.env.CONTACT_RECEIVER_EMAIL || 'supportinnovativehub@gmail.com';

    const sent = await sendContactEmail({
      toEmail: receiver,
      fromName: name,
      fromEmail: email,
      subject: subject || undefined,
      message,
      attachments,
      attachmentList,
    });

    if (!sent) {
      return res.status(503).json({
        success: false,
        message: 'Email service is temporarily unavailable. Please try again later or contact us by phone.',
      });
    }

    res.status(200).json({ success: true, message: 'Contact message sent successfully' });
  } catch (error) {
    console.error('Contact form error:', error?.message || error);
    next(error);
  }
};

import Razorpay from 'razorpay';
import crypto from 'crypto';

let _razorpay = null;
function getRazorpay() {
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
}

export const createConsultationOrder = async (req, res, next) => {
  try {
    const order = await getRazorpay().orders.create({
      amount: 49 * 100, // 49 INR
      currency: 'INR',
      receipt: `consult_${Date.now()}`,
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      }
    });
  } catch (error) {
    next(error);
  }
};

export const submitConsultationForm = async (req, res, next) => {
  try {
    const { 
      name, email, phone, message, subject, 
      razorpay_order_id, razorpay_payment_id, razorpay_signature 
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment details are required.' });
    }

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
    }

    const receiver = process.env.CONTACT_RECEIVER_EMAIL || 'supportinnovativehub@gmail.com';
    const emailBody = `Payment of ₹49 received!\n\nUser: ${req.user.name} (${req.user.email})\nPhone: ${phone}\n\n${message}`;


    const files = Array.isArray(req.files) ? req.files : [];
    const attachments = files
      .filter((file) => file && file.buffer)
      .map((file) => ({
        filename: file.originalname || 'attachment',
        content: file.buffer,
        contentType: file.mimetype,
      }));
    const attachmentList = files.map((f) => `${f.originalname || 'file'} (${Math.round((f.size || 0) / 1024)} KB)`);

    const sent = await sendContactEmail({
      toEmail: receiver,
      fromName: name,
      fromEmail: email,
      subject: subject || 'Consultation Booking (Paid)',
      message: emailBody,
      attachments,
      attachmentList,
    });


    if (!sent) {
      return res.status(503).json({ success: false, message: 'Payment verified, but failed to send email notification.' });
    }


    // Extract Product Dev specific fields if present (they are sent as form-data so they are in req.body)
    const { 
      company, productName, productCategory, currentStage, estimatedBudget, expectedTimeline, problemStatement, detailedDescription
    } = req.body;

    // Send confirmation email to the user!
    const userEmailBody = `Hello ${name},

Your product development idea has been submitted successfully!

Our engineering team has received your consultation booking and will review your requirements. We will contact you shortly to schedule our Requirement Discussion.

Thank you for choosing JG Innovative Hub!`;
    await sendContactEmail({
      toEmail: email,
      fromName: 'JG Innovative Hub',
      fromEmail: 'supportinnovativehub@gmail.com',
      subject: 'Idea Submission Successful - Product Development',
      message: userEmailBody
    }).catch(err => console.error("Failed to send user confirmation email", err));

    // Save to Database
    const booking = new ConsultationBooking({
      user: req.user._id,
      name,
      email,
      phone,
      message,
      company,
      productName,
      productCategory,
      currentStage,
      estimatedBudget,
      expectedTimeline,
      problemStatement,
      detailedDescription,
      amount: 49,
      razorpay_order_id,
      razorpay_payment_id
    });
    await booking.save();


    res.status(200).json({ success: true, message: 'Consultation booked successfully!' });
  } catch (error) {
    console.error('Consultation form error:', error?.message || error);
    next(error);
  }
};

export const getMyConsultations = async (req, res, next) => {
  try {
    const bookings = await ConsultationBooking.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
};
