import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Session from '../models/Session.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_TOKEN_TTL = '30m'; // 30 phút
const REFRESH_TOKEN_TTL = 15 * 24 * 60 * 60 * 1000; // 15 ngày 

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
        // 1. Kiểm tra xem đây có phải là người dùng đầu tiên không (tức là database chưa có user nào)
        const isFirstUser = (await User.countDocuments()) === 0; 

        // hash password trước khi lưu vào database
        const hashedPassword = await bcrypt.hash(password, 10); // 10 là số rounds để tăng độ bảo mật của hash, bạn có thể điều chỉnh nếu muốn
        // tạo user mới với dữ liệu đã được hash password
        await User.create({
            firstName,
            lastName,
            email,
            hashedPassword,
            phone,
            role: isFirstUser ? 'admin': 'user', // nếu là user đầu tiên thì gán role là admin, ngược lại sẽ là user bình thường
            isActive : isFirstUser ? true : false // nếu là user đầu tiên thì kích hoạt luôn, ngược lại sẽ để false và chờ admin kích hoạt sau
        })
        // trả về response thành công hoặc lỗi
        return res.status(201).json({message: 'Đăng ký thành công'});

    }catch(error){
        console.error('Lỗi khi đăng ký:', error);
        return res.status(500).json({message: 'Lỗi server'});
    }
}


export const signIn = async(req, res)=>{
    try {
        // Lấy dữ liệu từ request body
        const {email, password} = req.body;
        // validate dữ liệu (có thể thêm nhiều validate hơn nữa nếu muốn)
        if(!email || !password){
            return res.status(400).json({message: 'Vui lòng điền đầy đủ thông tin'});
        }
        if(password.length < 6){
            return res.status(400).json({message: 'Mật khẩu phải có ít nhất 6 ký tự'});
        }
        if(!/\S+@\S+\.\S+/.test(email)){
            return res.status(400).json({message: 'Email không hợp lệ'});
        }
        
        // Kiểm tra xem email đã tồn tại trong database chưa
        const user = await User.findOne({email}).select('+hashedPassword'); // mặc định hashedPassword đã được set select: false nên cần thêm .select('+hashedPassword') để lấy trường này ra
        if(!user){
            return res.status(400).json({message: 'Tài khoản không tồn tại'});
        }
        // Nếu email tồn tại, so sánh password đã nhập với hashedPassword trong database
        const passCorrect = await bcrypt.compare(password, user.hashedPassword);
        if(!passCorrect){
            return res.status(401).json({message: 'Email hoặc mật khẩu không đúng'});
        }
        if (!user.isActive) {
            return res.status(403).json({ message: 'Tài khoản chưa được kích hoạt bởi Admin' });
        }
        // nêu đúng tạo access token với jwt 
        const accessToken = jwt.sign(
            {userId: user._id}, // payload của token,có thể thêm nhiều thông tin khác nếu muốn
            process.env.ACCESS_TOKEN_SECRET,
            {expiresIn: ACCESS_TOKEN_TTL} // access token có thời hạn 30 phút
        )

        // tạo refresh token
        const refreshToken = crypto.randomBytes(64).toString('hex'); // tạo chuỗi ngẫu nhiên làm refresh token

        // lưu session vào database (cần tạo model Session trước đó)
        await Session.create({
            userId: user._id,
            refreshToken,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL) // refresh token có thời hạn 15 ngày
        }); 
        // gửi resfresh token vào cookie 
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true, // chỉ cho phép truy cập cookie từ server, không cho phép truy cập từ client (JavaScript)
            secure: true, // chỉ gửi cookie qua kết nối HTTPS khi ở môi trường production
            sameSite: 'none', // cho phép gửi cookie trong các yêu cầu cross-site (cần thiết nếu frontend và backend ở domain khác nhau)
            maxAge: REFRESH_TOKEN_TTL // thời gian tồn tại của cookie
        });

        // trả access token về cho client trong response body
        return res.status(200).json({message: `User ${user.firstName} đăng nhập thành công`, accessToken}); 

    } catch (error) {
        console.error('Lỗi khi đăng nhập:', error);
        return res.status(500).json({message: 'Lỗi server'});
    }
}

export const signOut = async(req, res)=>{
    try {
        // lấy refresh token từ cookie
        const token = req.cookies.refreshToken;
        if(!token){
            return res.status(400).json({message: 'Không tìm thấy refresh token'});
        }
        // xoá refresh token khỏi database (xóa session)
        await Session.deleteOne({refreshToken: token});
        // xoá cookie refresh token trên trình duyệt
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: true, // Nếu môi trường dev dùng http thì để false, production để true
            sameSite: 'none'
        });
        // trả về response thành công hoặc lỗi
        return res.status(200).json({message: 'Đăng xuất thành công'});
    } catch (error) {
        console.error('Lỗi khi đăng xuất:', error);
        return res.status(500).json({message: 'Lỗi server'});
    }
}