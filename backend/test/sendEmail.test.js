import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import { sendEmail, verifyEmailTransport } from '../src/utils/sendEmail.js';

const setEmailEnvironment = (t) => {
  const previous = {
    EMAIL_HOST: process.env.EMAIL_HOST,
    EMAIL_PORT: process.env.EMAIL_PORT,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS,
    EMAIL_FROM: process.env.EMAIL_FROM,
    RESEND_API_KEY: process.env.RESEND_API_KEY
  };
  Object.assign(process.env, {
    EMAIL_HOST: 'smtp.example.test',
    EMAIL_PORT: '587',
    EMAIL_USER: 'sender@example.test',
    EMAIL_PASS: 'not-a-real-password',
    EMAIL_FROM: 'Pennywise <sender@example.test>',
    RESEND_API_KEY: ''
  });
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
};

test('email transport uses STARTTLS, timeouts, and configured sender', async (t) => {
  setEmailEnvironment(t);
  let transportConfig;
  let sentMessage;
  t.mock.method(nodemailer, 'createTransport', (config) => {
    transportConfig = config;
    return {
      sendMail: async (message) => { sentMessage = message; },
      close() {}
    };
  });

  await sendEmail({
    to: 'recipient@example.test',
    subject: 'Verify',
    text: 'Plain text',
    html: '<p>Verify</p>'
  });

  assert.equal(transportConfig.host, 'smtp.example.test');
  assert.equal(transportConfig.port, 587);
  assert.equal(transportConfig.secure, false);
  assert.equal(transportConfig.requireTLS, true);
  assert.ok(transportConfig.connectionTimeout > 0);
  assert.equal(sentMessage.from, 'Pennywise <sender@example.test>');
  assert.equal(sentMessage.to, 'recipient@example.test');
});

test('email delivery retries an explicit temporary SMTP rejection once', async (t) => {
  setEmailEnvironment(t);
  let attempts = 0;
  t.mock.method(nodemailer, 'createTransport', () => ({
    sendMail: async () => {
      attempts += 1;
      if (attempts === 1) {
        const error = new Error('Temporary SMTP rejection');
        error.responseCode = 450;
        throw error;
      }
    },
    close() {}
  }));

  await sendEmail({ to: 'recipient@example.test', subject: 'Verify', text: 'Verify' });
  assert.equal(attempts, 2);
});

test('SMTP startup verification reports readiness without logging credentials', async (t) => {
  setEmailEnvironment(t);
  let transportConfig;
  t.mock.method(nodemailer, 'createTransport', (config) => {
    transportConfig = config;
    return { verify: async () => true, close() {} };
  });
  const logged = [];
  t.mock.method(console, 'info', (message) => logged.push(message));

  await verifyEmailTransport();

  assert.equal(transportConfig.auth.pass, 'not-a-real-password');
  assert.match(logged[0], /email_provider_ready/);
  assert.match(logged[0], /"provider":"smtp"/);
  assert.doesNotMatch(logged[0], /not-a-real-password|sender@example\.test/);
});

test('Resend sends verification mail over HTTPS without SMTP or credential logging', async (t) => {
  setEmailEnvironment(t);
  process.env.RESEND_API_KEY = 're_test_secret_not_for_logs';
  let requestUrl;
  let requestOptions;
  const logged = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requestUrl = url;
    requestOptions = options;
    return { ok: true, status: 200 };
  });
  t.mock.method(console, 'info', (message) => logged.push(message));

  await sendEmail({
    to: 'recipient@example.test',
    subject: 'Verify',
    text: 'Open your verification link',
    html: '<p>Verify</p>'
  });

  assert.equal(requestUrl, 'https://api.resend.com/emails');
  assert.equal(requestOptions.method, 'POST');
  assert.equal(requestOptions.headers.Authorization, 'Bearer re_test_secret_not_for_logs');
  assert.deepEqual(JSON.parse(requestOptions.body), {
    from: 'Pennywise <sender@example.test>',
    to: ['recipient@example.test'],
    subject: 'Verify',
    text: 'Open your verification link',
    html: '<p>Verify</p>'
  });
  assert.match(logged[0], /"provider":"resend"/);
  assert.doesNotMatch(logged.join('\n'), /re_test_secret_not_for_logs|recipient@example\.test/);
});

test('Resend startup check verifies API access without exposing the API key', async (t) => {
  setEmailEnvironment(t);
  process.env.RESEND_API_KEY = 're_test_secret_not_for_logs';
  let requestUrl;
  let requestOptions;
  const logged = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requestUrl = url;
    requestOptions = options;
    return { ok: true, status: 200 };
  });
  t.mock.method(console, 'info', (message) => logged.push(message));

  await verifyEmailTransport();

  assert.equal(requestUrl, 'https://api.resend.com/domains');
  assert.equal(requestOptions.headers.Authorization, 'Bearer re_test_secret_not_for_logs');
  assert.match(logged[0], /"provider":"resend"/);
  assert.doesNotMatch(logged.join('\n'), /re_test_secret_not_for_logs/);
});

test('Resend API rejection surfaces a safe provider code for diagnosis', async (t) => {
  setEmailEnvironment(t);
  process.env.RESEND_API_KEY = 're_test_secret_not_for_logs';
  const logged = [];
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 403 }));
  t.mock.method(console, 'error', (message) => logged.push(message));

  await assert.rejects(
    sendEmail({ to: 'recipient@example.test', subject: 'Verify', text: 'Verify' }),
    (error) => error.code === 'RESEND_API_ERROR' && error.responseCode === 403
  );
  assert.doesNotMatch(logged.join('\n'), /re_test_secret_not_for_logs|recipient@example\.test/);
  assert.match(logged[0], /"code":"RESEND_API_ERROR"/);
});
