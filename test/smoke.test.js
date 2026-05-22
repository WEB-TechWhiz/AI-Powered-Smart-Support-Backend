const test = require('node:test');
const assert = require('node:assert/strict');

const slugify = require('../src/utils/slugify');
const { fallbackDecision } = require('../src/services/aiService');
const { sanitizeUser } = require('../src/controllers/authController');

test('slugify converts titles into URL-safe slugs', () => {
  assert.equal(slugify('Password Reset Policy!'), 'password-reset-policy');
});

test('fallbackDecision returns an escalation-friendly response shape', () => {
  const result = fallbackDecision('Reset password does not work');
  assert.equal(result.action, 'escalate');
  assert.equal(result.intent, 'escalation');
  assert.ok(result.reply.length > 0);
});

test('sanitizeUser removes secrets and keeps profile data', () => {
  const user = sanitizeUser({
    _id: 'abc123',
    email: 'user@example.com',
    name: 'User',
    role: 'user',
    status: 'active',
    emailVerified: false,
    password: 'secret',
  });

  assert.deepEqual(user, {
    id: 'abc123',
    email: 'user@example.com',
    name: 'User',
    role: 'user',
    status: 'active',
    emailVerified: false,
  });
});
