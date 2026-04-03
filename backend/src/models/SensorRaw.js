// src/models/SensorRaw.js
import mongoose from 'mongoose';

const sensorRawSchema = new mongoose.Schema({
    temp: { type: Number, required: true },
    hum: { type: Number, required: true },
    gas: { type: Number, required: true },
    light: { type: Number, required: true }
}, { 
    timestamps: true 
});

// ự động xóa dữ liệu sau 1 giờ  (3600 giây)
// ESP32 gửi 5s/lần => 720 bản ghi/giờ 
sensorRawSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

export default mongoose.model('SensorRaw', sensorRawSchema);