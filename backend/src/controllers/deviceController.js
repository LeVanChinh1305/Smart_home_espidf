import Device from '../models/Device.js';
import { getMqttClient } from '../services/mqttService.js';
// 1. API Lấy danh sách thiết bị
export const getDevices = async (req, res) => {
    try {
        const devices = await Device.find();
        res.status(200).json(devices);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách thiết bị:', error);
        res.status(500).json({ message: 'Lỗi Server' });
    }
};

// 2. API Điều khiển thiết bị
export const toggleDevice = async (req, res) => {
    try {
        if (!req || !req.body) {
            return res.status(400).json({ message: 'Không nhận được dữ liệu yêu cầu' });
        }

        const { channel, isOn } = req.body; 

        if (channel === undefined || isOn === undefined) {
            return res.status(400).json({ message: 'Thiếu thông tin channel hoặc trạng thái' });
        }

        // ESP32 cần số 0 và 1, nên ta ép kiểu Boolean -> Number
        const mqttState = isOn ? 1 : 0; 
        const commandPayload = JSON.stringify({ 
            relay: Number(channel),
            state: mqttState
        }); 
        
        const client = getMqttClient(); // Lấy client MQTT đã kết nối từ service

        if (client && client.connected) { // Kiểm tra xem client đã kết nối chưa
            client.publish('smarthub/chinh/control', commandPayload, async (err) => {
                if (err) {
                    console.error('Lỗi khi gửi lệnh MQTT:', err);
                    return res.status(500).json({ message: 'Lỗi khi gửi lệnh xuống thiết bị' });
                }

                console.log(`Đã gửi lệnh: ${commandPayload}`);

                // Lưu trạng thái Boolean vào MongoDB
                await Device.findOneAndUpdate(
                    { channel: channel }, 
                    { 
                        isOn: isOn,
                        $setOnInsert: { name: `relay ${channel.toUpperCase()}` } // Nếu thiết bị chưa tồn tại, tạo mới với tên mặc định dựa trên channel (ví dụ: 'relay 1')
                    },
                    { new: true, upsert: true }
                );

                res.status(200).json({ message: 'Đã gửi lệnh và cập nhật Database', channel, isOn });
            });
        } else {
            res.status(503).json({ message: 'MQTT Broker chưa kết nối' });
        }

    } catch (error) {
        console.error('Lỗi API điều khiển:', error);
        res.status(500).json({ message: 'Lỗi Server' });
    }
};

export const changeNameDevice = async (req, res) => {
    try{
        const {channel, name} = req.body;
        // kiểm tra dữ liệu đầu vào
        if(!channel||!name){
            return res.status(400).json({message: 'Thiếu thông tin channel hoặc name'});
        }
        // tìm và cập nhật tên thiết bị
        const updatedDevice = await Device.findOneAndUpdate(
            {channel: channel},
            {name: name},
            {new: true}
        );
        if(!updatedDevice){
            return res.status(404).json({message: 'Thiết bị không tồn tại'});
        }
        res.status(200).json({message: 'Đã cập nhật tên thiết bị', channel, name});

    }catch(error){
        console.error('Lỗi API thay đổi tên thiết bị:', error);
        res.status(500).json({ message: 'Lỗi Server' });
    }
}

export const getDeviceByChannel = async (req, res) => {
    try {
        const { channel } = req.params; // Lấy channel từ URL (ví dụ: /api/device/1)

        const device = await Device.findOne({ channel: String(channel) });

        if (!device) {
            return res.status(404).json({ message: 'Không tìm thấy thiết bị' });
        }

        res.status(200).json(device);
    } catch (error) {
        console.error('Lỗi khi lấy thông tin thiết bị:', error);
        res.status(500).json({ message: 'Lỗi Server' });
    }
};