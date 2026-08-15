import express from 'express';
import {
  getAllProjects,
  getProjectComponents,
  getProjectById,
  getAdminProjects,
  createProject,
  updateProject,
  deleteProject,
  seedProjects
} from '../controllers/project.controller.js';
import adminAuth from '../middleware/adminAuth.middleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllProjects);
router.get('/components', getProjectComponents);
router.get('/seed', seedProjects);
router.get('/:id', getProjectById);

// Admin-only routes
router.get('/admin/all', adminAuth, getAdminProjects);
router.post('/', adminAuth, createProject);
router.put('/:id', adminAuth, updateProject);
router.delete('/:id', adminAuth, deleteProject);

export default router;
