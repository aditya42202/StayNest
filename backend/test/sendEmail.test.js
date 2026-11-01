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
    EMAIL_FROM: process.env.EMAIL_FROM
  };
  Object.assign(process.env, {
    EMAIL_HOST: 'smtp.example.test',
    EMAIL_PORT: '587',
    EMAIL_USER: 'sender@example.test',
    EMAIL_PASS: 'not-a-real-password',
    EMAIL_FROM: 'Pennywise <sender@example.test>'
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
  assert.match(logged[0], /smtp_ready/);
  assert.doesNotMatch(logged[0], /not-a-real-password|sender@example\.test/);
});
