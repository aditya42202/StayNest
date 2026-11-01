import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { authorize, protect } from '../src/middleware/authMiddleware.js';
import User from '../src/models/User.js';
import generateToken, { getJWTSecret } from '../src/utils/generateToken.js';
import { canonicalRole, normalizeRole } from '../src/utils/roles.js';

const secret = 'test-secret-with-more-than-thirty-two-characters';

test('JWT access tokens use the configured short lifetime and current identity', () => {
  process.env.JWT_SECRET = secret;
  delete process.env.JWT_ACCESS_EXPIRES_IN;

  const token = generateToken({
    _id: '012345678901234567890123',
    role: 'owner',
    email: 'owner@example.com',
    tokenVersion: 3
  });
  const decoded = jwt.verify(token, secret);

  assert.equal(decoded.id, '012345678901234567890123');
  assert.equal(decoded.role, 'owner');
  assert.equal(decoded.tokenVersion, 3);
  assert.ok(decoded.exp - decoded.iat <= 15 * 60);
});

test('JWT signing refuses missing or short secrets', () => {
  process.env.JWT_SECRET = 'short';
  assert.throws(() => getJWTSecret(), /at least 32 characters/);
  delete process.env.JWT_SECRET;
  assert.throws(() => getJWTSecret(), /at least 32 characters/);
  process.env.JWT_SECRET = secret;
});

test('protected routes reject users without a verified email', async (t) => {
  process.env.JWT_SECRET = secret;
  const token = generateToken({
    _id: '012345678901234567890123',
    role: 'user',
    tokenVersion: 0
  });
  t.mock.method(User, 'findById', async () => ({
    tokenVersion: 0,
    verified: false,
    emailVerificationRequired: false,
    blocked: false
  }));
  const response = {
    status(code) {
      this.statusCode = code;
      return this;
    }
  };

  await assert.rejects(
    protect({ headers: { authorization: `Bearer ${token}` } }, response, () => {}),
    /verify your email address/
  );
  assert.equal(response.statusCode, 403);
});

test('role authorization normalizes legacy student accounts', () => {
  let continued = false;
  const request = { user: { role: 'student' } };
  const response = { status: (code) => { response.statusCode = code; return response; } };

  authorize('user')(request, response, () => { continued = true; });
  assert.equal(continued, true);
});

test('tenant and tourist roles share customer authorization without a parallel role system', () => {
  assert.equal(normalizeRole('student'), 'user');
  assert.equal(normalizeRole('tenant'), 'user');
  assert.equal(normalizeRole('tourist'), 'user');
  assert.equal(canonicalRole('tourist'), 'user');

  let continued = false;
  const request = { user: { role: 'owner' } };
  const response = { status: (code) => { response.statusCode = code; return response; } };
  authorize('user', 'owner')(request, response, () => { continued = true; });
  assert.equal(continued, true);
});

test('admin is not authorized to use customer property-search endpoints', () => {
  let continued = false;
  const request = { user: { role: 'admin' } };
  const response = { status: (code) => { response.statusCode = code; return response; } };

  assert.throws(
    () => authorize('user', 'owner')(request, response, () => { continued = true; }),
    /insufficient permissions/
  );
  assert.equal(continued, false);
  assert.equal(response.statusCode, 403);
});

test('role authorization rejects accounts outside the allowed roles', () => {
  let continued = false;
  const request = { user: { role: 'owner' } };
  const response = { status: (code) => { response.statusCode = code; return response; } };

  assert.throws(
    () => authorize('admin')(request, response, () => { continued = true; }),
    /insufficient permissions/
  );
  assert.equal(continued, false);
  assert.equal(response.statusCode, 403);
});
