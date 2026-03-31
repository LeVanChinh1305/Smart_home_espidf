import mongoose from "mongoose"; // Import thư viện mongoose để làm việc với MongoDB

const userSchema = new mongoose.Schema({ // Khởi tạo lược đồ (Schema) quy định cấu trúc cho bảng User
    firstName: {
        type: String,               // Kiểu dữ liệu là String 
        required: [true, 'Vui lòng nhập tên'], // Bắt buộc phải nhập, nếu không sẽ trả về lỗi với message 'Vui lòng nhập tên'
        trim: true,                 // Tự động loại bỏ khoảng trắng ở đầu và cuối chuỗi
        minLength: [2, 'Tên quá ngắn'], // Độ dài tối thiểu là 2 ký tự, nếu không sẽ trả về lỗi với message 'Tên quá ngắn'
        maxLength: 50,              // Độ dài tối đa là 50 ký tự
        index: true,                // Tạo index cho trường này để tăng tốc độ tìm kiếm
        set: (v) => v.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') // Tự động chuẩn hóa tên: mỗi từ viết hoa chữ cái đầu, các chữ còn lại viết thường
    },
    lastName: {
        type: String,               // Kiểu dữ liệu là String
        required: [true, 'Vui lòng nhập họ'], // Bắt buộc phải nhập họ, kèm thông báo lỗi nếu bỏ trống
        trim: true,                 // Tự động loại bỏ khoảng trắng thừa ở đầu và cuối chuỗi họ
        minLength: [2, 'Họ quá ngắn'], // Độ dài tối thiểu là 2 ký tự, kèm thông báo lỗi
        maxLength: 50,              // Độ dài tối đa là 50 ký tự
        index: true,                // Tạo index cho trường này để tăng tốc độ truy vấn tìm kiếm
        set: (v) => v.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') // Tự động chuẩn hóa họ: mỗi từ viết hoa chữ cái đầu, còn lại viết thường
    }, 
    email: {
        type: String,               // Kiểu dữ liệu là String
        required: [true, 'Vui lòng nhập email'], // Bắt buộc phải nhập email, kèm thông báo lỗi
        unique: true,               // Đảm bảo email là duy nhất trong Database (không được trùng lặp với người khác)
        lowercase: true,            // Tự động chuyển toàn bộ ký tự email thành chữ thường trước khi lưu vào DB
        trim: true,                 // Tự động loại bỏ khoảng trắng thừa ở đầu và cuối email
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Vui lòng nhập email hợp lệ'] // Dùng Regex để kiểm tra định dạng email nhập vào phải hợp lệ
    },
    hashedPassword: { 
        type: String,               // Kiểu dữ liệu là String (dùng để lưu chuỗi mật khẩu đã được băm bằng bcrypt)
        required: [true, 'Vui lòng nhập mật khẩu'], // Bắt buộc phải nhập mật khẩu
        select: false               // BẢO MẬT: Mặc định giấu trường này khi query (find, findOne) để tránh vô tình để lộ hash ra Frontend
    },
    role: {
        type: String,               // Kiểu dữ liệu là String
        enum: ['user', 'admin'], // Giới hạn role chỉ được phép nhận 1 trong 2 giá trị này, nhập khác sẽ báo lỗi
        default: 'user'             // Giá trị mặc định khi một user mới đăng ký tài khoản là 'user'
    },
    phone: {
        type: String,               // Dùng kiểu String cho số điện thoại để giữ được số 0 ở đầu (VD: 098...)
        required: [true, 'Vui lòng nhập số điện thoại'], // Bắt buộc nhập (bạn có thể xóa dòng này nếu muốn số điện thoại là tùy chọn)
        unique: true,               // Đảm bảo số điện thoại không bị trùng lặp giữa các user
        trim: true,                 // Xóa khoảng trắng thừa nếu người dùng nhập sai
        match: [/(84|0[3|5|7|8|9])+([0-9]{8})\b/, 'Vui lòng nhập số điện thoại hợp lệ'] // Regex kiểm tra định dạng số điện thoại chuẩn (VD: đầu 09, 03, 08... và đủ 10 số)
    },
    avatarUrl: {
        type: String,               // Kiểu dữ liệu là String (dùng để lưu đường dẫn URL của ảnh đại diện)
        default: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' // Link ảnh mặc định nếu người dùng chưa tải ảnh lên
    },
    avatarId:{
        type: String,               // Kiểu dữ liệu là String (dùng để lưu ID của ảnh trên Cloudinary, giúp dễ dàng quản lý và xóa ảnh khi cần)
    },
    isActive: {
        type: Boolean,              // Kiểu dữ liệu là Boolean (Đúng/Sai)
        default: false              // Admin có thể gạt thành false để cấm user này đăng nhập(mặc dù đã đang ký rồi ). 
        // khi admin gạt thành true thì user này mới có thể đăng nhập được.
    }
}, { 
    timestamps: true                // Tự động tạo thêm 2 trường: createdAt (thời gian tạo tài khoản) và updatedAt (thời gian cập nhật gần nhất)
});

const User = mongoose.model('User', userSchema); // Tạo model User dựa trên userSchema đã định nghĩa
export default User; // Xuất model User để có thể sử dụng ở các file khác trong dự án (như controllers, services)