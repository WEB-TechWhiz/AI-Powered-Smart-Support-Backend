const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Ticket = require('../models/Ticket');
const Feedback = require('../models/Feedback');
const AuditLog = require('../models/AuditLog');
const KnowledgeArticle = require('../models/KnowledgeArticle');

async function metrics(_req, res) {
  try {
    const [conversationCount, messageCount, ticketStatus, feedbackCount, articleCount, tokenAgg] =
      await Promise.all([
        Conversation.countDocuments(),
        Message.countDocuments(),
        Ticket.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ]),
        Feedback.countDocuments(),
        KnowledgeArticle.countDocuments(),
        Conversation.aggregate([
          {
            $group: {
              _id: null,
              totalTokens: { $sum: '$totalTokens' },
              avgConfidence: { $avg: '$aiConfidence' },
            },
          },
        ]),
      ]);

    const ticketsByStatus = ticketStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: {
        conversationCount,
        messageCount,
        feedbackCount,
        articleCount,
        totalTokens: tokenAgg[0]?.totalTokens || 0,
        averageConfidence: tokenAgg[0]?.avgConfidence || 0,
        ticketsByStatus,
      },
    });
  } catch (error) {
    console.error('metrics error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
}

async function auditLogs(req, res) {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100).lean();
    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('auditLogs error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
}

module.exports = { metrics, auditLogs };
