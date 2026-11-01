import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import nodemailer from 'nodemailer';
import {
  getEmailConfigurationStatus,
  sendEmail,
  verifyEmailTransport
} from '../src/utils/sendEmail.js';

const setEmailEnvironment = (t) => {
  const previous = {
    EMAIL_HOST: process.env.EMAIL_HOST,
    EMAIL_PORT: process.env.EMAIL_PORT,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS,
    EMAIL_FROM: process.env.EMAIL_FROM,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_SECURE: process.env.SMTP_SECURE
  };
  Object.assign(process.env, {
    EMAIL_HOST: 'smtp.example.test',
    EMAIL_PORT: '587',
    EMAIL_USER: 'sender@example.test',
    EMAIL_PASS: 'not-a-real-password',
    EMAIL_FROM: 'Pennywise <sender@example.test>',
    RESEND_API_KEY: '',
    EMAIL_PROVIDER: '',
    SMTP_HOST: '',
    SMTP_PORT: '',
    SMTP_USER: '',
    SMTP_PASS: '',
    SMTP_SECURE: ''
  });
  delete process.env.SMTP_SECURE;
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
  assert.ok(transportConfig.greetingTimeout > 0);
  assert.ok(transportConfig.socketTimeout > 0);
  assert.equal(sentMessage.from, 'Pennywise <sender@example.test>');
  assert.equal(sentMessage.to, 'recipient@example.test');
});

test('SMTP port 465 uses implicit TLS with the SMTP-prefixed settings', async (t) => {
  setEmailEnvironment(t);
  process.env.EMAIL_PROVIDER = 'smtp';
  process.env.SMTP_HOST = 'smtp.example.test';
  process.env.SMTP_PORT = '465';
  process.env.SMTP_USER = 'smtp-sender@example.test';
  process.env.SMTP_PASS = 'smtp-password';
  process.env.SMTP_SECURE = 'true';
  let transportConfig;
  t.mock.method(nodemailer, 'createTransport', (config) => {
    transportConfig = config;
    return { sendMail: async () => {}, close() {} };
  });

  await sendEmail({
    to: 'recipient@example.test',
    subject: 'Verify',
    text: 'Plain text'
  });

  assert.equal(transportConfig.host, 'smtp.example.test');
  assert.equal(transportConfig.port, 465);
  assert.equal(transportConfig.secure, true);
  assert.equal(transportConfig.requireTLS, false);
  assert.equal(transportConfig.auth.user, 'smtp-sender@example.test');
});

test('email delivery retries temporary SMTP rejection at most three times', async (t) => {
  setEmailEnvironment(t);
  let attempts = 0;
  t.mock.method(console, 'warn', () => {});
  t.mock.method(nodemailer, 'createTransport', () => ({
    sendMail: async () => {
      attempts += 1;
      if (attempts <= 3) {
        const error = new Error('Temporary SMTP rejection');
        error.responseCode = 450;
        throw error;
      }
    },
    close() {}
  }));

  await sendEmail({ to: 'recipient@example.test', subject: 'Verify', text: 'Verify' });
  assert.equal(attempts, 4);
});

test('email delivery does not retry permanent SMTP authentication failures', async (t) => {
  setEmailEnvironment(t);
  let attempts = 0;
  t.mock.method(console, 'error', () => {});
  t.mock.method(nodemailer, 'createTransport', () => ({
    sendMail: async () => {
      attempts += 1;
      const error = new Error('Authentication failed');
      error.responseCode = 535;
      throw error;
    },
    close() {}
  }));

  await assert.rejects(
    sendEmail({ to: 'recipient@example.test', subject: 'Verify', text: 'Verify' }),
    (error) => error.retryable === false
  );
  assert.equal(attempts, 1);
});

test('invalid SMTP port and TLS combinations fail configuration validation', (t) => {
  setEmailEnvironment(t);
  process.env.SMTP_PORT = '587';
  process.env.SMTP_SECURE = 'true';
  assert.equal(getEmailConfigurationStatus().configured, false);

  process.env.SMTP_PORT = '25';
  process.env.SMTP_SECURE = 'false';
  assert.equal(getEmailConfigurationStatus().configured, false);
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

  const idempotencyKey = 'verification-token';
  await sendEmail({
    to: 'recipient@example.test',
    subject: 'Verify',
    text: 'Open your verification link',
    html: '<p>Verify</p>'
  }, { idempotencyKey });

  assert.equal(requestUrl, 'https://api.resend.com/emails');
  assert.equal(requestOptions.method, 'POST');
  assert.equal(requestOptions.headers.Authorization, 'Bearer re_test_secret_not_for_logs');
  assert.equal(
    requestOptions.headers['Idempotency-Key'],
    createHash('sha256').update(idempotencyKey).digest('hex')
  );
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
