import 'dotenv/config';
import cors from 'cors';
import connectDB from './config/db.js';
import app from './app.js';
import Admin from './models/Admin.model.js';

const isAllowedOriginServer = (origin) => {
  if (!origin) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  if (origin.endsWith('.inovative-hub.com') || origin.endsWith('.innovative-hub.com')) return true;
  if (origin === 'https://inovative-hub.com' || origin === 'https://innovative-hub.com') return true;
  if (origin.endsWith('.vercel.app') || origin.endsWith('.netlify.app')) return true;
  return false;
};

const corsOptions = {
  origin: function (origin, callback) {
    if (isAllowedOriginServer(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));

// Prevent unhandled promise rejections from crashing the process
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Create or update default admins: main admin and eshop admin
const ensureAdmins = async () => {
  try {
    const requiredAdmins = [
      {
        email: 'admin@inovative-hub.com',
        password: 'Admin@12345',
        role: 'superadmin',
        isActive: true,
      },
      {
        email: 'supportinnovativehub@gmail.com',
        password: 'Admin@12345',
        role: 'eshop_admin',
        isActive: true,
      },
    ];

    for (const adminData of requiredAdmins) {
      let admin = await Admin.findOne({ email: adminData.email.toLowerCase() });
      if (!admin) {
        admin = new Admin({
          email: adminData.email.toLowerCase(),
          password: adminData.password,
          role: adminData.role,
          isActive: adminData.isActive,
        });
        await admin.save();
        console.log(`Default admin created: ${adminData.email}`);
      } else {
        admin.password = adminData.password;
        admin.role = adminData.role;
        admin.isActive = true;
        await admin.save();
        console.log(`Default admin verified/updated: ${adminData.email}`);
      }
    }
  } catch (err) {
    console.error('Failed to ensure admins:', err.message || err);
  }
};

const startServer = async () => {
  try {
    // 1. Wait for database connection
    await connectDB();

    // 2. Ensure default admins exist
    await ensureAdmins();

    // 3. Start server
    const PORT = process.env.PORT || 5000;

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();