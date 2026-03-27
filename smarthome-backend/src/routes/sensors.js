const express  = require('express');
const router   = express.Router();
const protect  = require('../middlewares/authMiddleware');
const {
  getSensors,
  getLatest
} = require('../controllers/sensorController');

// Tất cả route sensor đều cần đăng nhập (protect)
router.get('/',       protect, getSensors);
router.get('/latest', protect, getLatest);

module.exports = router;