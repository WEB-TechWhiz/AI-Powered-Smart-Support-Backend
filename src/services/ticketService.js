const Ticket = require('../models/Ticket');
const Conversation = require('../models/Conversation');
const AuditLog = require('../models/AuditLog');

async function createTicketFromDecision({
  userId,
  conversationId,
  decision,
  channel = 'web',
}) {
  const ticket = await Ticket.create({
    userId,
    conversationId,
    subject: decision.ticket?.subject || decision.summary || 'Support request',
    description: decision.ticket?.description || decision.summary || '',
    category: decision.ticket?.category || decision.intent || 'general',
    priority: decision.ticket?.priority || 'medium',
    escalationReason:
      decision.ticket?.reason || decision.escalationReason || 'AI triage requested escalation',
    aiSummary: decision.summary || '',
    channel,
    status: decision.action === 'escalate' ? 'escalated' : 'open',
  });

  await Conversation.findByIdAndUpdate(conversationId, {
    ticketId: ticket._id,
    status: decision.action === 'escalate' ? 'escalated' : 'pending',
    summary: decision.summary || '',
    aiModel: decision.model || '',
    aiConfidence: decision.confidence || 0,
  });

  await AuditLog.create({
    actorId: userId,
    actorRole: 'system',
    action: 'ticket.created',
    targetType: 'ticket',
    targetId: ticket._id,
    metadata: {
      conversationId,
      reason: ticket.escalationReason,
      intent: decision.intent,
      confidence: decision.confidence,
    },
  });

  return ticket;
}

module.exports = { createTicketFromDecision };
