import mongoose from 'mongoose';

const sensorHourlySchema = new mongoose.Schema({
    temp: { type: Number, required: true },
    humidity: { type: Number, required: true },
    gas: { type: Number, required: true },
    light: { type: Number, required: true },
    timestamp: { type: Date, required: true } // Lưu mốc giờ (VD: 2024-06-30 14:00)
}, { timestamps: true });

// Tự động xóa sau 3 ngày để nhẹ máy chủ
sensorHourlySchema.index({ timestamp: 1 }, { expireAfterSeconds: 259200 });

export default mongoose.model('SensorHourly', sensorHourlySchema);