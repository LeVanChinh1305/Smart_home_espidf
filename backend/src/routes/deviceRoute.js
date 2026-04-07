import express from 'express';
import { changeNameDevice, getDeviceByChannel, getDevices, toggleDevice } from '../controllers/deviceController.js';

const router = express.Router();

router.get('/', getDevices);
router.post('/control', toggleDevice);
router.post('/name', changeNameDevice);
router.get('/:channel', getDeviceByChannel); // API mới để lấy thông tin thiết bị theo channel (1, 2, 3, 4)

export default router;