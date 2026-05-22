const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  register,
  login,
  refresh,
  logout,
  me,
} = require('../controllers/authController');

const router = express.Router();

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/refresh
router.post('/refresh', refresh);

// POST /api/auth/logout
router.post('/logout', authMiddleware, logout);

// GET /api/auth/me
router.get('/me', authMiddleware, me);

module.exports = router;
