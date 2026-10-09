import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' }
});
adminSchema.methods.comparePassword = async function(candidate) {
  return await bcrypt.compare(candidate, this.password);
};

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  const email = 'eshopadmin@jg.com';
  const password = 'eshopadmin123';
  
  const existing = await Admin.findOne({ email });
  if (existing) {
    existing.password = await bcrypt.hash(password, 10);
    existing.role = 'eshop_admin';
    await existing.save();
    console.log('Updated existing eshopadmin user');
  } else {
    const hashed = await bcrypt.hash(password, 10);
    await Admin.create({ email, password: hashed, role: 'eshop_admin' });
    console.log('Created eshopadmin user');
  }
  process.exit(0);
}
seed().catch(console.error);
