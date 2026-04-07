import express from 'express';
import { authMe, changeRole, deleteUser, getAdmins, getAllUser, getPendingUsers, getUsers, toggleUserStatus } from '../controllers/userController.js';
import { adminOnly, protectedRoute } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', protectedRoute, getAllUser); // API để lấy danh sách tất cả người dùng (không bao gồm password), đưa lên trước để tránh lỗi nhầm sang :
router.get('/me', protectedRoute, authMe);
router.put('/update-role', protectedRoute, adminOnly, changeRole); // API để thay đổi vai trò của người dùng, chỉ có admin mới có quyền truy cập, đưa lên sau để tránh lỗi nhầm sang : /api/user/me
router.patch('/toggle-status',protectedRoute, adminOnly, toggleUserStatus); // API để kích hoạt hoặc vô hiệu hóa tài khoản người dùng, chỉ có admin mới có quyền truy cập, đưa lên sau để tránh lỗi nhầm sang : /api/user/me
router.get('/pending', protectedRoute, adminOnly, getPendingUsers); // API để lấy danh sách người dùng đang chờ kích hoạt để đăng nhập, chỉ có admin mới có quyền truy cập, đưa lên sau để tránh lỗi nhầm sang : /api/user/me
router.delete('/:userId', protectedRoute, adminOnly, deleteUser); // API để xóa người dùng, chỉ có admin mới có quyền truy cập, đưa lên sau để tránh lỗi nhầm sang : /api/user/me
router.get('/admins', protectedRoute, adminOnly, getAdmins); // API để lấy danh sách admin, chỉ có admin mới có quyền truy cập, đưa lên sau để tránh lỗi nhầm sang : /api/user/me
router.get('/user', protectedRoute, adminOnly,getUsers); // API để lấy danh sách tất cả người dùng (không bao gồm password), đưa lên sau cùng để tránh lỗi nhầm sang : /api/user/me

export default router;

