import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const res = await mongoose.connection.db.collection('workshops').updateMany({}, { $set: { status: 'approved' } });
    console.log('Updated', res.modifiedCount, 'workshops to approved');
    process.exit(0);
}).catch(console.error);

