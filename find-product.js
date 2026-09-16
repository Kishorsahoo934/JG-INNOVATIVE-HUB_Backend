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

  const { default: DevelopedProduct } = await import('./src/models/DevelopedProduct.model.js');
  const { default: Product } = await import('./src/models/Product.model.js');

  const name = "Smart Home";
  
  let dp = await DevelopedProduct.find({ name: new RegExp(name, 'i') });
  if (dp.length > 0) {
    console.log('Found in DevelopedProduct:');
    dp.forEach(d => console.log(' - ' + d.name));
  }

  let p = await Product.find({ name: new RegExp(name, 'i') });
  if (p.length > 0) {
    console.log('Found in Product:');
    p.forEach(d => console.log(' - ' + d.name));
  }

  mongoose.disconnect();
}

run().catch(console.error);

