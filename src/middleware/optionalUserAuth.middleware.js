import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

const optionalUserAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id || decoded._id || decoded.userId || decoded.sub;
      if (userId) {
        req.userId = userId;
        const user = await User.findById(userId).select('-password');
        if (user) {
          req.user = user;
        }
      }
    } catch (err) {
      // Ignore token errors
    }
    next();
  } catch (err) {
    next(err);
  }
};

export default optionalUserAuth;
