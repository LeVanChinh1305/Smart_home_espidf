import User from '../models/User.js';
export const authMe = (req, res) => {
    return res.status(200).json({message: "User authenticated"});
};

export const getAllUser = async (req, res) => {
    try {
        // Lấy tất cả người dùng nhưng loại bỏ trường password
        const users = await User.find().select('-password');
        
        res.status(200).json(users);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách người dùng:', error);
        res.status(500).json({ message: 'Lỗi Server' });
    }
};

export const changeRole = async (req, res) =>{
    try {
        const {userId, newRole} = req.body; 
        // Kiểm tra dữ liệu đầu vào
        if(!userId || !newRole){
            return res.status(400).json({message: 'Thiếu thông tin userId hoặc newRole'});
        }
        // Kiểm tra newRole có hợp lệ hay không
        const validRoute = ['admin', 'user'];
        if(!validRoute.includes(newRole)){
            return res.status(400).json({message: 'Vai trò mới không hợp lệ, chỉ chấp nhận "admin" hoặc "user"'});
        }
        // Tìm và cập nhật vai trò của người dùng
        const updateUser = await User.findByIdAndUpdate(
            userId,
            {role: newRole},
            {new: true}
        ).select('-password');
        if(!updateUser){
            return res.status(404).json({message: 'Không tìm thấy người dùng với userId đã cho'});
        }
        res.status(200).json({message: 'Đã cập nhật vai trò người dùng', user: updateUser});
    } catch (error) {
        console.error('Lỗi khi thay đổi vai trò người dùng:', error);
        res.status(500).json({ message: 'Lỗi Server' });
    }
};
    
export const toggleUserStatus = async (req, res) =>{
    try{
        const {userId, isActive} = req.body;
        // Kiểm tra dữ liệu đầu vào
        if(!userId || typeof isActive !== 'boolean'){
            return res.status(400).json({message: 'Thiếu thông tin userId hoặc isActive không phải boolean'});
        }
        // Tìm và cập nhật trạng thái kích hoạt của người dùng
        const updateUser = await User.findByIdAndUpdate(
            userId,
            {isActive: isActive},
            { returnDocument: 'after' }
        ).select('-password');
        if(!updateUser){
            return res.status(404).json({message: 'Không tìm thấy người dùng với userId đã cho'});
        }
        const statusMessage = isActive ? "đã được kích hoạt" : "đã bị khóa";
        res.status(200).json({ 
            message: `Tài khoản người dùng ${statusMessage}`, 
            user : updateUser
        });  
    }catch(error){
        console.error('Lỗi khi thay đổi trạng thái kích hoạt người dùng:', error);
        res.status(500).json({ message: 'Lỗi Server' });
    }   
};

export const getPendingUsers = async(req,res)=>{
    try{
        const peddingUser = await User.find({isActive: false}).select('-password');
        res.status(200).json({
            message: 'Danh sách người dùng đang chờ kích hoạt',
            count: peddingUser.length,
            users: peddingUser
        })
    }catch(error){
        console.error('Lỗi khi lấy danh sách người dùng đang chờ kích hoạt:', error);
        res.status(500).json({ message: 'Lỗi Server' });
    }
}

export const deleteUser = async(req,res)=>{
    try{
        const {userId} = req.params;
        if(!userId){
            return res.status(400).json({message: 'Thiếu thông tin userId'});
        }
        if(userId === req.user._id.toString()){
            return res.status(400).json({message: 'Bạn không thể xóa chính mình'});
        }
        const deleteUser = await User.findByIdAndDelete(userId).select('-password');
        if(!deleteUser){
            return res.status(404).json({message: 'Không tìm thấy người dùng với userId đã cho'});
        }   
        res.status(200).json({message: 'Đã xóa người dùng', user: deleteUser});
    }catch(error){
        console.error('Lỗi khi xóa người dùng:', error);
        res.status(500).json({ message: 'Lỗi Server' });
    }
}

export const getAdmins = async(req, res)=>{
    try{
        const admins = await User.find({role: 'admin'}).select('-password');
        res.status(200).json({
            message: 'Danh sách admin',
            count: admins.length,
            admins: admins
        });

    }catch(error){
        console.error('Lỗi khi lấy danh sách admin:', error);
        res.status(500).json({ message: 'Lỗi Server' });
    }
}
export const getUsers = async(req, res)=>{
    try{
        const users = await User.find({role: 'user'}).select('-password');
        res.status(200).json({
            message: 'Danh sách người dùng',
            count: users.length,
            users: users
        });

    }catch(error){
        console.error('Lỗi khi lấy danh sách admin:', error);
        res.status(500).json({ message: 'Lỗi Server' });
    }
}
