import express from 'express';
import dotenv from 'dotenv';
import {connectDB} from "./libs/db.js";
import authRoute from './routes/authRoute.js';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5001;

// Middleware to parse JSON bodies
app.use(express.json());

// public routes 
app.use('/api/auth', authRoute); // Đường dẫn cho các route liên quan đến xác thực (đăng ký, đăng nhập, v.v.)

// priavate routes

// Import and connect to the database
// chạy server sau khi kết nối thành công đến database
connectDB().then(()=>{
    app.listen(PORT, ()=>{
        console.log(`Server is running on port ${PORT}`);
    });
});


