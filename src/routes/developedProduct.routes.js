import express from 'express';
import {
  getAllDevelopedProducts,
  getDevelopedProductById,
  seedDevelopedProducts,
  createDevelopedProduct,
  updateDevelopedProduct,
  deleteDevelopedProduct
} from '../controllers/developedProduct.controller.js';
import adminAuth from '../middleware/adminAuth.middleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllDevelopedProducts);
router.get('/seed', seedDevelopedProducts); // Temporary public endpoint for seeding demo data
router.get('/:id', getDevelopedProductById);

// Admin-only routes
router.post('/', adminAuth, createDevelopedProduct);
router.put('/:id', adminAuth, updateDevelopedProduct);
router.delete('/:id', adminAuth, deleteDevelopedProduct);

export default router;

