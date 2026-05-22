const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Ticket = require('../models/Ticket');
const AuditLog = require('../models/AuditLog');
const { analyzeSupportRequest } = require('../services/aiService');
const { searchRelevantArticles } = require('../services/knowledgeService');
const { createTicketFromDecision } = require('../services/ticketService');

async function ensureConversation({ userId, channel = 'web', ticketId = null }) {
  let conversation = await Conversation.findOne({ userId, status: { $ne: 'closed' } }).sort({
    createdAt: -1,
  });

  if (!conversation) {
    conversation = await Conversation.create({
      userId,
      channel,
      ticketId,
      status: 'open',
      lastMessageAt: new Date(),
      messageCount: 0,
    });
  } else if (ticketId && !conversation.ticketId) {
    conversation.ticketId = ticketId;
  }

  return conversation;
}

async function appendMessage({
  conversationId,
  ticketId,
  senderType,
  role,
  content,
  intent = '',
  sentiment = '',
  confidence = 0,
  tokenCount = 0,
  metadata = {},
}) {
  return Message.create({
    conversationId,
    ticketId,
    senderType,
    role,
    content,
    intent,
    sentiment,
    confidence,
    tokenCount,
    metadata,
  });
}

async function sendMessage(req, res) {
  try {
    const userId = req.user.id;
    const { message, conversationId, ticketId } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required.',
      });
    }

    let conversation = null;
    if (conversationId) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        userId,
      });
    }

    if (!conversation) {
      conversation = await ensureConversation({
        userId,
        channel: 'web',
        ticketId: ticketId || null,
      });
    }

    const messages = await Message.find({
      conversationId: conversation._id,
    })
      .sort({ createdAt: 1 })
      .limit(30)
      .lean();

    const knowledgeArticles = await searchRelevantArticles(String(message), 3);
    const decision = await analyzeSupportRequest({
      userMessage: String(message).trim(),
      messages,
      knowledgeArticles,
      user: req.user,
      conversationId: conversation._id,
      requestId: req.requestId,
    });

    const userMessage = await appendMessage({
      conversationId: conversation._id,
      ticketId: conversation.ticketId,
      senderType: 'user',
      role: 'user',
      content: String(message).trim(),
      metadata: {
        requestId: req.requestId,
      },
    });

    const assistantMessage = await appendMessage({
      conversationId: conversation._id,
      ticketId: conversation.ticketId,
      senderType: 'assistant',
      role: 'assistant',
      content: decision.reply,
      intent: decision.intent,
      sentiment: decision.sentiment,
      confidence: decision.confidence,
      tokenCount: decision.tokensUsed || 0,
      metadata: {
        responseId: decision.responseId,
        model: decision.model,
        action: decision.action,
        sources: decision.sources || [],
      },
    });

    conversation.messageCount += 2;
    conversation.totalTokens += decision.tokensUsed || 0;
    conversation.lastMessageAt = new Date();
    conversation.summary = decision.summary || conversation.summary;
    conversation.aiModel = decision.model || conversation.aiModel;
    conversation.aiConfidence = decision.confidence || 0;
    conversation.status =
      decision.action === 'answer'
        ? 'open'
        : decision.action === 'create_ticket'
          ? 'pending'
          : 'escalated';
    await conversation.save();

    let ticket = null;
    if (decision.action === 'create_ticket' || decision.action === 'escalate') {
      ticket = await createTicketFromDecision({
        userId,
        conversationId: conversation._id,
        decision,
        channel: 'web',
      });
      conversation.ticketId = ticket._id;
      conversation.status = ticket.status;
      await conversation.save();
    }

    await AuditLog.create({
      actorId: req.user.id,
      actorRole: req.user.role || 'user',
      action: 'chat.message',
      targetType: 'conversation',
      targetId: conversation._id,
      metadata: {
        tokensUsed: decision.tokensUsed || 0,
        intent: decision.intent,
        confidence: decision.confidence,
        action: decision.action,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        reply: decision.reply,
        intent: decision.intent,
        sentiment: decision.sentiment,
        urgency: decision.urgency,
        confidence: decision.confidence,
        action: decision.action,
        isFallback: decision.action === 'escalate' || decision.action === 'create_ticket',
        tokensUsed: decision.tokensUsed || 0,
        totalTokens: conversation.totalTokens,
        conversationId: conversation._id,
        ticketId: ticket ? ticket._id : conversation.ticketId,
        sources: decision.sources || [],
        requestId: req.requestId,
        messages: [userMessage._id, assistantMessage._id],
      },
    });
  } catch (error) {
    console.error('sendMessage error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
}

async function getHistory(req, res) {
  try {
    const userId = req.user.id;

    const conversation = await Conversation.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();

    if (!conversation) {
      return res.status(200).json({
        success: true,
        data: {
          messages: [],
          totalTokens: 0,
          conversation: null,
        },
      });
    }

    const messages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        messages,
        totalTokens: conversation.totalTokens || 0,
        conversation,
      },
    });
  } catch (error) {
    console.error('getHistory error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
}

async function clearHistory(req, res) {
  try {
    const userId = req.user.id;

    const conversation = await Conversation.findOne({ userId }).sort({
      createdAt: -1,
    });

    if (!conversation) {
      return res.status(200).json({
        success: true,
        message: 'No conversation history found to clear.',
      });
    }

    await Message.deleteMany({ conversationId: conversation._id });
    await Conversation.deleteOne({ _id: conversation._id });
    await Ticket.deleteMany({ conversationId: conversation._id, userId });

    await AuditLog.create({
      actorId: userId,
      actorRole: req.user.role || 'user',
      action: 'chat.history_cleared',
      targetType: 'conversation',
      targetId: conversation._id,
      metadata: {},
    });

    return res.status(200).json({
      success: true,
      message: 'Conversation history cleared successfully.',
    });
  } catch (error) {
    console.error('clearHistory error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
}

module.exports = { sendMessage, getHistory, clearHistory };
