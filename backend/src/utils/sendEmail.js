import nodemailer from 'nodemailer';

export const sendEmail = async ({ to, subject, text, html }) => {
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

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
    html
  };
  await transporter.sendMail(mailOptions);
};
