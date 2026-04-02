import express from 'express';
import dotenv from 'dotenv';
import {connectDB} from "./libs/db.js";
import authRoute from './routes/authRoute.js';
import userRoute from './routes/userRoute.js';
import cookieParser from 'cookie-parser';
import { protectedRoute } from './middlewares/authMiddleware.js';
import cors from 'cors';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5001;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser()); // Middleware để parse cookie từ request
app.use(cors({
    origin: process.env.CLIENT_URL, // Chỉ cho phép frontend của bạn truy cập API}));
    credentials: true // Cho phép gửi cookie trong các yêu cầu cross-site (cần thiết nếu frontend và backend ở domain khác nhau)
})); // Middleware để enable CORS, cho phép frontend ở domain khác có thể gọi API
// public routes 
app.use('/api/auth', authRoute); // Đường dẫn cho các route liên quan đến xác thực (đăng ký, đăng nhập, v.v.)

// priavate routes
app.use(protectedRoute); // Middleware bảo vệ tất cả các route sau nó, yêu cầu phải có access token hợp lệ mới được truy cập
app.use('/api/users', userRoute); // Đường dẫn cho các route liên quan đến người dùng, sẽ được bảo vệ bởi middleware xác thực

// Import and connect to the database
// chạy server sau khi kết nối thành công đến database
connectDB().then(()=>{
    app.listen(PORT, ()=>{
        console.log(`Server is running on port ${PORT}`);
    });
});


