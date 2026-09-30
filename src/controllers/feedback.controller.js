import Feedback from '../models/Feedback.model.js';

export const submitFeedback = async (req, res, next) => {
  try {
    const { rating, message, device } = req.body;
    
    // Try to get user if authenticated (depends on middleware)
    let userId;
    if (req.user && req.user._id) {
      userId = req.user._id;
    }

    const feedback = await Feedback.create({
      user: userId,
      rating,
      message,
      device,
    });

    res.status(201).json({
      status: 'success',
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.find()
      .populate('user', 'name email')
      .sort('-createdAt');

    res.status(200).json({
      status: 'success',
      results: feedback.length,
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
};
