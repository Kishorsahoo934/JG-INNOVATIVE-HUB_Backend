import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const pendingUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    password: { type: String, required: true },
    mobile: { type: String },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: '24h' } } // Auto-delete after 24h
  },
  { timestamps: true }
);

pendingUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcryptjs.hash(this.password, 10);
  next();
});

export default mongoose.model('PendingUser', pendingUserSchema);

