import mqtt from 'mqtt';
import SensorRaw from '../models/SensorRaw.js'; // Gọi Model Database của bạn
import Device from '../models/Device.js'; // Gọi Model Database của bạn

let mqttClient = null; // Biến toàn cục để lưu client MQTT

export const getMqttClient = () => {
    return mqttClient;
};

export const connectMQTT = () => {
  // Thay địa chỉ này bằng Broker bạn đang dùng (ví dụ: mqtt://localhost:1883 nếu cài mosquitto nội bộ)
  const brokerUrl = 'mqtt://broker.hivemq.com:1883/'; 
  mqttClient = mqtt.connect(brokerUrl);

  // Khi kết nối thành công
  mqttClient.on('connect', () => {
    console.log(' Đã kết nối thành công tới MQTT Broker!');
    // Đăng ký nhận tin nhắn từ Topic của ESP32 
    mqttClient.subscribe('smarthub/chinh/sensors', (err) => {
      if (!err) {
        console.log(' Đang lắng nghe topic: smarthub/chinh/sensors');
      }
    });
  });

  // Khi có tin nhắn mới từ ESP32 gửi tới
  mqttClient.on('message', async (topic, message) => {
    try {
      // Chuyển đổi dữ liệu thô (Buffer) sang chuỗi JSON rồi thành Object
      const payload = JSON.parse(message.toString());
      
      if (topic === 'smarthub/chinh/sensors'){
        const newData = new SensorRaw({
          light: payload.light,
          temp: payload.temp,
          hum: payload.humidity || payload.hum,
          gas: payload.gas
        });
        await newData.save();

        const relayStates = [ // Mảng này sẽ chứa trạng thái của 4 relay, mặc định là false nếu không có trong payload
          payload.r1_on,
          payload.r2_on,
          payload.r3_on,
          payload.r4_on
        ];
        for (let i = 0; i < relayStates.length; i++) { // Cập nhật trạng thái của từng relay trong MongoDB dựa trên channel (1, 2, 3, 4)
          if (relayStates[i] !== undefined) { // Chỉ cập nhật nếu có dữ liệu về relay đó trong payload
            await Device.findOneAndUpdate( // Tìm thiết bị theo channel (1, 2, 3, 4)
              { channel: String(i + 1) },
              { isOn: relayStates[i] === 1 },
              { upsert: true } // Nếu thiết bị chưa tồn tại, tạo mới với channel tương ứng và trạng thái isOn
            );
          }
        }
      }
      

      
    } catch (error) {
      console.error(' Lỗi khi xử lý tin nhắn MQTT:', error.message);
    }
  });

  // Xử lý lỗi mất kết nối
  mqttClient.on('error', (err) => {
    console.error(' Lỗi kết nối MQTT:', err);
    mqttClient.end();
  });
};