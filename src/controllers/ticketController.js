const Ticket = require('../models/Ticket');
const Conversation = require('../models/Conversation');
const AuditLog = require('../models/AuditLog');

function canAccessTicket(req, ticket) {
  return (
    req.user.role === 'admin' ||
    req.user.role === 'agent' ||
    String(ticket.userId) === String(req.user.id)
  );
}

async function createTicket(req, res) {
  try {
    const { subject, description = '', priority = 'medium', category = 'general' } = req.body;

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: 'Subject is required.',
      });
    }

    const conversation = await Conversation.create({
      userId: req.user.id,
      channel: 'web',
      status: 'open',
      lastMessageAt: new Date(),
      messageCount: 0,
      summary: description,
    });

    const ticket = await Ticket.create({
      userId: req.user.id,
      conversationId: conversation._id,
      subject,
      description,
      priority,
      category,
      channel: 'web',
    });

    conversation.ticketId = ticket._id;
    conversation.status = 'open';
    await conversation.save();

    await AuditLog.create({
      actorId: req.user.id,
      actorRole: req.user.role || 'user',
      action: 'ticket.created',
      targetType: 'ticket',
      targetId: ticket._id,
      metadata: { source: 'manual' },
    });

    return res.status(201).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    console.error('createTicket error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
}

async function listTickets(req, res) {
  try {
    const query = req.user.role === 'admin' || req.user.role === 'agent'
      ? {}
      : { userId: req.user.id };

    const tickets = await Ticket.find(query).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    console.error('listTickets error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
}

async function getTicket(req, res) {
  try {
    const ticket = await Ticket.findById(req.params.id).lean();
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.',
      });
    }

    if (!canAccessTicket(req, ticket)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden.',
      });
    }

    return res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    console.error('getTicket error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
}

async function updateTicket(req, res) {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.',
      });
    }

    if (!canAccessTicket(req, ticket)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden.',
      });
    }

    const allowed = ['status', 'priority', 'category', 'assigneeId', 'subject', 'description'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        ticket[key] = req.body[key];
      }
    }

    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      ticket.closedAt = new Date();
    }

    await ticket.save();

    await AuditLog.create({
      actorId: req.user.id,
      actorRole: req.user.role || 'user',
      action: 'ticket.updated',
      targetType: 'ticket',
      targetId: ticket._id,
      metadata: { changes: allowed.filter((key) => req.body[key] !== undefined) },
    });

    return res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    console.error('updateTicket error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
}

async function escalateTicket(req, res) {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.',
      });
    }

    if (!canAccessTicket(req, ticket)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden.',
      });
    }

    ticket.status = 'escalated';
    ticket.escalationReason = req.body.reason || ticket.escalationReason || 'Manual escalation requested';
    await ticket.save();

    await AuditLog.create({
      actorId: req.user.id,
      actorRole: req.user.role || 'user',
      action: 'ticket.escalated',
      targetType: 'ticket',
      targetId: ticket._id,
      metadata: { reason: ticket.escalationReason },
    });

    return res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    console.error('escalateTicket error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
}

module.exports = {
  createTicket,
  listTickets,
  getTicket,
  updateTicket,
  escalateTicket,
};
