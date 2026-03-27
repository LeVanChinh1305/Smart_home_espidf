const express  = require('express');
const router   = express.Router();
const protect  = require('../middlewares/authMiddleware');
const User     = require('../models/User');

// GET /api/users — chỉ admin mới xem được
router.get('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }

    // Trả về danh sách user, ẩn trường password
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/users/:id — xoá user
router.delete('/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xoá người dùng' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
