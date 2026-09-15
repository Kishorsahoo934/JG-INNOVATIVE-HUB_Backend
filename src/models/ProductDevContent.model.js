import mongoose from 'mongoose';

const productDevContentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['process', 'service', 'faq', 'feature'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    icon: {
      type: String,
      default: ''
    },
    stepNumber: {
      type: String,
      default: ''
    },
    order: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Indexes
productDevContentSchema.index({ type: 1, isActive: 1, order: 1 });

const ProductDevContent = mongoose.model('ProductDevContent', productDevContentSchema);

export default ProductDevContent;

