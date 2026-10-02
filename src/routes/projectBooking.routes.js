import express from 'express';
import multer from 'multer';
import { 
  submitProjectBookingForm, 
  getMyProjectBookings 
} from '../controllers/projectBooking.controller.js';
import optionalUserAuth from '../middleware/optionalUserAuth.middleware.js';
import userAuth from '../middleware/userAuth.middleware.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
});

router.post('/submit', optionalUserAuth, upload.array('attachments', 10), submitProjectBookingForm);
router.get('/my-bookings', userAuth, getMyProjectBookings);

export default router;
