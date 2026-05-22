const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      default: null,
    },
    channel: {
      type: String,
      enum: ['web', 'email', 'chat', 'api'],
      default: 'web',
    },
    status: {
      type: String,
      enum: ['open', 'pending', 'escalated', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    summary: {
      type: String,
      default: '',
    },
    lastMessageAt: {
      type: Date,
      default: null,
      index: true,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    totalTokens: {
      type: Number,
      default: 0,
    },
    aiModel: {
      type: String,
      default: '',
    },
    aiConfidence: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', conversationSchema);
