import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

const userAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id || decoded._id || decoded.userId || decoded.sub;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Invalid token payload' });
      }
      req.userId = userId;
      const user = await User.findById(userId).select('-password');
      if (!user) return res.status(401).json({ success: false, message: 'User not found' });
      req.user = user;
      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  } catch (err) {
    next(err);
  }
};

export default userAuth;
