import mongoose from 'mongoose';

const sessionSlotSchema = new mongoose.Schema({
  tutorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true }, // e.g. "14:00 - 15:00"
  topic: { type: String, required: true },
  cost: { type: Number, required: true, default: 0 },
  status: { type: String, enum: ['available', 'booked'], default: 'available' },
  bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  paymentId: { type: String },
  meetingLink: { type: String }
}, { timestamps: true });

const SessionSlot = mongoose.model('SessionSlot', sessionSlotSchema);

export default SessionSlot;
