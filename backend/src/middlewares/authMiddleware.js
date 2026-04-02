import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// authorization - xác minh user là ai - có quyền truy cập vào tài nguyên hay không
export const protectedRoute = async(req, res, next) => {
    try {
        // lấy token từ header
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>
        if(!token) {
            return res.status(401).json({message: "Không tìm thấy access token"});
        }

        // xác nhận token có hợp lệ hay không
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => { // async (err, decoded) => vì chúng ta cần truy vấn database để lấy thông tin user sau khi xác thực token thành công
            if(err) {// err là lỗi xác thực token, có thể do token hết hạn hoặc không hợp lệ
                console.error(err); 
                return res.status(403).json({message: "Token không hợp lệ"});
            }
            // lấy thông tin user từ token
            const user = await User.findById(decoded.userId).select("-hashedPassword");
            if(!user) {
                return res.status(404).json({message: "Không tìm thấy user"});
            }
            // gắn thông tin user vào req.user để các middleware sau có thể sử dụng
            req.user = user;
            next();
        });

        
        
    } catch (error) {
        console.error('lỗi xác thực:', error);
        return res.status(500).json({message: "Lỗi máy chủ"});
    }
}

