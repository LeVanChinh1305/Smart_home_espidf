import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// authorization - xác minh user là ai - có quyền truy cập vào tài nguyên hay không
export const protectedRoute = async (req, res, next) => {
    try {
        // Lấy token từ header
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>
        
        // CHẶN kẽ hở: Bắt cả trường hợp token là chuỗi chữ "null" hoặc "undefined"
        if(!token || token === "null" || token === "undefined") {
            return res.status(401).json({message: "Không tìm thấy access token hoặc token trống"});
        }

        // Xác nhận token có hợp lệ hay không
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
            if(err) {
                return res.status(403).json({message: "Token không hợp lệ hoặc đã hết hạn"});
            }
            
            // Lấy thông tin user từ token
            const user = await User.findById(decoded.userId).select("-hashedPassword");
            if(!user) {
                return res.status(404).json({message: "Không tìm thấy user trong hệ thống"});
            }
            
            // Gắn thông tin user vào req.user để các middleware sau có thể sử dụng
            req.user = user;
            next();
        });

    } catch (error) {
        console.error('Lỗi middleware xác thực:', error.message);
        return res.status(500).json({message: "Lỗi máy chủ"});
    }
}

// Middleware để kiểm tra nếu user có role admin mới cho phép truy cập vào route đó
export const adminOnly = async(req, res, next)=>{
    try{
        if(req.user.role !== 'admin'){
            return res.status(403).json({message: "Chỉ admin mới có quyền truy cập"});
        }else{
            next(); 
        }
    }catch(error){
        console.error('Lỗi middleware adminOnly:', error.message);
        return res.status(500).json({message: "Lỗi máy chủ"});
    }   
}