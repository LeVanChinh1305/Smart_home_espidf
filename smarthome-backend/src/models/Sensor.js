const mongoose = require('mongoose');

const sensorSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['temp', 'humidity', 'light', 'gas'] // chỉ chấp nhận 4 loại này
  },
  value: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now // tự động ghi thời gian khi tạo
  }
});

module.exports = mongoose.model('Sensor', sensorSchema);