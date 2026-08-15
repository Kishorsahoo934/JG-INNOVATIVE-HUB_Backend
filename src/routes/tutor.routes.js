import express from 'express';
import { applyAsTutor, getTutors, getTutorById } from '../controllers/tutor.controller.js';
import userAuth from '../middleware/userAuth.middleware.js';

const router = express.Router();

router.put('/apply', userAuth, applyAsTutor);
router.get('/', getTutors);
router.get('/:id', getTutorById);

export default router;
