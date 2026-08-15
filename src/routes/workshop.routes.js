import express from 'express';
import {
  getApprovedWorkshops,
  enrollInWorkshop,
  getEnrolledWorkshops,
  getMyHostedWorkshops,
  getWorkshopById
} from '../controllers/workshop.controller.js';
import userAuth from '../middleware/userAuth.middleware.js';

const router = express.Router();

router.get('/', getApprovedWorkshops);
router.get('/enrolled', userAuth, getEnrolledWorkshops);
router.get('/hosted', userAuth, getMyHostedWorkshops);
router.get('/:id', getWorkshopById);
router.post('/:id/enroll', userAuth, enrollInWorkshop);

export default router;
