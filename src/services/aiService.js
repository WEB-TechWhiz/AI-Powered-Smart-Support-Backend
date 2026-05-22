const { openai } = require('../config/openai');
const config = require('../config/env');

const SYSTEM_PROMPT = [
  'You are an AI support triage assistant for a customer support backend.',
  'Be concise, accurate, and grounded in the provided knowledge snippets.',
  'If the issue is not covered by the knowledge snippets or confidence is low, request escalation instead of guessing.',
  'Always return a single structured JSON object that matches the requested schema.',
].join(' ');

const DECISION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reply: { type: 'string' },
    intent: {
      type: 'string',
      enum: ['billing', 'technical', 'account', 'product', 'complaint', 'general', 'escalation'],
    },
    sentiment: {
      type: 'string',
      enum: ['positive', 'neutral', 'frustrated', 'angry', 'confused'],
    },
    urgency: {
      type: 'string',
      enum: ['low', 'medium', 'high', 'urgent'],
    },
    confidence: { type: 'number' },
    action: {
      type: 'string',
      enum: ['answer', 'create_ticket', 'escalate'],
    },
    summary: { type: 'string' },
    escalationReason: { type: 'string' },
    ticket: {
      type: 'object',
      additionalProperties: false,
      properties: {
        subject: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string' },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
        },
        reason: { type: 'string' },
      },
      required: ['subject', 'description', 'category', 'priority', 'reason'],
    },
    sources: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          articleId: { type: 'string' },
          title: { type: 'string' },
          score: { type: 'number' },
          excerpt: { type: 'string' },
        },
        required: ['articleId', 'title', 'score', 'excerpt'],
      },
    },
  },
  required: [
    'reply',
    'intent',
    'sentiment',
    'urgency',
    'confidence',
    'action',
    'summary',
    'escalationReason',
    'ticket',
    'sources',
  ],
};

function fallbackDecision(message, reason = 'The AI could not confidently answer the request.') {
  return {
    reply:
      "I wasn't able to fully resolve this automatically. I've created or will create a support handoff so a human agent can help.",
    intent: 'escalation',
    sentiment: 'neutral',
    urgency: 'medium',
    confidence: 0,
    action: 'escalate',
    summary: message,
    escalationReason: reason,
    ticket: {
      subject: 'Support escalation needed',
      description: message,
      category: 'general',
      priority: 'medium',
      reason,
    },
    sources: [],
  };
}

function serializeMessages(messages) {
  return messages
    .map(
      (message) =>
        `${message.role.toUpperCase()}: ${message.content.replace(/\s+/g, ' ').trim()}`
    )
    .join('\n');
}

function serializeKnowledge(articles) {
  if (!articles || articles.length === 0) {
    return 'No knowledge base snippets were found.';
  }

  return articles
    .map(
      (article, index) =>
        `${index + 1}. ${article.title} (${article.slug})\n${article.summary}\n${article.content.slice(0, 500)}`
    )
    .join('\n\n');
}

async function analyzeSupportRequest({
  userMessage,
  messages = [],
  knowledgeArticles = [],
  user,
  conversationId,
  requestId,
}) {
  const conversationContext = serializeMessages(messages.slice(-config.maxConversationMessages));
  const knowledgeContext = serializeKnowledge(knowledgeArticles);

  const prompt = [
    `Current user: ${user?.email || 'unknown'}`,
    `Conversation ID: ${conversationId || 'new'}`,
    `Request ID: ${requestId || 'none'}`,
    '',
    'Conversation history:',
    conversationContext || 'No previous messages.',
    '',
    'Approved knowledge snippets:',
    knowledgeContext,
    '',
    `Customer message: ${userMessage}`,
    '',
    'Return a customer-facing reply plus routing metadata.',
  ].join('\n');

  try {
    const model = config.openaiModel === 'gpt-5.4-mini' ? 'gpt-4o-mini' : config.openaiModel;

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 900,
      temperature: 0.2,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'support_decision',
          strict: true,
          schema: DECISION_SCHEMA,
        },
      },
    });

    const content = response.choices[0].message.content;
    let decision = JSON.parse(content || '{}');
    const confidence = Number(decision.confidence || 0);

    if (!decision.reply || Number.isNaN(confidence)) {
      return fallbackDecision(userMessage);
    }

    const isGeneralQuery =
      (decision.intent === 'general' || decision.intent === 'product') && confidence >= 0.75;

    if (
      decision.action === 'answer' &&
      !isGeneralQuery &&
      (confidence < 0.55 || !decision.sources || decision.sources.length === 0)
    ) {
      return fallbackDecision(
        userMessage,
        'The model was not confident enough to answer without a human handoff.'
      );
    }

    return {
      ...decision,
      confidence,
      tokensUsed: response.usage ? response.usage.total_tokens : 0,
      model: response.model,
      responseId: response.id,
    };
  } catch (error) {
    console.error('OpenAI response error:', error.message);
    return fallbackDecision(userMessage);
  }
}

module.exports = {
  analyzeSupportRequest,
  fallbackDecision,
};
