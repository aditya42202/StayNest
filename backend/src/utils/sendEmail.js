import { createHash } from 'node:crypto';
import nodemailer from 'nodemailer';

const requestTimeoutMs = 10_000;
const maxRetries = 3;
const retryBaseDelayMs = 250;
const smtpPorts = new Set([465, 587, 2525]);

const getProviderName = () => {
  const configuredProvider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  return configuredProvider || (process.env.RESEND_API_KEY ? 'resend' : 'smtp');
};

const getSmtpConfig = () => {
  const host = (process.env.SMTP_HOST || process.env.EMAIL_HOST)?.trim();
  const user = (process.env.SMTP_USER || process.env.EMAIL_USER)?.trim();
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT);
  const secureSetting = process.env.SMTP_SECURE?.trim().toLowerCase();
  const secure = secureSetting === undefined ? port === 465 : secureSetting === 'true';

  if (
    !host
    || !user
    || !pass
    || !Number.isInteger(port)
    || !smtpPorts.has(port)
    || (secureSetting !== undefined && !['true', 'false'].includes(secureSetting))
    || secure !== (port === 465)
  ) {
    return null;
  }

  return {
    host,
    port,
    secure,
    requireTLS: port !== 465,
    connectionTimeout: requestTimeoutMs,
    greetingTimeout: requestTimeoutMs,
    socketTimeout: 20_000,
    auth: { user, pass }
  };
};

export const getEmailConfigurationStatus = () => {
  const provider = getProviderName();
  if (provider === 'resend') {
    const configured = Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
    return {
      configured,
      provider,
      reason: configured ? undefined : 'RESEND_API_KEY and EMAIL_FROM are required for Resend'
    };
  }

  if (provider === 'smtp') {
    const configured = Boolean(getSmtpConfig());
    return {
      configured,
      provider,
      reason: configured
        ? undefined
        : 'SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS are required'
    };
  }

  return {
    configured: false,
    provider: 'unknown',
    reason: 'EMAIL_PROVIDER must be either resend or smtp'
  };
};

export const isEmailServiceConfigured = () => getEmailConfigurationStatus().configured;

const logEmailEvent = (level, event, details = {}) => {
  console[level](JSON.stringify({ event, ...details }));
};

const getErrorCode = (error) => (
  typeof error?.code === 'string'
    ? error.code
    : typeof error?.cause?.code === 'string'
      ? error.cause.code
      : undefined
);

export const isTemporaryEmailFailure = (error, provider = getProviderName()) => {
  if (Number.isInteger(error?.responseCode)) {
    if (provider === 'smtp') {
      return error.responseCode >= 400 && error.responseCode < 500;
    }
    return error.responseCode === 408
      || error.responseCode === 425
      || error.responseCode === 429
      || error.responseCode >= 500;
  }

  return [
    'ETIMEDOUT',
    'ESOCKET',
    'ECONNECTION',
    'ECONNRESET',
    'EPIPE',
    'EAI_AGAIN'
  ].includes(getErrorCode(error)) || ['TimeoutError', 'AbortError'].includes(error?.name);
};

const resendRequest = async (path, options = {}, idempotencyKey) => {
  const headers = {
    Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers
  };
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const response = await fetch(`https://api.resend.com${path}`, {
    ...options,
    signal: AbortSignal.timeout(requestTimeoutMs),
    headers
  });

  if (!response.ok) {
    const error = new Error('Email provider rejected the request');
    error.name = 'EmailProviderError';
    error.code = 'RESEND_API_ERROR';
    error.responseCode = response.status;
    throw error;
  }
  return response;
};

const sendWithResend = async (message, idempotencyKey) => {
  await resendRequest('/emails', {
    method: 'POST',
    body: JSON.stringify({
      from: process.env.EMAIL_FROM.trim(),
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html
    })
  }, idempotencyKey);
};

const sendWithSmtp = async (message, idempotencyKey) => {
  const config = getSmtpConfig();
  if (!config) {
    throw new Error('SMTP email service is not configured correctly');
  }

  const transporter = nodemailer.createTransport(config);
  try {
    const options = {
      from: process.env.EMAIL_FROM?.trim() || config.auth.user,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html
    };
    if (idempotencyKey) {
      const messageId = createHash('sha256').update(idempotencyKey).digest('hex');
      options.messageId = `<${messageId}@staynest.invalid>`;
    }
    await transporter.sendMail(options);
  } finally {
    transporter.close();
  }
};

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const verifyEmailTransport = async () => {
  const status = getEmailConfigurationStatus();
  if (!status.configured) {
    throw new Error(status.reason);
  }

  if (status.provider === 'resend') {
    await resendRequest('/domains');
    logEmailEvent('info', 'email_provider_ready', { provider: status.provider });
    return;
  }

  const transporter = nodemailer.createTransport(getSmtpConfig());
  try {
    await transporter.verify();
    logEmailEvent('info', 'email_provider_ready', { provider: status.provider });
  } finally {
    transporter.close();
  }
};

export const sendEmail = async (message, { idempotencyKey } = {}) => {
  const status = getEmailConfigurationStatus();
  if (!status.configured) {
    throw new Error(status.reason);
  }
  const hashedIdempotencyKey = idempotencyKey
    ? createHash('sha256').update(idempotencyKey).digest('hex')
    : undefined;

  for (let retry = 0; ; retry += 1) {
    try {
      if (status.provider === 'resend') {
        await sendWithResend(message, hashedIdempotencyKey);
      } else {
        await sendWithSmtp(message, idempotencyKey);
      }
      logEmailEvent('info', 'email_delivery_succeeded', { provider: status.provider });
      return;
    } catch (error) {
      const temporary = isTemporaryEmailFailure(error, status.provider);
      if (temporary && retry < maxRetries) {
        const nextAttempt = retry + 1;
        logEmailEvent('warn', 'email_delivery_retrying', {
          provider: status.provider,
          attempt: nextAttempt,
          code: getErrorCode(error),
          responseCode: Number.isInteger(error?.responseCode) ? error.responseCode : undefined
        });
        await delay(retryBaseDelayMs * (2 ** retry));
        continue;
      }

      if (error && typeof error === 'object') {
        error.retryable = temporary;
      }
      logEmailEvent('error', 'email_delivery_failed', {
        provider: status.provider,
        name: typeof error?.name === 'string' ? error.name : 'UnknownError',
        code: getErrorCode(error),
        responseCode: Number.isInteger(error?.responseCode) ? error.responseCode : undefined,
        retryable: temporary
      });
      throw error;
    }
  }
};

export const sendVerificationEmail = ({ to, verificationUrl, token }) => {
  const lifetimeMinutes = Number(process.env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES || 30);
  return sendEmail({
    to,
    subject: 'Verify your StayNest AI account',
    text: `Verify your email by opening this link within ${lifetimeMinutes} minutes:\n\n${verificationUrl}\n\nIf the link is unavailable, copy and paste the URL into your browser. If you did not create this account, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033"><h1>Verify your email</h1><p>Confirm your email address to finish creating your StayNest AI account.</p><p><a href="${verificationUrl}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px">Verify email</a></p><p>This link expires in ${lifetimeMinutes} minutes.</p><p>If the button does not work, copy and paste this URL into your browser:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p><p>If you did not create this account, you can ignore this email.</p></div>`
  }, { idempotencyKey: token });
};
