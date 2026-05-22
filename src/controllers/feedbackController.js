const Feedback = require('../models/Feedback');
const Conversation = require('../models/Conversation');
const Ticket = require('../models/Ticket');
const AuditLog = require('../models/AuditLog');

/**
 * Submit feedback for a support experience (AI or human agent).
 * POST /api/feedback
 */
async function createFeedback(req, res) {
  try {
    const userId = req.user.id;
    const { rating, comment = '', conversationId, ticketId, source = 'ai' } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating is required and must be an integer between 1 and 5.',
      });
    }

    if (conversationId) {
      const conv = await Conversation.findOne({ _id: conversationId, userId });
      if (!conv) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found or access denied.',
        });
      }
    }

    if (ticketId) {
      const ticket = await Ticket.findOne({ _id: ticketId, userId });
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found or access denied.',
        });
      }
    }

    const feedback = await Feedback.create({
      userId,
      conversationId: conversationId || null,
      ticketId: ticketId || null,
      rating: Number(rating),
      comment,
      source,
    });

    await AuditLog.create({
      actorId: userId,
      actorRole: req.user.role || 'user',
      action: 'feedback.submitted',
      targetType: 'feedback',
      targetId: feedback._id,
      metadata: { rating, source, conversationId, ticketId },
    });

    return res.status(201).json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    console.error('createFeedback error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
}

/**
 * Retrieve all feedback (admins and agents get all, users get their own).
 * GET /api/feedback
 */
async function listFeedback(req, res) {
  try {
    const query =
      req.user.role === 'admin' || req.user.role === 'agent' ? {} : { userId: req.user.id };

    const feedbackList = await Feedback.find(query).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      data: feedbackList,
    });
  } catch (error) {
    console.error('listFeedback error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
}

module.exports = {
  createFeedback,
  listFeedback,
};
