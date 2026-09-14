import 'dotenv/config';
import connectDB from './config/db.js';
import app from './app.js';
import Admin from './models/Admin.model.js';

// Prevent unhandled promise rejections from crashing the process
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Create default admin if ADMIN_EMAIL and ADMIN_PASSWORD are provided
const ensureAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminRole = process.env.ADMIN_ROLE || 'admin';
    const adminIsActive = process.env.ADMIN_IS_ACTIVE
      ? process.env.ADMIN_IS_ACTIVE.toLowerCase() === 'true'
      : true;
    if (adminEmail && adminPassword) {
      const existing = await Admin.findOne({ email: adminEmail.toLowerCase() });
      if (!existing) {
        await Admin.create({
          email: adminEmail.toLowerCase(),
          password: adminPassword,
          role: adminRole,
          isActive: adminIsActive
        });
        console.log('Default admin created');
      }
    }
  } catch (err) {
    console.error('Failed to ensure admin:', err.message || err);
  }
};

const startServer = async () => {
  try {
    // 1. Wait for database connection FIRST before doing anything else
    await connectDB();
    
    // 2. Ensure default admin exists
    await ensureAdmin();

    // 3. Start the server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () =>
      console.log(`Backend running on port ${PORT}`)
    );
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();