import Device from '../models/Device.js';

export const seedDefaultDevices = async () => {
    try {
        // Kiểm tra xem đã có thiết bị nào trong DB chưa
        const count = await Device.countDocuments();

        if (count === 0) {
            console.log(' Đang khởi tạo danh sách Relay mặc định...');
            
            const defaultDevices = [
                { channel: '1', name: 'relay1_door', isOn: false },
                { channel: '2', name: 'relay2', isOn: false },
                { channel: '3', name: 'relay3', isOn: false },
                { channel: '4', name: 'relay4', isOn: false },
            ];

            await Device.insertMany(defaultDevices);
            console.log('Đã tạo xong 4 Relay mặc định!');
        } else {
            console.log(`Hệ thống đã có ${count} thiết bị, bỏ qua khởi tạo mặc định.`);
        }
    } catch (error) {
        console.error(' Lỗi khi khởi tạo thiết bị mặc định:', error);
    }
};