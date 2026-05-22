const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const { metrics, auditLogs } = require('../controllers/adminController');

const router = express.Router();

router.use(authMiddleware, requireRole('admin'));

router.get('/metrics', metrics);
router.get('/audit-logs', auditLogs);

module.exports = router;
