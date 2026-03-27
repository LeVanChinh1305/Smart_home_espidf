const Sensor = require('../models/Sensor');

// GET /api/sensors?type=temp&from=<ms>&to=<ms>
exports.getSensors = async (req, res) => {
  try {
    const { type, from, to } = req.query;

    // Bắt buộc phải có type
    if (!type) return res.status(400).json({ message: 'Thiếu tham số type' });

    // Xây dựng điều kiện lọc
    const filter = { type };

    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(Number(from));
      if (to)   filter.timestamp.$lte = new Date(Number(to));
    }

    const data = await Sensor
      .find(filter)
      .sort({ timestamp: 1 })  // sắp xếp tăng dần theo thời gian
      .limit(500);              // tối đa 500 điểm dữ liệu

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/sensors/latest — lấy giá trị mới nhất của cả 4 loại
exports.getLatest = async (req, res) => {
  try {
    const types = ['temp', 'humidity', 'light', 'gas'];

    // Chạy 4 query song song cho nhanh
    const results = await Promise.all(
      types.map(type =>
        Sensor.findOne({ type }).sort({ timestamp: -1 })
      )
    );

    // Gộp thành object { temp: 28.5, humidity: 65, light: 742, gas: 120 }
    const latest = {};
    types.forEach((type, i) => {
      latest[type] = results[i] ? results[i].value : null;
    });

    res.json(latest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};