import mongoose from 'mongoose';

const developedProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    longDescription: {
      type: String,
      required: true
    },
    tag: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, default: '' }
      }
    ],
    features: [
      {
        type: String,
        trim: true
      }
    ],
    status: {
      type: String,
      enum: ['Available', 'Coming Soon', 'Under Research'],
      default: 'Available'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Indexes for fast searching and filtering
developedProductSchema.index({ category: 1, isActive: 1 });
developedProductSchema.index({ status: 1, isActive: 1 });

const DevelopedProduct = mongoose.model('DevelopedProduct', developedProductSchema);

export default DevelopedProduct;

