import mongoose from 'mongoose';

const internshipPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, enum: ['paid', 'self-funded'], required: true },
  tier: { type: String },
  skills: [{ type: String }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const InternshipPost = mongoose.model('InternshipPost', internshipPostSchema);
export default InternshipPost;
