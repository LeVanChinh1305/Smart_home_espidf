const Relay      = require('../models/Relay');
const mqttClient = require('../libs/mqtt');

// GET /api/relays — lấy trạng thái tất cả relay
exports.getRelays = async (req, res) => {
  try {
    const relays = await Relay.find().sort({ index: 1 });

    // Nếu chưa có data → tạo 4 relay mặc định
    if (relays.length === 0) {
      const defaults = [
        { index: 0, name: 'Đèn phòng khách', device: '💡 Đèn LED',       state: false },
        { index: 1, name: 'Quạt',            device: '🌀 Quạt thông gió', state: false },
        { index: 2, name: 'Cửa',             device: '🚪 Khóa cửa điện', state: false },
        { index: 3, name: 'Đèn phòng ngủ',   device: '🌙 Đèn ngủ',       state: false },
      ];
      const created = await Relay.insertMany(defaults);
      return res.json(created);
    }

    res.json(relays);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/relays/:index — bật/tắt relay
exports.toggleRelay = async (req, res) => {
  try {
    const { index } = req.params;
    const { state }  = req.body; // true hoặc false

    if (typeof state !== 'boolean') {
      return res.status(400).json({ message: 'state phải là true hoặc false' });
    }

    // Cập nhật trong MongoDB
    const relay = await Relay.findOneAndUpdate(
      { index: Number(index) },
      { state, updatedAt: Date.now() },
      { new: true } // trả về document sau khi update
    );

    if (!relay) return res.status(404).json({ message: 'Relay không tồn tại' });

    // Gửi lệnh xuống ESP32 qua MQTT
    // ESP32 lắng nghe topic: home/relay/0, home/relay/1, ...
    mqttClient.publish(
      `home/relay/${index}`,
      state ? '1' : '0'
    );

    console.log(`🔌 Relay ${index} (${relay.name}): ${state ? 'BẬT' : 'TẮT'}`);

    res.json(relay);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};