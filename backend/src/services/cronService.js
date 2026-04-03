import cron from 'node-cron';
import SensorRaw from '../models/SensorRaw.js';
import SensorHourly from '../models/SensorHourly.js';
import SensorDaily from '../models/SensorDaily.js'; 
export const startCronJobs = () => {
    // 1. TỔNG HỢP THEO GIỜ (Chạy vào phút 00 mỗi giờ)
    cron.schedule('0 * * * *', async () => {
        console.log(' Bắt đầu tổng hợp dữ liệu SensorHourly...');
        try {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

            const rawData = await SensorRaw.find({
                createdAt: { $gte: oneHourAgo, $lt: now }
            });

            if (rawData.length > 0) {
                const avgData = rawData.reduce((acc, curr) => {
                    acc.temp += curr.temp;
                    acc.hum += curr.hum; // Bản Raw dùng 'hum'
                    acc.gas += curr.gas;
                    acc.light += curr.light;
                    return acc;
                }, { temp: 0, hum: 0, gas: 0, light: 0 });

                const count = rawData.length;
                
                // Lưu vào bảng Hourly
                await SensorHourly.create({
                    timestamp: now, // Mốc thời gian của giờ đó
                    temp: Number((avgData.temp / count).toFixed(1)),
                    humidity: Number((avgData.hum / count).toFixed(1)), // Đổi 'hum' thành 'humidity'
                    gas: Number((avgData.gas / count).toFixed(0)),
                    light: Number((avgData.light / count).toFixed(0))
                });
                
                console.log(' Đã tạo thành công bản ghi Hourly lúc', now.getHours(), 'giờ');
            }
        } catch (error) {
            console.error('Lỗi khi chạy Cron Hourly:', error);
        }
    });

    // ==========================================
    // 2. TỔNG HỢP THEO NGÀY (Chạy lúc 23:59 mỗi ngày)
    // ==========================================
    cron.schedule('59 23 * * *', async () => {
        console.log(' Bắt đầu tổng hợp dữ liệu SensorDaily...');
        try {
            const now = new Date();
            // Lấy mốc từ 00:00:00 đến 23:59:59 của ngày hôm nay
            const startOfDay = new Date(now.setHours(0, 0, 0, 0));
            const endOfDay = new Date(now.setHours(23, 59, 59, 999));

            // Quét dữ liệu từ bảng HOURLY thay vì bảng Raw để giảm tải
            const hourlyData = await SensorHourly.find({
                timestamp: { $gte: startOfDay, $lt: endOfDay }
            });

            if (hourlyData.length > 0) {
                const avgData = hourlyData.reduce((acc, curr) => {
                    acc.temp += curr.temp;
                    acc.humidity += curr.humidity; // Bảng Hourly dùng 'humidity'
                    acc.gas += curr.gas;
                    acc.light += curr.light;
                    return acc;
                }, { temp: 0, humidity: 0, gas: 0, light: 0 });

                const count = hourlyData.length;

                await SensorDaily.create({
                    timestamp: startOfDay, // Lưu mốc là ngày của hôm đó
                    temp: Number((avgData.temp / count).toFixed(1)),
                    humidity: Number((avgData.humidity / count).toFixed(1)),
                    gas: Number((avgData.gas / count).toFixed(0)),
                    light: Number((avgData.light / count).toFixed(0))
                });

                console.log('Đã tạo thành công bản ghi Daily cho ngày hôm nay');
            }
        } catch (error) {
            console.error('Lỗi khi chạy Cron Daily:', error);
        }
    });
};