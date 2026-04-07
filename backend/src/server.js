import express from 'express';
import dotenv from 'dotenv';
import {connectDB} from "./libs/db.js";
import authRoute from './routes/authRoute.js';
import userRoute from './routes/userRoute.js';
import cookieParser from 'cookie-parser';
import { protectedRoute } from './middlewares/authMiddleware.js';
import cors from 'cors';
import { startCronJobs } from './services/cronService.js'; // Import hàm khởi động cron jobs
import sensorRoute from './routes/sensorRoute.js';
import { connectMQTT } from './services/mqttService.js';
import deviceRoute from './routes/deviceRoute.js';
import { seedDefaultDevices } from './services/deviceService.js';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5001;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser()); // Middleware để parse cookie từ request
app.use(cors({
    origin: process.env.CLIENT_URL, // Chỉ cho phép frontend của bạn truy cập API
    credentials: true, // Cho phép gửi cookie trong các yêu cầu cross-site (cần thiết nếu frontend và backend ở domain khác nhau)
    allowedHeaders: ["Content-Type", "Authorization"] // Cho phép các header này trong yêu cầu
})); // Middleware để enable CORS, cho phép frontend ở domain khác có thể gọi API
// public routes 
app.use('/api/auth', authRoute); // Đường dẫn cho các route liên quan đến xác thực (đăng ký, đăng nhập, v.v.)

// priavate routes
app.use(protectedRoute); // Middleware bảo vệ tất cả các route sau nó, yêu cầu phải có access token hợp lệ mới được truy cập
app.use('/api/users', userRoute); // Đường dẫn cho các route liên quan đến người dùng, sẽ được bảo vệ bởi middleware xác thực
app.use('/api/sensors', sensorRoute); // Đường dẫn cho các route liên quan đến dữ liệu cảm biến, sẽ được bảo vệ bởi middleware xác thực
app.use('/api/device', deviceRoute); // Đường dẫn cho các route liên quan đến thiết bị, sẽ được bảo vệ bởi middleware xác thực

// Khởi động cron jobs để tổng hợp dữ liệu theo giờ và theo ngày

// Import and connect to the database
// chạy server sau khi kết nối thành công đến database
connectDB().then(()=>{
    app.listen(PORT, async()=>{
        console.log(`Server is running on port ${PORT}`);
        await seedDefaultDevices();
        connectMQTT();
        startCronJobs();
        console.log('Bộ đếm Cron Job đã được kích hoạt ngầm!');
    });
});


