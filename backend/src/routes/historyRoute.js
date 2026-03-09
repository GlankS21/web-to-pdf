import express from 'express';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import { getHistory, downloadHistory, deleteHistory } from '../controllers/historyController.js';

const router = express.Router();

router.get('/', protectedRoute, getHistory);
router.get('/:id/download', protectedRoute, downloadHistory);
router.delete('/:id', protectedRoute, deleteHistory);

export default router;