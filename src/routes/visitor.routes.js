import express from 'express';
import { getVisitorCount, incrementVisitorCount } from '../controllers/visitor.controller.js';

const router = express.Router();

router.get('/', getVisitorCount);
router.post('/hit', incrementVisitorCount);

export default router;
