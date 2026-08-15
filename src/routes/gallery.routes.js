import express from 'express';
import {
  getGalleryItems,
  createGalleryItem,
  deleteGalleryItem
} from '../controllers/gallery.controller.js';
import adminAuth from '../middleware/adminAuth.middleware.js';

const router = express.Router();

router.get('/', getGalleryItems);
router.post('/', adminAuth, createGalleryItem);
router.delete('/:id', adminAuth, deleteGalleryItem);

export default router;
