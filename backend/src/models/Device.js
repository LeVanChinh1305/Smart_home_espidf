import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema({
    channel: { 
        type: String, 
        required: true, 
        unique: true // Ví dụ: '1', '2', '3', '4'
    },
    name: { 
        type: String, 
        required: true // Ví dụ: 'Đèn phòng khách'
    },
    isOn: { 
        type: Boolean,
        default: false, // Mặc định thiết bị tắt
        required: true
    }
}, { timestamps: true }); // Tự động thêm createdAt và updatedAt để biết lần cuối bật/tắt là khi nào

export default mongoose.model('Device', deviceSchema);