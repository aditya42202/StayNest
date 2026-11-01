import nodemailer from 'nodemailer';

const requestTimeoutMs = 10_000;

const getEmailProvider = () => {
  if (process.env.RESEND_API_KEY) {
    if (!process.env.EMAIL_FROM) {
      throw new Error('EMAIL_FROM must be configured with a verified sender when RESEND_API_KEY is set');
    }
    return 'resend';
  }
  return 'smtp';
};

const getSmtpConfig = () => {
  const port = Number(process.env.EMAIL_PORT || 587);
  if (
    !process.env.EMAIL_HOST
    || !process.env.EMAIL_USER
    || !process.env.EMAIL_PASS
    || !Number.isInteger(port)
    || port < 1
    || port > 65535
  ) {
    throw new Error('Email service is not configured');
  }

  return {
    host: process.env.EMAIL_HOST,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    connectionTimeout: requestTimeoutMs,
    greetingTimeout: requestTimeoutMs,
    socketTimeout: 20_000,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  };
};

export const isEmailServiceConfigured = () => {
  if (process.env.RESEND_API_KEY) {
    return Boolean(process.env.EMAIL_FROM);
  }
  const port = Number(process.env.EMAIL_PORT || 587);
  return Boolean(
    process.env.EMAIL_HOST
    && process.env.EMAIL_USER
    && process.env.EMAIL_PASS
    && Number.isInteger(port)
    && port > 0
    && port <= 65535
  );
};

const logEmailEvent = (level, event, details = {}) => {
  console[level](JSON.stringify({ event, ...details }));
};

const isTemporarySmtpRejection = (error) => (
  Number.isInteger(error?.responseCode)
  && error.responseCode >= 400
  && error.responseCode < 500
);

const resendRequest = async (path, options = {}) => {
  const response = await fetch(`https://api.resend.com${path}`, {
    ...options,
    signal: AbortSignal.timeout(requestTimeoutMs),
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
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

const sendWithResend = async ({ to, subject, text, html }) => {
  await resendRequest('/emails', {
    method: 'POST',
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject,
      text,
      html
    })
  });
};

const sendWithSmtp = async ({ to, subject, text, html }) => {
  const config = getSmtpConfig();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const transporter = nodemailer.createTransport(config);
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to,
        subject,
        text,
        html
      });
      return;
    } catch (error) {
      if (attempt === 0 && isTemporarySmtpRejection(error)) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
      throw error;
    } finally {
      transporter.close();
    }
  }
};

export const verifyEmailTransport = async () => {
  if (!isEmailServiceConfigured()) {
    throw new Error('Email service is not configured');
  }

  if (getEmailProvider() === 'resend') {
    await resendRequest('/domains');
    logEmailEvent('info', 'email_provider_ready', { provider: 'resend' });
    return;
  }

  const transporter = nodemailer.createTransport(getSmtpConfig());
  try {
    await transporter.verify();
    logEmailEvent('info', 'email_provider_ready', { provider: 'smtp' });
  } finally {
    transporter.close();
  }
};

export const sendEmail = async (message) => {
  if (!isEmailServiceConfigured()) {
    throw new Error('Email service is not configured');
  }

  const provider = getEmailProvider();
  try {
    if (provider === 'resend') {
      await sendWithResend(message);
    } else {
      await sendWithSmtp(message);
    }
    logEmailEvent('info', 'email_delivery_succeeded', { provider });
  } catch (error) {
    logEmailEvent('error', 'email_delivery_failed', {
      provider,
      name: typeof error?.name === 'string' ? error.name : 'UnknownError',
      code: typeof error?.code === 'string' ? error.code : undefined,
      responseCode: Number.isInteger(error?.responseCode) ? error.responseCode : undefined
    });
    throw error;
  }
};
