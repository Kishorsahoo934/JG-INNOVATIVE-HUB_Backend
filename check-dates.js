import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const workshops = await mongoose.connection.db.collection('workshops').find({}).toArray();
    console.log(workshops.map(w => ({ title: w.title, date: w.date, status: w.status, showOnHomepage: w.showOnHomepage })));
    process.exit(0);
}).catch(console.error);

