import express from 'express';
import { submitFeedback, getAllFeedback } from '../controllers/feedback.controller.js';
import adminAuth from '../middleware/adminAuth.middleware.js';
import optionalUserAuth from '../middleware/optionalUserAuth.middleware.js';

const router = express.Router();

router.post('/', optionalUserAuth, submitFeedback);
router.get('/', adminAuth, getAllFeedback);

export default router;
