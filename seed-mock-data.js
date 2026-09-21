import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Workshop from './src/models/Workshop.model.js';
import Internship from './src/models/Internship.model.js';
import User from './src/models/User.model.js';

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected for Seeding');

    // Delete existing to start fresh (optional, but let's just delete the dummy ones)
    // Actually let's just insert so we don't accidentally delete real data.
    
    // Find a real user to attach to, or create a dummy ObjectId
    let dummyUser = await User.findOne();
    const studentId = dummyUser ? dummyUser._id : new mongoose.Types.ObjectId();

    const mockWorkshops = [
      {
        title: 'Mastering IoT with ESP32',
        description: 'Learn how to build real-world IoT applications using ESP32, MQTT, and cloud integrations. Perfect for beginners and intermediate developers looking to connect hardware to the web.',
        hostName: 'Dr. Alan Smith',
        hostEmail: 'alan.smith@example.com',
        hostLinkedIn: 'https://linkedin.com/in/alansmith',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        time: '10:00 AM',
        duration: '2 Hours',
        meetingLink: 'https://meet.google.com/abc-defg-hij',
        googleFormLink: 'https://forms.gle/mocklink1',
        status: 'approved',
        showOnHomepage: true,
        thumbnail: 'https://res.cloudinary.com/dcb4ilgmr/image/upload/v1727766258/iot-workshop_a1c2d.jpg' // Using a placeholder or I can leave empty
      },
      {
        title: 'Advanced PCB Design with KiCad',
        description: 'An intensive workshop covering multi-layer routing, impedance control, and DFM (Design for Manufacturing) guidelines. Bring your own laptop with KiCad installed.',
        hostName: 'Sarah Jenkins',
        hostEmail: 'sarah.j@example.com',
        hostLinkedIn: 'https://linkedin.com/in/sarahjenkins',
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        time: '02:00 PM',
        duration: '3 Hours',
        meetingLink: 'https://meet.google.com/xyz-uvwx-yz1',
        googleFormLink: 'https://forms.gle/mocklink2',
        status: 'approved',
        showOnHomepage: true,
      },
      {
        title: 'Robotics & Autonomous Navigation',
        description: 'Explore the basics of ROS (Robot Operating System), SLAM algorithms, and sensor fusion for autonomous mobile robots.',
        hostName: 'Innovate Robotics Team',
        hostEmail: 'robotics@inovative-hub.com',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago (past workshop)
        time: '11:00 AM',
        duration: '4 Hours',
        meetingLink: 'https://zoom.us/j/123456789',
        googleFormLink: 'https://forms.gle/mocklink3',
        status: 'approved',
        showOnHomepage: false,
      }
    ];

    const mockInternships = [
      {
        studentId,
        name: 'John Doe',
        email: 'john.doe@example.com',
        mobile: '+91 9876543210',
        skills: ['C/C++ Programming', 'Arduino & ESP32 Microcontrollers'],
        resumeUrl: 'https://example.com/resume-john.pdf',
        portfolioUrl: 'https://github.com/johndoe',
        category: 'paid',
        status: 'pending',
        yearOfStudy: '3rd-year',
        paymentStatus: 'free'
      },
      {
        studentId,
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        mobile: '+91 8765432109',
        skills: ['Python Programming', 'ROS / ROS2 (Robot Operating System)'],
        resumeUrl: 'https://example.com/resume-jane.pdf',
        linkedinUrl: 'https://linkedin.com/in/janesmith',
        category: 'self-funded',
        tier: '45-days',
        status: 'under-review',
        yearOfStudy: '4th-year',
        paymentStatus: 'paid',
        paymentId: 'pay_MockId12345',
        razorpayOrderId: 'order_MockId12345'
      },
      {
        studentId: new mongoose.Types.ObjectId(), // another random student
        name: 'Rahul Kumar',
        email: 'rahul.k@example.com',
        mobile: '+91 7654321098',
        skills: ['PCB Designing (KiCad / Altium)', '3D CAD Modeling (Fusion360/SolidWorks)'],
        resumeUrl: 'https://example.com/resume-rahul.pdf',
        category: 'self-funded',
        tier: '2-month',
        status: 'shortlisted',
        yearOfStudy: '2nd-year',
        paymentStatus: 'paid',
        paymentId: 'pay_MockId67890',
        razorpayOrderId: 'order_MockId67890'
      }
    ];

    console.log('Inserting Workshops...');
    await Workshop.insertMany(mockWorkshops);

    console.log('Inserting Internships...');
    await Internship.insertMany(mockInternships);

    console.log('Mock Data Seeded Successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error Seeding Data:', err);
    process.exit(1);
  }
};

seedData();

