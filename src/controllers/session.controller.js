import crypto from 'crypto';
import Razorpay from 'razorpay';
import SessionSlot from '../models/SessionSlot.model.js';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const checkTutorApproval = (req, res) => {
  if (req.user.role !== 'tutor' || req.user.tutorStatus !== 'approved') {
    res.status(403).json({ success: false, message: 'Access denied. Tutors must be approved.' });
    return false;
  }
  return true;
};

// Generate a random meeting link (Google Meet style)
const generateMeetingLink = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `https://meet.google.com/${part1}-${part2}-${part3}`;
};

export const createSlot = async (req, res, next) => {
  try {
    if (!checkTutorApproval(req, res)) return;

    const { date, time, topic, cost } = req.body;
    if (!date || !time || !topic) {
      return res.status(400).json({ success: false, message: 'Date, time, and topic are required' });
    }

    const slot = await SessionSlot.create({
      tutorId: req.userId,
      date: new Date(date),
      time,
      topic,
      cost: cost || 0,
      status: 'available'
    });

    res.status(201).json({ success: true, message: 'Session slot created successfully', data: slot });
  } catch (error) {
    next(error);
  }
};

export const getAvailableSlots = async (req, res, next) => {
  try {
    const { tutorId } = req.query;
    const filter = { status: 'available', date: { $gte: new Date() } };

    if (tutorId) {
      filter.tutorId = tutorId;
    }

    const slots = await SessionSlot.find(filter)
      .populate('tutorId', 'name profileImage bio expertise')
      .sort({ date: 1, time: 1 });

    res.json({ success: true, data: slots });
  } catch (error) {
    next(error);
  }
};

export const getTutorSlots = async (req, res, next) => {
  try {
    if (!checkTutorApproval(req, res)) return;

    const slots = await SessionSlot.find({ tutorId: req.userId })
      .populate('bookedBy', 'name email mobile')
      .sort({ date: 1, time: 1 });

    res.json({ success: true, data: slots });
  } catch (error) {
    next(error);
  }
};

export const getStudentSessions = async (req, res, next) => {
  try {
    const sessions = await SessionSlot.find({ bookedBy: req.userId })
      .populate('tutorId', 'name profileImage bio expertise')
      .sort({ date: 1, time: 1 });

    res.json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
};

export const bookSlot = async (req, res, next) => {
  try {
    const slot = await SessionSlot.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Session slot not found' });
    }

    if (slot.status !== 'available') {
      return res.status(400).json({ success: false, message: 'Slot is already booked' });
    }

    // If cost is 0, book immediately
    if (slot.cost === 0) {
      slot.status = 'booked';
      slot.bookedBy = req.userId;
      slot.paymentId = 'free';
      slot.meetingLink = generateMeetingLink();
      await slot.save();
      return res.json({ success: true, booked: true, data: slot });
    }

    // Otherwise, create Razorpay Order
    const order = await razorpay.orders.create({
      amount: Math.round(slot.cost * 100),
      currency: 'INR',
      receipt: `slot_${slot._id}_${Date.now()}`,
    });

    res.json({
      success: true,
      booked: false,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        cost: slot.cost
      }
    });
  } catch (error) {
    next(error);
  }
};

export const verifyBooking = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment payload' });
    }

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    const slot = await SessionSlot.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Session slot not found' });
    }

    if (slot.status !== 'available') {
      return res.status(400).json({ success: false, message: 'Slot is already booked' });
    }

    slot.status = 'booked';
    slot.bookedBy = req.userId;
    slot.paymentId = razorpay_payment_id;
    slot.meetingLink = generateMeetingLink();
    await slot.save();

    res.json({ success: true, data: slot });
  } catch (error) {
    next(error);
  }
};
