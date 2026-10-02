import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;
mongoose.connect(uri)
  .then(async () => {
    const ProjectBooking = (await import('./src/models/ProjectBooking.model.js')).default;
    const bookings = await ProjectBooking.find().sort({ createdAt: -1 }).limit(1);
    if (bookings.length > 0) {
      console.log('Latest booking attachments:', bookings[0].attachments);
    } else {
      console.log('No bookings found.');
    }
    mongoose.disconnect();
  });
