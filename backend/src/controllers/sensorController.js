import SensorRaw from '../models/SensorRaw.js';
import SensorDaily from '../models/SensorDaily.js';
import SensorHourly from '../models/SensorHourly.js';

export const getLiveStats = async (req, res) => {
    try {
        const latestData = await SensorRaw.findOne().sort({ createdAt: -1 });
        
        if (!latestData) {
            return res.status(404).json({ message: 'Chưa có dữ liệu cảm biến' });
        }

        // Đổi tên 'hum' thành 'humidity' để khớp với Frontend
        const formattedData = {
            light: latestData.light,
            temp: latestData.temp,
            humidity: latestData.hum, 
            gas: latestData.gas,
            lastUpdate: latestData.createdAt
        };

        res.status(200).json(formattedData);
    } catch (error) {
        console.error('Lỗi khi lấy Live Stats:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

export const getChartData = async (req, res) => {
    try {
        const { range } = req.query; 

        // 1. TỪ ĐIỂN CẤU HÌNH THỜI GIAN VÀ SỐ MỐC
        const config = {
            '1m':  { ms: 1 * 60 * 1000, points: 12, model: SensorRaw, timeField: 'createdAt' },
            '3m':  { ms: 3 * 60 * 1000, points: 12, model: SensorRaw, timeField: 'createdAt' },
            '5m':  { ms: 5 * 60 * 1000, points: 15, model: SensorRaw, timeField: 'createdAt' },
            '15m': { ms: 15 * 60 * 1000, points: 15, model: SensorRaw, timeField: 'createdAt' },
            '30m': { ms: 30 * 60 * 1000, points: 15, model: SensorRaw, timeField: 'createdAt' },
            '1h':  { ms: 60 * 60 * 1000, points: 12, model: SensorRaw, timeField: 'createdAt' },
            '12h': { ms: 12 * 60 * 60 * 1000, points: 12, model: SensorHourly, timeField: 'timestamp' },
            '1d':  { ms: 24 * 60 * 60 * 1000, points: 12, model: SensorHourly, timeField: 'timestamp' },
            '3d':  { ms: 3 * 24 * 60 * 60 * 1000, points: 18, model: SensorHourly, timeField: 'timestamp' },
            '7d':  { ms: 7 * 24 * 60 * 60 * 1000, points: 7, model: SensorDaily, timeField: 'timestamp' },
            '1M':  { ms: 30 * 24 * 60 * 60 * 1000, points: 30, model: SensorDaily, timeField: 'timestamp' }
        };

        // Lấy cấu hình theo range frontend gửi lên (mặc định là 1h nếu lỗi)
        const selectedConfig = config[range] || config['1h']; 
        const { ms, points, model: Model, timeField } = selectedConfig;

        const now = new Date();
        const startTime = new Date(now.getTime() - ms);

        // 2. QUERY DỮ LIỆU TỪ MONGODB THUỘC KHOẢNG THỜI GIAN NÀY
        const docs = await Model.find({
            [timeField]: { $gte: startTime, $lte: now }
        }).sort({ [timeField]: 1 });

        // 3. THUẬT TOÁN CHIA GIỎ (BUCKETING)
        const bucketSizeMs = ms / points; // Khoảng thời gian của mỗi mốc
        const buckets = Array.from({ length: points }, (_, i) => ({
            date: new Date(startTime.getTime() + (i * bucketSizeMs)),
            light: [], temp: [], humidity: [], gas: []
        }));

        // Đổ dữ liệu thô vào từng giỏ tương ứng
        docs.forEach(doc => {
            const docTime = doc[timeField].getTime();
            let index = Math.floor((docTime - startTime.getTime()) / bucketSizeMs);
            if (index >= points) index = points - 1; // Giới hạn an toàn chống tràn mảng
            
            if (index >= 0) {
                buckets[index].light.push(doc.light);
                buckets[index].temp.push(doc.temp);
                // Bảng Raw dùng 'hum', bảng Daily dùng 'humidity' -> Cần check để tương thích
                buckets[index].humidity.push(doc.hum !== undefined ? doc.hum : doc.humidity);
                buckets[index].gas.push(doc.gas);
            }
        });

        // 4. TÍNH TRUNG BÌNH CỘNG CHO TỪNG GIỎ
        // Biến này giúp giữ lại giá trị trước đó nếu mạng bị lag làm ESP mất kết nối vài giây (Forward Fill)
        let lastValidData = { light: 0, temp: 0, humidity: 0, gas: 0 }; 
        if (docs.length > 0) {
            lastValidData = {
                light: docs[0].light, temp: docs[0].temp, 
                humidity: docs[0].hum !== undefined ? docs[0].hum : docs[0].humidity, gas: docs[0].gas
            };
        }

        const formattedChartData = buckets.map(b => {
            const avg = (arr) => arr.length > 0 ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : null;

            const currentAvg = {
                date: b.date,
                light: avg(b.light),
                temp: avg(b.temp),
                humidity: avg(b.humidity),
                gas: avg(b.gas)
            };

            // Nếu giỏ bị trống (do mất mạng), lấy giá trị của mốc liền kề trước đó đắp vào
            if (currentAvg.light !== null) lastValidData.light = currentAvg.light; else currentAvg.light = lastValidData.light;
            if (currentAvg.temp !== null) lastValidData.temp = currentAvg.temp; else currentAvg.temp = lastValidData.temp;
            if (currentAvg.humidity !== null) lastValidData.humidity = currentAvg.humidity; else currentAvg.humidity = lastValidData.humidity;
            if (currentAvg.gas !== null) lastValidData.gas = currentAvg.gas; else currentAvg.gas = lastValidData.gas;

            return currentAvg;
        });

        res.status(200).json(formattedChartData);
    } catch (error) {
        console.error('Lỗi khi tính toán biểu đồ:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};