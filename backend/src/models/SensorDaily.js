import mongoose from 'mongoose';

const sensorDailySchema = new mongoose.Schema({
    temp: { type: Number, required: true },
    humidity: { type: Number, required: true },
    gas: { type: Number, required: true },
    light: { type: Number, required: true },
    timestamp: { type: Date, required: true } // Lưu mốc ngày (VD: 2024-06-30)
}, { timestamps: true });

// Tự động xóa sau 1 tháng để nhẹ máy chủ
sensorDailySchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

export default mongoose.model('SensorDaily', sensorDailySchema);