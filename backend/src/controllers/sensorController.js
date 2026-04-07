import SensorRaw from '../models/SensorRaw.js';
import SensorDaily from '../models/SensorDaily.js';
import SensorHourly from '../models/SensorHourly.js';

export const getLiveStats = async (req, res) => {
    try {
        const latestData = await SensorRaw.findOne().sort({ createdAt: -1 });
        
        if (!latestData) {
            return res.status(200).json({
                light: 0,
                temp: 0,
                humidity: 0,
                gas: 0,
                lastUpdate: ""
            });
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
            '7d':  { ms: 7 * 24 * 60 * 60 * 1000, points: 7, model: SensorHourly, timeField: 'timestamp' },
            '1M':  { ms: 30 * 24 * 60 * 60 * 1000, points: 30, model: SensorHourly, timeField: 'timestamp' }
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

        // 3. THUẬT TOÁN CHIA GIỎ (BUCKETING) - ĐÃ FIX LỖI NHÃN THỜI GIAN
        const bucketSizeMs = ms / points; 
        
        const buckets = Array.from({ length: points }, (_, i) => {
            const bucketStart = startTime.getTime() + (i * bucketSizeMs);
            const bucketEnd = bucketStart + bucketSizeMs;
            return {
                // SỬA TẠI ĐÂY: Dùng bucketEnd làm mốc hiển thị. 
                // Giúp điểm cuối cùng trên biểu đồ luôn hiển thị đúng giờ "hiện tại".
                date: new Date(bucketEnd), 
                startTime: bucketStart,
                endTime: bucketEnd,
                light: [], temp: [], humidity: [], gas: []
            };
        });

        // Đổ dữ liệu thô vào từng giỏ tương ứng
        docs.forEach(doc => {
            const docTime = doc[timeField].getTime();
            
            // SỬA TẠI ĐÂY: Dùng <= b.endTime để vét trọn vẹn bản ghi sinh ra ở mi-li-giây hiện tại
            const targetBucket = buckets.find(b => docTime >= b.startTime && docTime <= b.endTime);

            if (targetBucket) {
                targetBucket.light.push(doc.light);
                targetBucket.temp.push(doc.temp);
                targetBucket.humidity.push(doc.hum !== undefined ? doc.hum : doc.humidity);
                targetBucket.gas.push(doc.gas);
            }
        });

        // 4. TÍNH TRUNG BÌNH CỘNG (ÉP VỀ 0 NẾU TRỐNG)
        const formattedChartData = buckets.map(b => {
            const avg = (arr) => arr.length > 0 ? Number((arr.reduce((val1, val2) => val1 + val2, 0) / arr.length).toFixed(1)) : 0;

            return {
                date: b.date,
                light: avg(b.light),
                temp: avg(b.temp),
                humidity: avg(b.humidity),
                gas: avg(b.gas)
            };
        });

        res.status(200).json(formattedChartData);
    } catch (error) {
        console.error('Lỗi khi tính toán biểu đồ:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};