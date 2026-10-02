import mongoose from 'mongoose';

const projectBookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    message: { type: String, required: true },
    amount: { type: Number, required: true, default: 49 },
    razorpay_order_id: { type: String, required: true },
    razorpay_payment_id: { type: String, required: true },
    company: { type: String },
    productName: { type: String },
    productCategory: { type: String },
    currentStage: { type: String },
    estimatedBudget: { type: String },
    expectedTimeline: { type: String },
    problemStatement: { type: String },
    detailedDescription: { type: String },
    attachments: [{ url: String, publicId: String, filename: String }],
    processStage: { 
      type: String, 
      enum: ['Idea Submitted', 'Requirement Discussion', 'Project Confirmation', 'Design & Development', 'Testing & Delivery', 'Completed'],
      default: 'Idea Submitted'
    },
    status: { type: String, enum: ['paid', 'completed'], default: 'paid' }
  },
  { timestamps: true }
);

export default mongoose.model('ProjectBooking', projectBookingSchema);
