import express from 'express';
import {
  createSlot,
  getAvailableSlots,
  getTutorSlots,
  getStudentSessions,
  bookSlot,
  verifyBooking
} from '../controllers/session.controller.js';
import userAuth from '../middleware/userAuth.middleware.js';

const router = express.Router();

router.post('/slots', userAuth, createSlot);
router.get('/slots', getAvailableSlots);
router.get('/tutor', userAuth, getTutorSlots);
router.get('/student', userAuth, getStudentSessions);
router.post('/slots/:id/book', userAuth, bookSlot);
router.post('/slots/:id/verify-booking', userAuth, verifyBooking);

export default router;
