import express from 'express';
import { submitFeedback, getAllFeedback } from '../controllers/feedback.controller.js';
import adminAuth from '../middleware/adminAuth.middleware.js';

const router = express.Router();

router.post('/', submitFeedback);
router.get('/', adminAuth, getAllFeedback);

export default router;
