import express from 'express';
import { getAllContent, seedContent } from '../controllers/productDevContent.controller.js';

const router = express.Router();

router.get('/', getAllContent);
router.get('/seed', seedContent);

export default router;

