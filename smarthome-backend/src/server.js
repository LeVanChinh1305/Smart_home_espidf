const express    = require('express');
const cors       = require('cors');
const dotenv     = require('dotenv');
const connectDB  = require('./libs/database');
const mqttClient = require('./libs/mqtt');

// Đọc file .env
dotenv.config();

// Kết nối MongoDB
connectDB();

// Khởi động MQTT
mqttClient;

const app = express();

// Middleware: cho phép đọc JSON từ request
app.use(express.json());

// Middleware: cho phép frontend gọi API
app.use(cors());

// Serve file HTML tĩnh trong thư mục public/
app.use(express.static('public'));

// Các route API
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/sensors', require('./routes/sensors'));
app.use('/api/relays',  require('./routes/relays'));
app.use('/api/users',   require('./routes/users'));

// Khởi động server
app.listen(process.env.PORT, () => {
  console.log(`✅ Server chạy tại http://localhost:${process.env.PORT}`);
});