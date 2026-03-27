const express  = require('express');
const router   = express.Router();
const protect  = require('../middlewares/authMiddleware');
const {
  getRelays,
  toggleRelay
} = require('../controllers/relayController');

router.get('/',        protect, getRelays);
router.post('/:index', protect, toggleRelay);

module.exports = router;