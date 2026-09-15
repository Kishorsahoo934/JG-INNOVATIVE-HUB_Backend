import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const { default: Product } = await import('./src/models/Product.model.js');

  const name = "Smart Home Automation Kit (IoT)";
  
  let p = await Product.findOne({ name: new RegExp('Smart Home Automation', 'i') });
  if (p) {
    console.log('Found in Product:', p.name);
    p.images = [{ url: '/images/project-kit-bg.jpg', publicId: '' }];
    await p.save();
    console.log('Updated Product');
  } else {
    console.log('Not found in Product');
  }

  mongoose.disconnect();
}

run().catch(console.error);
