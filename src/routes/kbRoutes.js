const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const {
  listArticles,
  getArticle,
  createArticle,
  updateArticle,
  searchArticles,
} = require('../controllers/kbController');

const router = express.Router();

router.get('/search', authMiddleware, searchArticles);
router.get('/', authMiddleware, requireRole('agent', 'admin'), listArticles);
router.get('/:id', authMiddleware, requireRole('agent', 'admin'), getArticle);
router.post('/', authMiddleware, requireRole('admin'), createArticle);
router.patch('/:id', authMiddleware, requireRole('admin'), updateArticle);

module.exports = router;
