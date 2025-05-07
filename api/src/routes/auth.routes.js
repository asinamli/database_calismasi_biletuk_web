const express = require('express');
const {
  register,
  login,
  getMe,
  updatePassword,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  firebaseLogin,
  firebaseSignup,
  logout
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);

// Firebase Authentication routes
router.post('/firebase-login', firebaseLogin);
router.post('/firebase-signup', firebaseSignup);

// Protected routes
router.get('/me', protect, getMe);
router.put('/update-password', protect, updatePassword);
router.post('/logout', protect, logout);

module.exports = router;