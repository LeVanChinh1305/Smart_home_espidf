import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
        userId: {
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User', 
            required: true,
            index: true 
        },
        refreshToken: {
            type: String, 
            required: true,
            unique: true
        },
        expiresAt: {
            type: Date, 
            required: true
        }
    },
    {timestamps: true} // tự động thêm createdAt và updatedAt
);
sessionSchema.index({expiresAt: 1}, {expireAfterSeconds: 0}); // tự động xóa document khi expiresAt đến hạn

const Session = mongoose.model('Session', sessionSchema);
export default Session;