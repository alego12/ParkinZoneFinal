import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || '';
  if (!from) throw new Error('SMTP_FROM or SMTP_USER is required');
  return transporter.sendMail({ from, to, subject, text, html });
}
