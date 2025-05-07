const express = require('express');
const {
  getUsers,
  getUser,
  updateProfile,
  updateUserRole,
  deleteUser,
  getCurrentUser
} = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// User routes
router.get('/me', protect, getCurrentUser); // Mevcut kullanıcı bilgilerini al
router.put('/profile', protect, updateProfile);

// Admin only routes
router.get('/', protect, authorize('admin'), getUsers);
router.get('/:id', protect, authorize('admin'), getUser);
router.put('/:id/role', protect, authorize('admin'), updateUserRole);
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;