import jwt from "jsonwebtoken";
import Admin from "../models/Admin.model.js";

export const adminLogin = async (req, res) => {
  try {
    const { email, password, panel } = req.body;
    const clientPanel = (panel || req.headers['x-admin-panel'] || '').toLowerCase();

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Enforce panel segregation
    if (clientPanel === 'eshop' && cleanEmail !== 'supportinnovativehub@gmail.com') {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    if (clientPanel === 'main' && cleanEmail !== 'admin@inovative-hub.com') {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Only allow designated admin accounts
    if (cleanEmail !== 'supportinnovativehub@gmail.com' && cleanEmail !== 'admin@inovative-hub.com') {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const admin = await Admin.findOne({ email: cleanEmail });
    if (!admin) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (!admin.isActive) {
      return res.status(403).json({ success: false, message: "Admin account is deactivated" });
    }

    const matched = await admin.comparePassword(password);
    if (!matched) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: admin._id, role: admin.role, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: admin._id.toString(),
        name: admin.email.split('@')[0],
        email: admin.email,
        role: admin.role || 'admin'
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
