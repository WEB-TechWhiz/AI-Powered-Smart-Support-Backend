const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');
const { sendMessage, getHistory, clearHistory } = require('../controllers/chatController');

const router = express.Router();

router.use(authMiddleware);

router.post('/message', rateLimiter, sendMessage);
router.get('/history', getHistory);
router.delete('/history', clearHistory);

module.exports = router;
