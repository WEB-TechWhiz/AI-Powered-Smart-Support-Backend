const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Load environment config
const config = require('../src/config/env');
const { connectDB } = require('../src/config/db');

// Mock OpenAI before importing app
const { openai } = require('../src/config/openai');

let mockResponseAction = 'answer';
let mockConfidence = 0.95;

// Stub chat completions create call to avoid using credits or throwing keys errors
openai.chat.completions.create = async function (params) {
  const isTicketAction = mockResponseAction === 'create_ticket' || mockResponseAction === 'escalate';
  
  return {
    id: 'chatcmpl-mock123',
    model: params.model || 'gpt-4o-mini',
    usage: { total_tokens: 42 },
    choices: [
      {
        message: {
          content: JSON.stringify({
            reply: mockResponseAction === 'answer'
              ? 'Yes, we can help you with your account. Please log in and check your profile.'
              : 'I have escalated this issue to our human agents since I cannot address it directly.',
            intent: 'account',
            sentiment: 'neutral',
            urgency: 'medium',
            confidence: mockConfidence,
            action: mockResponseAction,
            summary: 'User requested account help.',
            escalationReason: mockResponseAction === 'escalate' ? 'Low confidence or scope boundary' : '',
            ticket: {
              subject: isTicketAction ? 'Help needed with account billing' : '',
              description: isTicketAction ? 'The user requested billing support' : '',
              category: isTicketAction ? 'billing' : '',
              priority: 'high',
              reason: isTicketAction ? 'AI triage escalated customer issue' : '',
            },
            sources: [
              {
                articleId: 'art-1234',
                title: 'Account Recovery Guide',
                score: 0.92,
                excerpt: 'To recover your account, check the profile settings page...',
              },
            ],
          }),
        },
      },
    ],
  };
};

const app = require('../src/app');

// Models to clean up after testing
const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');
const Ticket = require('../src/models/Ticket');
const Feedback = require('../src/models/Feedback');
const AuditLog = require('../src/models/AuditLog');
const KnowledgeArticle = require('../src/models/KnowledgeArticle');

let authToken = '';
let adminToken = '';
let conversationId = '';
let ticketId = '';
let serverInstance = null;
let port = 5123;
let baseUrl = `http://localhost:${port}`;

// Setup: Connect to database and start server
test.before(async () => {
  await connectDB();
  
  // Clean up any stray test data
  await Promise.all([
    User.deleteMany({ email: /@test-integration\.com$/ }),
    Conversation.deleteMany({}),
    Message.deleteMany({}),
    Ticket.deleteMany({}),
    Feedback.deleteMany({}),
    AuditLog.deleteMany({}),
    KnowledgeArticle.deleteMany({}),
  ]);

  // Insert mock Knowledge Base Article
  await KnowledgeArticle.create({
    title: 'Account Recovery Guide',
    slug: 'account-recovery-guide',
    content: 'To recover your account, check the profile settings page. If you lost your password, click on the forgot password button.',
    tags: ['account', 'profile', 'password'],
    category: 'account',
    status: 'published',
  });

  // Start express server
  await new Promise((resolve) => {
    serverInstance = app.listen(port, () => {
      resolve();
    });
  });
});

// Teardown: Clean up and close connection
test.after(async () => {
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
  }
  
  // Final clean up
  await Promise.all([
    User.deleteMany({ email: /@test-integration\.com$/ }),
    Conversation.deleteMany({}),
    Message.deleteMany({}),
    Ticket.deleteMany({}),
    Feedback.deleteMany({}),
    AuditLog.deleteMany({}),
    KnowledgeArticle.deleteMany({}),
  ]);

  await mongoose.connection.close();
});

test('1. Auth Routes: Register user', async () => {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'customer@test-integration.com',
      password: 'password123',
      name: 'Integration Test Customer',
    }),
  });

  const body = await res.json();
  assert.equal(res.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.data.user.email, 'customer@test-integration.com');
  assert.ok(body.data.accessToken);
  
  // Store token for subsequent requests
  authToken = body.data.accessToken;
});

test('2. Auth Routes: Register admin', async () => {
  // Create admin user in db directly to bypass verification or role restrictions on registration
  const adminUser = await User.create({
    email: 'admin@test-integration.com',
    password: 'passwordAdmin123',
    name: 'Integration Admin',
    role: 'admin',
  });

  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@test-integration.com',
      password: 'passwordAdmin123',
    }),
  });

  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.user.role, 'admin');
  
  adminToken = body.data.accessToken;
});

test('3. Auth Routes: Get profile (Me)', async () => {
  const res = await fetch(`${baseUrl}/api/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.user.email, 'customer@test-integration.com');
});

test('4. KB Routes: Search articles', async () => {
  const res = await fetch(`${baseUrl}/api/kb/search?q=recovery`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.ok(body.data.length > 0);
  assert.equal(body.data[0].slug, 'account-recovery-guide');
});

test('5. Chat Routes: Send standard message (AI Answer)', async () => {
  mockResponseAction = 'answer';
  mockConfidence = 0.95;

  const res = await fetch(`${baseUrl}/api/chat/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      message: 'Can I change my password from profile settings?',
    }),
  });

  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.action, 'answer');
  assert.equal(body.data.isFallback, false);
  assert.ok(body.data.reply.includes('check your profile'));
  assert.ok(body.data.conversationId);
  
  conversationId = body.data.conversationId;
});

test('6. Chat Routes: Send complex message (Escalate to Ticket)', async () => {
  mockResponseAction = 'create_ticket';
  mockConfidence = 0.88;

  const res = await fetch(`${baseUrl}/api/chat/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      conversationId,
      message: 'I would like to escalate my billing issue to a manager.',
    }),
  });

  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.action, 'create_ticket');
  assert.equal(body.data.isFallback, true);
  assert.ok(body.data.ticketId);
  
  ticketId = body.data.ticketId;
});

test('7. Chat Routes: Get conversation history', async () => {
  const res = await fetch(`${baseUrl}/api/chat/history`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.ok(body.data.messages.length >= 4); // 2 user messages + 2 AI messages
});

test('8. Support Tickets: List and retrieve ticket', async () => {
  // Get all tickets
  const resList = await fetch(`${baseUrl}/api/support/tickets`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const bodyList = await resList.json();
  assert.equal(resList.status, 200);
  assert.equal(bodyList.success, true);
  assert.ok(bodyList.data.length > 0);

  // Get specific ticket
  const resGet = await fetch(`${baseUrl}/api/support/tickets/${ticketId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const bodyGet = await resGet.json();
  assert.equal(resGet.status, 200);
  assert.equal(bodyGet.success, true);
  assert.equal(bodyGet.data.subject, 'Help needed with account billing');
});

test('9. Feedback: Submit and list feedback', async () => {
  // Submit feedback
  const resPost = await fetch(`${baseUrl}/api/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      rating: 5,
      comment: 'Excellent AI response, resolved my issue instantly!',
      conversationId,
      ticketId,
    }),
  });

  const bodyPost = await resPost.json();
  assert.equal(resPost.status, 201);
  assert.equal(bodyPost.success, true);
  assert.equal(bodyPost.data.rating, 5);

  // List feedback
  const resGet = await fetch(`${baseUrl}/api/feedback`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const bodyGet = await resGet.json();
  assert.equal(resGet.status, 200);
  assert.equal(bodyGet.success, true);
  assert.ok(bodyGet.data.length > 0);
  assert.equal(bodyGet.data[0].comment, 'Excellent AI response, resolved my issue instantly!');
});

test('10. Admin Routes: Retrieve Metrics and Audit Logs', async () => {
  // Get metrics
  const resMetrics = await fetch(`${baseUrl}/api/admin/metrics`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });

  const bodyMetrics = await resMetrics.json();
  assert.equal(resMetrics.status, 200);
  assert.equal(bodyMetrics.success, true);
  assert.ok(bodyMetrics.data.conversationCount > 0);
  assert.ok(bodyMetrics.data.feedbackCount > 0);

  // Get audit logs
  const resLogs = await fetch(`${baseUrl}/api/admin/audit-logs`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });

  const bodyLogs = await resLogs.json();
  assert.equal(resLogs.status, 200);
  assert.equal(bodyLogs.success, true);
  assert.ok(bodyLogs.data.length > 0);
});
