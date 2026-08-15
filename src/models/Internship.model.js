import mongoose from 'mongoose';

const internshipSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  skills: [{ type: String }],
  resumeUrl: { type: String, required: true },
  coverLetter: { type: String },
  portfolioUrl: { type: String },
  category: { type: String, enum: ['paid', 'self-funded'], default: 'paid' },
  tier: { type: String },
  yearOfStudy: { type: String },
  githubUrl: { type: String },
  linkedinUrl: { type: String },
  personalPortfolioUrl: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'under-review', 'shortlisted', 'rejected'], 
    default: 'pending' 
  },
  paymentStatus: { type: String, enum: ['free', 'pending', 'paid', 'failed'], default: 'free' },
  paymentId: { type: String },
  razorpayOrderId: { type: String }
}, { timestamps: true });

const Internship = mongoose.model('Internship', internshipSchema);

export default Internship;
