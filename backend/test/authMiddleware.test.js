import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { authorize } from '../src/middleware/authMiddleware.js';
import generateToken, { getJWTSecret } from '../src/utils/generateToken.js';

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

test('role authorization normalizes legacy student accounts', () => {
  let continued = false;
  const request = { user: { role: 'student' } };
  const response = { status: (code) => { response.statusCode = code; return response; } };

  authorize('user')(request, response, () => { continued = true; });
  assert.equal(continued, true);
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
