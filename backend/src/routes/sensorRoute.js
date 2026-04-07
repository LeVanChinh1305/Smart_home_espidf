import express from 'express';
import { getLiveStats, getChartData } from '../controllers/sensorController.js';

const router = express.Router();

// GET /api/sensors/live
router.get('/live', getLiveStats);

// GET /api/sensors/chart?range=7d
router.get('/chart', getChartData);

export default router;