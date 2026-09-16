import mongoose from 'mongoose';

const consultationBookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    message: { type: String, required: true },
    amount: { type: Number, required: true, default: 49 },
    razorpay_order_id: { type: String, required: true },
    razorpay_payment_id: { type: String, required: true },
    status: { type: String, enum: ['paid', 'completed'], default: 'paid' }
  },
  { timestamps: true }
);

export default mongoose.model('ConsultationBooking', consultationBookingSchema);

