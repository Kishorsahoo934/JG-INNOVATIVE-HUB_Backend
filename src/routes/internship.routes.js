import express from 'express';
import {
  applyForInternship,
  getMyApplications,
  createInternshipPaymentOrder
} from '../controllers/internship.controller.js';
import userAuth from '../middleware/userAuth.middleware.js';
import InternshipPost from '../models/InternshipPost.model.js';

const router = express.Router();


// Public: Get Active Internship Posts
router.get('/posts', async (req, res, next) => {
  try {
    const posts = await InternshipPost.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, data: posts });
  } catch (error) {
    next(error);
  }
});

router.post('/apply', userAuth, applyForInternship);
router.post('/create-payment', userAuth, createInternshipPaymentOrder);
router.get('/my-applications', userAuth, getMyApplications);

export default router;
