import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.model.js';
import Admin from '../models/Admin.model.js';
import { sendWelcomeEmail, sendPasswordResetEmail, sendVerificationEmail, getFrontendBaseUrl } from '../utils/mailer.js';
import { normalizeIndianMobile, isValidIndianMobile10 } from '../utils/mobileOtp.util.js';

let googleClient = null;

const getGoogleClient = () => {
  if (!googleClient && process.env.GOOGLE_CLIENT_ID) {
    googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return googleClient;
};

// Verify Google ID token properly
const verifyGoogleToken = async (tokenId) => {
  const client = getGoogleClient();
  if (!client) return null;
  try {
    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
  } catch (err) {
    return null;
  }
};

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

const publicUserFields = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  mobile: user.mobile,
  mobileVerified: user.mobileVerified === true,
  profileImage: user.profileImage,
  addresses: user.addresses,
  role: user.role || 'student',
  tutorStatus: user.tutorStatus || 'pending',
  bio: user.bio || '',
  expertise: user.expertise || [],
});

export const register = async (req, res, next) => {
  try {
    const { name, email, password, mobile } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    let mobileToSave;
    if (mobile != null && String(mobile).trim() !== '') {
      const n = normalizeIndianMobile(mobile);
      if (!isValidIndianMobile10(n)) {
        return res.status(400).json({
          success: false,
          message: 'Enter a correct 10-digit Indian mobile. Wrong numbers can affect delivery and refunds.',
        });
      }
      const takenMobile = await User.findOne({ mobile: n });
      if (takenMobile) {
        return res.status(400).json({ success: false, message: 'Mobile number already registered' });
      }
      mobileToSave = n;
    }

    // Create new user (emailVerified: false until they click link in email)
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenHash = crypto.createHash('sha256').update(verifyToken).digest('hex');
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      mobile: mobileToSave,
      mobileVerified: false,
      authProvider: 'email',
      emailVerified: false,
      emailVerifyToken: verifyTokenHash,
      emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const baseUrl = getFrontendBaseUrl();
    const verifyUrl = `${baseUrl}/verify-email?token=${verifyToken}`;
    void sendVerificationEmail({ email: user.email, name: user.name, verifyUrl });

    res.status(201).json({
      success: true,
      message: 'Please verify your email. We sent a verification link to your inbox.',
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email
    let user = await User.findOne({ email: email.toLowerCase() });
    let token;
    let userResponse;

    if (!user) {
      // Check Admin collection
      const admin = await Admin.findOne({ email: email.toLowerCase() });
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      const isPasswordValid = await admin.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      if (!admin.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Admin account is deactivated'
        });
      }

      // Generate admin token
      token = jwt.sign({ email: admin.email, role: 'admin' }, process.env.JWT_SECRET, {
        expiresIn: '7d'
      });
      userResponse = {
        _id: admin._id,
        id: admin._id,
        name: admin.email.split('@')[0] + ' (Admin)',
        email: admin.email,
        role: 'admin',
        addresses: [],
        createdAt: admin.createdAt
      };
    } else {
      if (user.isBlocked || user.status === 'blocked') {
        return res.status(403).json({
          success: false,
          message: 'Account is blocked'
        });
      }

      // Google (or legacy) account with no password
      if (!user.password) {
        return res.status(401).json({
          success: false,
          message:
            user.authProvider === 'google'
              ? 'You signed in with Google, so this account has no password yet. Use “Forgot password” with this email to create one, then you can log in with email and password.'
              : 'No password is set for this account. Use “Forgot password” with this email to set a password.',
        });
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Generate token
      token = generateToken(user._id);
      userResponse = publicUserFields(user);
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: { token, user: userResponse }
    });
  } catch (err) {
    next(err);
  }
};

export const googleLogin = async (req, res, next) => {
  try {
    const { tokenId } = req.body;

    if (!tokenId) {
      return res.status(400).json({
        success: false,
        message: 'Google token is required'
      });
    }

    // Decode and verify Google token
    const payload = await verifyGoogleToken(tokenId);
    if (!payload) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Google token'
      });
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email not found in Google token'
      });
    }

    // Find or create user
    let user = await User.findOne({ 
      $or: [{ googleId }, { email: email.toLowerCase() }]
    });

    let isNewUser = false;
    if (user) {
      if (user.isBlocked || user.status === 'blocked') {
        return res.status(403).json({
          success: false,
          message: 'Account is blocked'
        });
      }
      // Update user if Google ID not set
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
      }
      if (!user.profileImage && picture) {
        user.profileImage = picture;
      }
      await user.save();
    } else {
      // Create new user (Google email is already verified)
      user = await User.create({
        googleId,
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        profileImage: picture,
        authProvider: 'google',
        emailVerified: true,
      });
      isNewUser = true;
    }

    // Generate token
    const token = generateToken(user._id);

    const userResponse = publicUserFields(user);

    res.json({
      success: true,
      message: 'Google login successful',
      data: { token, user: userResponse }
    });

    if (isNewUser) {
      void sendWelcomeEmail({ email: user.email, name: user.name });
    }
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    if (req.isAdmin && req.admin) {
      return res.json({
        success: true,
        data: {
          _id: req.admin.id,
          id: req.admin.id,
          email: req.admin.email,
          name: req.admin.name + ' (Admin)',
          role: 'admin',
          addresses: [],
          createdAt: new Date().toISOString()
        }
      });
    }

    const userId = req.userId; // Set by auth middleware
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userResponse = publicUserFields(user);

    res.json({
      success: true,
      data: userResponse
    });
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
    }
    if (user.isBlocked || user.status === 'blocked') {
      return res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    user.resetPasswordToken = tokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const baseUrl = getFrontendBaseUrl();
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    const sent = await sendPasswordResetEmail({ email: user.email, name: user.name, resetUrl });
    if (!sent) {
      console.error('[forgotPassword] Reset email failed to send (check SMTP / SMTP_FROM / app password):', user.email);
    }

    return res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    if (user.password && (await user.comparePassword(password))) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from your current password.',
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.authProvider = 'email';
    await user.save();

    return res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const token = req.query.token || req.body?.token;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token is required' });
    }
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      emailVerifyToken: tokenHash,
      emailVerifyExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification link' });
    }
    user.emailVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpires = undefined;
    await user.save();

    void sendWelcomeEmail({ email: user.email, name: user.name });

    const jwtToken = generateToken(user._id);
    const userResponse = publicUserFields(user);

    return res.json({
      success: true,
      message: 'Email verified. You can now log in.',
      data: { token: jwtToken, user: userResponse },
    });
  } catch (err) {
    next(err);
  }
};

export const resendVerifyEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const user = await User.findOne({ email: email.toLowerCase(), authProvider: 'email' });
    if (!user) {
      return res.json({ success: true, message: 'If an account exists, a new verification email has been sent.' });
    }
    if (user.emailVerified) {
      return res.json({ success: true, message: 'This email is already verified. You can log in.' });
    }
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenHash = crypto.createHash('sha256').update(verifyToken).digest('hex');
    user.emailVerifyToken = verifyTokenHash;
    user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const baseUrl = getFrontendBaseUrl();
    const verifyUrl = `${baseUrl}/verify-email?token=${verifyToken}`;
    void sendVerificationEmail({ email: user.email, name: user.name, verifyUrl });

    return res.json({ success: true, message: 'Verification email sent. Please check your inbox.' });
  } catch (err) {
    next(err);
  }
};

export const logout = (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};
