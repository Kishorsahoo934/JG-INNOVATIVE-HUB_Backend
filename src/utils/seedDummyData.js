import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import User from '../models/User.model.js';
import Admin from '../models/Admin.model.js';
import SessionSlot from '../models/SessionSlot.model.js';
import Workshop from '../models/Workshop.model.js';
import Internship from '../models/Internship.model.js';

dotenv.config();

const seedAllDummyData = async () => {
  try {
    // Connect to database
    await connectDB();

    console.log('Cleaning up existing database...');
    
    // Clear slots, workshops, internships
    await SessionSlot.deleteMany({});
    await Workshop.deleteMany({});
    await Internship.deleteMany({});

    // Delete existing seed users (tutors & students)
    const seedEmails = [
      'croft@innovativehub.com', 
      'aisha@innovativehub.com', 
      'liam@innovativehub.com',
      'student1@innovativehub.com',
      'student2@innovativehub.com'
    ];
    await User.deleteMany({ email: { $in: seedEmails } });

    // Seed Admin
    console.log('Seeding admin...');
    const adminEmail = "admin@innovativehub.com";
    const existingAdmin = await Admin.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const admin = new Admin({ email: adminEmail, password: "adminPassword123!" });
      await admin.save();
      console.log(`Created admin: ${admin.email}`);
    } else {
      console.log(`Admin already exists: ${existingAdmin.email}`);
    }

    console.log('Seeding approved tutors...');

    const tutorsData = [
      {
        name: 'Dr. Ryan Croft',
        email: 'croft@innovativehub.com',
        password: 'Password123',
        mobile: '9876543210',
        mobileVerified: true,
        role: 'tutor',
        tutorStatus: 'approved',
        bio: 'Dr. Ryan Croft is a former NASA JPL researcher specializing in robot manipulator kinematics and ROS2 interface design. He has over 15 years of experience building autonomous navigation stacks.',
        expertise: ['ROS', 'ROS2', 'Kinematics', 'Autonomous Navigation'],
        profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        socials: { linkedin: 'https://linkedin.com/in/ryancroft' },
        education: { college: 'MIT', graduationYear: 2010, course: 'Ph.D. Robotics' }
      },
      {
        name: 'Aisha Sharma',
        email: 'aisha@innovativehub.com',
        password: 'Password123',
        mobile: '9876543211',
        mobileVerified: true,
        role: 'tutor',
        tutorStatus: 'approved',
        bio: 'Aisha is an embedded systems engineer and open-source enthusiast. She designs industrial IoT nodes and custom firmware for drone avionics. Expert in Arduino and Espressif ESP32.',
        expertise: ['Arduino', 'ESP32', 'Firmware', 'Avionics', 'IoT'],
        profileImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
        socials: { linkedin: 'https://linkedin.com/in/aishasharma' },
        education: { college: 'IIT Delhi', graduationYear: 2015, course: 'M.Tech Electronics' }
      },
      {
        name: 'Liam Vance',
        email: 'liam@innovativehub.com',
        password: 'Password123',
        mobile: '9876543212',
        mobileVerified: true,
        role: 'tutor',
        tutorStatus: 'approved',
        bio: 'Liam Vance designs feedback loop controllers for sub-sea exploration robots. He focuses on low-level motor controls, Arduino firmware, and sensor integration techniques.',
        expertise: ['Arduino', 'Control Systems', 'Firmware', 'Sensors'],
        profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        socials: { linkedin: 'https://linkedin.com/in/liamvance' },
        education: { college: 'Stanford University', graduationYear: 2018, course: 'B.S. Electrical Engineering' }
      }
    ];

    const createdTutors = [];
    for (const tData of tutorsData) {
      const tutor = new User(tData);
      await tutor.save();
      createdTutors.push(tutor);
      console.log(`Created tutor: ${tutor.name}`);
    }
    const [croft, aisha, liam] = createdTutors;

    console.log('Seeding dummy students...');
    const studentsData = [
      {
        name: 'Alex Student',
        email: 'student1@innovativehub.com',
        password: 'Password123',
        role: 'student',
        mobile: '1112223334',
        mobileVerified: true,
        profileImage: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=150&q=80',
      },
      {
        name: 'Jordan Learner',
        email: 'student2@innovativehub.com',
        password: 'Password123',
        role: 'student',
        mobile: '5556667778',
        mobileVerified: true,
        profileImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
      }
    ];

    for (const sData of studentsData) {
      const student = new User(sData);
      await student.save();
      console.log(`Created student: ${student.name}`);
    }
    console.log('Seeding available tutoring slots...');

    const getFutureDate = (daysAhead) => {
      const date = new Date();
      date.setDate(date.getDate() + daysAhead);
      date.setHours(0, 0, 0, 0);
      return date;
    };

    const slotsData = [
      { tutorId: croft._id, date: getFutureDate(1), time: '10:00 AM - 11:00 AM', topic: 'ROS', cost: 499, status: 'available' },
      { tutorId: croft._id, date: getFutureDate(2), time: '11:00 AM - 12:00 PM', topic: 'ROS2', cost: 0, status: 'available' },
      { tutorId: aisha._id, date: getFutureDate(1), time: '09:00 AM - 10:00 AM', topic: 'IoT', cost: 399, status: 'available' },
      { tutorId: aisha._id, date: getFutureDate(2), time: '04:00 PM - 05:00 PM', topic: 'ESP32', cost: 399, status: 'available' },
      { tutorId: liam._id, date: getFutureDate(1), time: '11:00 AM - 12:00 PM', topic: 'Arduino', cost: 299, status: 'available' }
    ];

    await SessionSlot.insertMany(slotsData);
    console.log('Seeded available session slots.');

    console.log('Seeding approved workshops...');
    const workshopsData = [];

    await Workshop.insertMany(workshopsData);
    console.log('Seeded approved workshops.');

    console.log('Database seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error.message || error);
    process.exit(1);
  }
};

seedAllDummyData();
