const KnowledgeArticle = require('../models/KnowledgeArticle');
const AuditLog = require('../models/AuditLog');
const { createOrUpdateArticle, searchRelevantArticles } = require('../services/knowledgeService');

async function listArticles(_req, res) {
  try {
    const articles = await KnowledgeArticle.find().sort({ updatedAt: -1 }).lean();
    return res.status(200).json({ success: true, data: articles });
  } catch (error) {
    console.error('listArticles error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
}

async function getArticle(req, res) {
  try {
    const article = await KnowledgeArticle.findById(req.params.id).lean();
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error('getArticle error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
}

async function createArticle(req, res) {
  try {
    const article = await createOrUpdateArticle(req.body);
    await AuditLog.create({
      actorId: req.user.id,
      actorRole: req.user.role || 'admin',
      action: 'kb.article_upserted',
      targetType: 'knowledge_article',
      targetId: article._id,
      metadata: { slug: article.slug },
    });

    return res.status(201).json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error('createArticle error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
}

async function updateArticle(req, res) {
  try {
    const article = await createOrUpdateArticle({
      ...req.body,
      slug: req.params.id,
    });

    await AuditLog.create({
      actorId: req.user.id,
      actorRole: req.user.role || 'admin',
      action: 'kb.article_updated',
      targetType: 'knowledge_article',
      targetId: article._id,
      metadata: { slug: article.slug },
    });

    return res.status(200).json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error('updateArticle error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
}

async function searchArticles(req, res) {
  try {
    const { q = '' } = req.query;
    const results = await searchRelevantArticles(String(q), 5);

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('searchArticles error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
}

module.exports = {
  listArticles,
  getArticle,
  createArticle,
  updateArticle,
  searchArticles,
};
