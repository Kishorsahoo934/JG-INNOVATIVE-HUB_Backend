import mongoose from 'mongoose';

const visitorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, default: 'visitors' },
    count: { type: Number, required: true, default: 153245 },
  },
  { timestamps: true }
);

const Visitor = mongoose.model('Visitor', visitorSchema);

export default Visitor;
