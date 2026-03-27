const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// Tạo JWT token
const createToken = (user) => jwt.sign(
  { id: user._id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Kiểm tra email đã tồn tại chưa
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email đã được sử dụng' });

    const user = await User.create({ firstName, lastName, email, password });
    res.status(201).json({
      token: createToken(user),
      user: { id: user._id, firstName, lastName, email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Email không tồn tại' });

    const match = await user.checkPassword(password);
    if (!match) return res.status(401).json({ message: 'Mật khẩu không đúng' });

    res.json({
      token: createToken(user),
      user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};