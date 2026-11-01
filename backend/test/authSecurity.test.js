import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmailVerificationCode,
  hashEmailVerificationCode,
  isValidEmail,
  isValidPassword,
  matchesEmailVerificationCode
} from '../src/utils/authSecurity.js';

test('verification codes contain exactly six numeric digits', () => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    assert.match(createEmailVerificationCode(), /^\d{6}$/);
  }
});

test('verification code hashes are salted, email-bound, and checked safely', () => {
  process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters';
  const hash = hashEmailVerificationCode('Tenant@Gmail.com', '004219', 'random-salt');

  assert.equal(matchesEmailVerificationCode('tenant@gmail.com', '004219', 'random-salt', hash), true);
  assert.equal(matchesEmailVerificationCode('other@gmail.com', '004219', 'random-salt', hash), false);
  assert.equal(matchesEmailVerificationCode('tenant@gmail.com', '004218', 'random-salt', hash), false);
  assert.equal(matchesEmailVerificationCode('tenant@gmail.com', '4219', 'random-salt', hash), false);
  assert.notEqual(hashEmailVerificationCode('tenant@gmail.com', '004219', 'other-salt'), hash);
});

test('password validation enforces bcrypt-safe length boundaries', () => {
  assert.equal(isValidPassword('short7'), false);
  assert.equal(isValidPassword('long-enough-password'), true);
  assert.equal(isValidPassword('é'.repeat(37)), false);
  assert.equal(isValidPassword(null), false);
});

test('email validation accepts normalized addresses and rejects malformed input', () => {
  assert.equal(isValidEmail('tenant@example.com'), true);
  assert.equal(isValidEmail(' tenant@example.com '), true);
  assert.equal(isValidEmail('tenant@localhost'), false);
  assert.equal(isValidEmail('not-an-email'), false);
  assert.equal(isValidEmail(null), false);
});
