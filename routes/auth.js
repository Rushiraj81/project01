const express = require('express');
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout,
  forgotPassword,
  resetPassword,
  registerValidation,
  loginValidation,
  changePasswordValidation,
  resetPasswordValidation
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPasswordValidation, resetPassword);

// Protected routes
router.use(protect); // All routes after this middleware are protected

router.get('/me', getMe);
router.put('/me', updateProfile);
router.put('/change-password', changePasswordValidation, changePassword);
router.post('/logout', logout);

module.exports = router;