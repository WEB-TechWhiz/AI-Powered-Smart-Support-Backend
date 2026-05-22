const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { createFeedback, listFeedback } = require('../controllers/feedbackController');

const router = express.Router();

// All feedback endpoints require authentication
router.use(authMiddleware);

// POST /api/feedback - Submit feedback
router.post('/', createFeedback);

// GET /api/feedback - List feedback (filtered by permission role)
router.get('/', listFeedback);

module.exports = router;
