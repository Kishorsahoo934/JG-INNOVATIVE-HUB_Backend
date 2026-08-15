import express from 'express';
import {
  applyForInternship,
  getMyApplications,
  createInternshipPaymentOrder
} from '../controllers/internship.controller.js';
import userAuth from '../middleware/userAuth.middleware.js';

const router = express.Router();

router.post('/apply', userAuth, applyForInternship);
router.post('/create-payment', userAuth, createInternshipPaymentOrder);
router.get('/my-applications', userAuth, getMyApplications);

export default router;
