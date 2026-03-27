require('dotenv').config(); 
const mqtt    = require('mqtt');
const Sensor  = require('../models/Sensor');

// Kết nối tới broker
const client = mqtt.connect(`mqtt://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`);

client.on('connect', () => {
  console.log('✅ Đã kết nối MQTT Broker');

  // Lắng nghe tất cả topic của cảm biến
  client.subscribe('home/sensor/#');

  // Lắng nghe phản hồi từ relay
  client.subscribe('home/relay/status/#');
});

// Nhận dữ liệu từ ESP32
client.on('message', async (topic, payload) => {
  const value = parseFloat(payload.toString());
  const parts = topic.split('/'); // ['home','sensor','temp']
  const type  = parts[2];        // 'temp', 'humidity', 'light', 'gas'

  // Chỉ lưu nếu là topic cảm biến hợp lệ
  if (parts[1] === 'sensor' && !isNaN(value)) {
    try {
      await Sensor.create({ type, value });
      console.log(`📡 Lưu: ${type} = ${value}`);
    } catch (err) {
      console.error('Lỗi lưu cảm biến:', err.message);
    }
  }
});

client.on('error', (err) => {
  console.error('❌ Lỗi MQTT:', err.message);
});

module.exports = client;