import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import RefreshToken from '../src/models/RefreshToken.js';
import User from '../src/models/User.js';
import {
  loginUser,
  registerUser,
  resendVerificationEmail,
  verifyEmail
} from '../src/controllers/authController.js';

const setAuthEnvironment = (t) => {
  const keys = [
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USER',
    'EMAIL_PASS',
    'EMAIL_FROM',
    'FRONTEND_URL',
    'JWT_SECRET'
  ];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, {
    EMAIL_HOST: 'smtp.example.test',
    EMAIL_PORT: '587',
    EMAIL_USER: 'sender@example.test',
    EMAIL_PASS: 'not-a-real-password',
    EMAIL_FROM: 'StayNest <sender@example.test>',
    FRONTEND_URL: 'https://frontend.example.test',
    JWT_SECRET: 'test-secret-with-more-than-thirty-two-characters'
  });
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
};

const createResponse = () => ({
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
  cookie(name, value, options) {
    this.cookieValue = { name, value, options };
    return this;
  }
});

const createSmtpMock = (t, sendMail) => {
  t.mock.method(nodemailer, 'createTransport', () => ({
    sendMail,
    close() {}
  }));
};

test('signup normalizes input, saves a password hash, and sends a hashed-token link', async (t) => {
  setAuthEnvironment(t);
  let createdUser;
  let sentMessage;
  const user = {
    _id: '012345678901234567890123',
    name: 'Taylor',
    email: 'taylor@gmail.com',
    role: 'user',
    verified: false
  };
  t.mock.method(User, 'findOne', async () => null);
  t.mock.method(User, 'create', async (data) => {
    createdUser = data;
    return { ...user, ...data, _id: user._id };
  });
  createSmtpMock(t, async (message) => { sentMessage = message; });
  const response = createResponse();

  await registerUser({
    body: {
      name: ' Taylor ',
      email: 'Taylor@Gmail.com',
      password: 'secure-password'
    }
  }, response);

  const token = sentMessage.text.match(/verify-email\?token=([a-f\d]{64})/i)?.[1];
  assert.ok(token);
  assert.equal(createdUser.name, 'Taylor');
  assert.equal(createdUser.email, 'taylor@gmail.com');
  assert.notEqual(createdUser.password, 'secure-password');
  assert.equal(await bcrypt.compare('secure-password', createdUser.password), true);
  assert.equal(
    createdUser.emailVerificationCodeHash,
    createHash('sha256').update(token).digest('hex')
  );
  assert.match(sentMessage.html, /30 minutes/);
  assert.equal(response.statusCode, 201);
  assert.equal(response.body.verificationRequired, true);
  assert.equal(response.body.user.password, undefined);
  assert.equal(response.body.user.emailVerificationCodeHash, undefined);
});

test('signup rejects invalid data and duplicate emails without creating another user', async (t) => {
  setAuthEnvironment(t);
  const findOne = t.mock.method(User, 'findOne', async () => ({ _id: 'existing' }));
  const create = t.mock.method(User, 'create', async () => assert.fail('must not create a duplicate'));
  const response = createResponse();

  await assert.rejects(
    registerUser({ body: { name: 'Name', email: 'invalid', password: 'secure-password' } }, response),
    /valid @gmail\.com/
  );
  assert.equal(response.statusCode, 400);
  assert.equal(findOne.mock.callCount(), 0);

  await assert.rejects(
    registerUser({ body: { name: 'Name', email: 'person@gmail.com', password: 'short' } }, response),
    /at least 8 characters/
  );
  assert.equal(findOne.mock.callCount(), 0);

  await assert.rejects(
    registerUser({ body: { name: 'Name', email: 'person@gmail.com', password: 'secure-password' } }, response),
    /Email already registered/
  );
  assert.equal(response.statusCode, 409);
  assert.equal(create.mock.callCount(), 0);
});

test('signup retains the unverified user and reports SMTP failure without logging the token', async (t) => {
  setAuthEnvironment(t);
  const logs = [];
  t.mock.method(console, 'error', (line) => logs.push(line));
  let createdUser;
  t.mock.method(User, 'findOne', async () => null);
  t.mock.method(User, 'create', async (data) => {
    createdUser = data;
    return { ...data, _id: '012345678901234567890123' };
  });
  createSmtpMock(t, async () => {
    const error = new Error('SMTP authentication failed');
    error.responseCode = 535;
    throw error;
  });
  const response = createResponse();

  await assert.rejects(
    registerUser({
      body: { name: 'Taylor', email: 'taylor@gmail.com', password: 'secure-password' }
    }, response),
    /account was created/
  );

  assert.equal(response.statusCode, 503);
  assert.ok(createdUser);
  assert.equal(createdUser.verified, false);
  assert.match(createdUser.emailVerificationCodeHash, /^[a-f\d]{64}$/);
  assert.equal(logs.join('\n').includes(createdUser.emailVerificationCodeHash), false);
  assert.equal(logs.join('\n').includes(process.env.EMAIL_PASS), false);
});

test('verification link is single-use and rejects invalid or expired tokens', async (t) => {
  const token = 'a'.repeat(64);
  const hash = createHash('sha256').update(token).digest('hex');
  let consumed = false;
  const findOneAndUpdate = t.mock.method(User, 'findOneAndUpdate', async (query) => {
    assert.equal(query.emailVerificationCodeHash, hash);
    assert.ok(query.emailVerificationExpires.$gt instanceof Date);
    if (consumed) return null;
    consumed = true;
    return { verified: true };
  });

  const success = createResponse();
  await verifyEmail({ body: { token } }, success);
  assert.equal(success.body.message, 'Email verified successfully');
  assert.equal(findOneAndUpdate.mock.callCount(), 1);

  const replay = createResponse();
  await assert.rejects(verifyEmail({ body: { token } }, replay), /invalid, expired, or has already been used/);
  assert.equal(replay.statusCode, 400);

  const invalid = createResponse();
  await assert.rejects(verifyEmail({ body: { token: 'bad' } }, invalid), /invalid, expired, or has already been used/);
  assert.equal(invalid.statusCode, 400);
  assert.equal(findOneAndUpdate.mock.callCount(), 2);
});

test('resend rotates the token atomically and sends only the generic response', async (t) => {
  setAuthEnvironment(t);
  let query;
  let update;
  let sentMessage;
  let resendCalls = 0;
  t.mock.method(User, 'findOneAndUpdate', async (filter, changes) => {
    resendCalls += 1;
    query = filter;
    update = changes;
    return resendCalls === 1 ? { email: 'person@gmail.com' } : null;
  });
  createSmtpMock(t, async (message) => { sentMessage = message; });
  const response = createResponse();

  await resendVerificationEmail({ body: { email: 'Person@gmail.com' } }, response);

  const token = sentMessage.text.match(/verify-email\?token=([a-f\d]{64})/i)?.[1];
  assert.ok(token);
  assert.equal(query.email, 'person@gmail.com');
  assert.equal(query.verified, false);
  assert.equal(query.$or.length, 2);
  assert.ok(query.$or[1].emailVerificationResendAfter.$lte instanceof Date);
  assert.equal(
    update.$set.emailVerificationCodeHash,
    createHash('sha256').update(token).digest('hex')
  );
  assert.equal(response.statusCode, 200);
  assert.match(response.body.message, /If an unverified account exists/);
  assert.equal(JSON.stringify(response.body).includes(token), false);

  const cooldownResponse = createResponse();
  await resendVerificationEmail({ body: { email: 'Person@gmail.com' } }, cooldownResponse);
  assert.equal(cooldownResponse.statusCode, 200);
  assert.equal(cooldownResponse.body.message, response.body.message);
  assert.equal(resendCalls, 2);
});

test('login permits verified users and rejects unverified or invalid credentials', async (t) => {
  setAuthEnvironment(t);
  const passwordHash = await bcrypt.hash('secure-password', 4);
  const verifiedUser = {
    _id: '012345678901234567890123',
    name: 'Taylor',
    email: 'taylor@gmail.com',
    password: passwordHash,
    role: 'user',
    verified: true,
    tokenVersion: 0
  };
  t.mock.method(User, 'findOne', () => ({
    select: async () => verifiedUser
  }));
  t.mock.method(RefreshToken, 'create', async () => ({}));
  const success = createResponse();

  await loginUser({
    body: { email: 'Taylor@gmail.com', password: 'secure-password' }
  }, success);

  assert.equal(success.statusCode, 200);
  assert.equal(success.body.user.email, 'taylor@gmail.com');
  assert.ok(success.body.token);
  assert.equal(success.cookieValue.options.httpOnly, true);

  const unverifiedResponse = createResponse();
  t.mock.restoreAll();
  t.mock.method(User, 'findOne', () => ({
    select: async () => ({ ...verifiedUser, verified: false })
  }));
  await assert.rejects(
    loginUser({
      body: { email: 'Taylor@gmail.com', password: 'secure-password' }
    }, unverifiedResponse),
    /verify your email/
  );
  assert.equal(unverifiedResponse.statusCode, 403);

  const invalidResponse = createResponse();
  t.mock.method(User, 'findOne', () => ({
    select: async () => null
  }));
  await assert.rejects(
    loginUser({
      body: { email: 'Taylor@gmail.com', password: 'secure-password' }
    }, invalidResponse),
    /Invalid email or password/
  );
  assert.equal(invalidResponse.statusCode, 401);
});
