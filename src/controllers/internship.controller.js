import crypto from 'crypto';
import Razorpay from 'razorpay';
import Internship from '../models/Internship.model.js';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// CREATE RAZORPAY PAYMENT ORDER
export const createInternshipPaymentOrder = async (req, res, next) => {
  try {
    const { tier } = req.body;
    let amount = 0;
    if (tier === '1-month') amount = 299;
    else if (tier === '45-days') amount = 399;
    else if (tier === '2-month') amount = 499;
    else {
      return res.status(400).json({ success: false, message: 'Invalid or missing tier' });
    }

    const order = await razorpay.orders.create({
      amount: amount * 100, // in paise
      currency: 'INR',
      receipt: `rcpt_intern_${Date.now()}`,
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    next(error);
  }
};

// SUBMIT INTERNSHIP APPLICATION (Free for Paid Intern, Verified for Self-Funded)
export const applyForInternship = async (req, res, next) => {
  try {
    const { 
      name, 
      email, 
      mobile, 
      skills, 
      resumeUrl, 
      coverLetter, 
      portfolioUrl,
      category,
      tier,
      yearOfStudy,
      githubUrl,
      linkedinUrl,
      personalPortfolioUrl,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (!name || !email || !mobile || !resumeUrl) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, mobile, and resumeUrl are required'
      });
    }

    let paymentStatus = 'free';

    if (category === 'self-funded') {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: 'Payment verification details are required for self-funded internships.'
        });
      }

      // Verify signature
      const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (expected !== razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed (signature mismatch).'
        });
      }

      paymentStatus = 'paid';
    }

    const application = await Internship.create({
      studentId: req.userId,
      name,
      email: email.toLowerCase(),
      mobile,
      skills: Array.isArray(skills) ? skills : [],
      resumeUrl,
      coverLetter: coverLetter || '',
      portfolioUrl,
      category,
      tier,
      yearOfStudy,
      githubUrl,
      linkedinUrl,
      personalPortfolioUrl,
      status: 'pending',
      paymentStatus,
      paymentId: razorpay_payment_id || undefined,
      razorpayOrderId: razorpay_order_id || undefined
    });

    res.status(201).json({
      success: true,
      message: 'Internship application submitted successfully.',
      data: application
    });
  } catch (error) {
    next(error);
  }
};

// GET MY APPLICATIONS
export const getMyApplications = async (req, res, next) => {
  try {
    const applications = await Internship.find({
      studentId: req.userId
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: applications });
  } catch (error) {
    next(error);
  }
};
