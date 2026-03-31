import bcrypt from 'bcrypt';
import User from '../models/User.js';

export const signUp = async(req, res)=>{
    try{
        // Lấy dữ liệu từ request body
        const {firstName, lastName, email, password, phone} = req.body;
        // validate dữ liệu (có thể thêm nhiều validate hơn nữa nếu muốn)
        if(!firstName || !lastName || !email || !password || !phone){
            return res.status(400).json({message: 'Vui lòng điền đầy đủ thông tin'});
        }
        // Kiểm tra xem email, phone đã tồn tại trong database chưa
        const a = await User.findOne({email});
        if(a){
            return res.status(400).json({message: 'Email đã tồn tại'});
        }
        const b = await User.findOne({phone});
        if(b){
            return res.status(400).json({message: 'Số điện thoại đã tồn tại'});
        }
        // hash password trước khi lưu vào database
        const hashedPassword = await bcrypt.hash(password, 10); // 10 là số rounds để tăng độ bảo mật của hash, bạn có thể điều chỉnh nếu muốn
        // tạo user mới với dữ liệu đã được hash password
        await User.create({
            firstName,
            lastName,
            email,
            hashedPassword,
            phone,
        })
        // trả về response thành công hoặc lỗi
        return res.status(201).json({message: 'Đăng ký thành công'});

    }catch(error){
        console.error('Lỗi khi đăng ký:', error);
        return res.status(500).json({message: 'Lỗi server'});
    }
}