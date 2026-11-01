import nodemailer from 'nodemailer';

const getEmailConfig = () => {
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
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  };
};

const logEmailEvent = (level, event, details = {}) => {
  console[level](JSON.stringify({ event, ...details }));
};

const isTemporarySmtpRejection = (error) => (
  Number.isInteger(error?.responseCode)
  && error.responseCode >= 400
  && error.responseCode < 500
);

export const verifyEmailTransport = async () => {
  const transporter = nodemailer.createTransport(getEmailConfig());
  try {
    await transporter.verify();
    logEmailEvent('info', 'smtp_ready');
  } finally {
    transporter.close();
  }
};

export const sendEmail = async ({ to, subject, text, html }) => {
  const config = getEmailConfig();

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
      logEmailEvent('info', 'email_delivery_succeeded');
      return;
    } catch (error) {
      if (attempt === 0 && isTemporarySmtpRejection(error)) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
      logEmailEvent('error', 'email_delivery_failed', {
        name: typeof error?.name === 'string' ? error.name : 'UnknownError',
        code: typeof error?.code === 'string' ? error.code : undefined,
        responseCode: Number.isInteger(error?.responseCode) ? error.responseCode : undefined
      });
      throw error;
    } finally {
      transporter.close();
    }
  }
};
