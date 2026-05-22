const KnowledgeArticle = require('../models/KnowledgeArticle');
const slugify = require('../utils/slugify');

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function searchRelevantArticles(query, limit = 3) {
  if (!query) {
    return [];
  }

  try {
    const textMatches = await KnowledgeArticle.find(
      {
        status: 'published',
        $text: { $search: query },
      },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .lean();

    if (textMatches.length > 0) {
      return textMatches.map((article) => ({
        id: article._id,
        title: article.title,
        slug: article.slug,
        summary: article.summary || article.content.slice(0, 240),
        content: article.content,
        tags: article.tags || [],
      }));
    }
  } catch (error) {
    // Fallback to regex search if text index is not yet available.
  }

  const tokens = String(query)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2)
    .slice(0, 8);

  if (tokens.length === 0) {
    return [];
  }

  const pattern = tokens.map(escapeRegex).join('|');

  const articles = await KnowledgeArticle.find({
    status: 'published',
    $or: [
      { title: { $regex: pattern, $options: 'i' } },
      { content: { $regex: pattern, $options: 'i' } },
      { tags: { $in: tokens } },
    ],
  })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();

  return articles.map((article) => ({
    id: article._id,
    title: article.title,
    slug: article.slug,
    summary: article.summary || article.content.slice(0, 240),
    content: article.content,
    tags: article.tags || [],
  }));
}

async function createOrUpdateArticle(payload) {
  const slug = payload.slug || slugify(payload.title);

  const update = {
    title: payload.title,
    slug,
    content: payload.content,
    tags: payload.tags || [],
    category: payload.category || 'general',
    status: payload.status || 'published',
    summary: payload.summary || '',
    source: payload.source || 'manual',
  };

  return KnowledgeArticle.findOneAndUpdate({ slug }, update, {
    new: true,
    upsert: true,
    runValidators: true,
  });
}

module.exports = {
  searchRelevantArticles,
  createOrUpdateArticle,
};
