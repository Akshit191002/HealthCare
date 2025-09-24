import * as nodemailer from 'nodemailer';

export async function sendOtpEmail(to: string, otp: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.SMTP_USER,
    to,
    subject: 'Your OTP Code',
    text: `Your OTP code is: ${otp}. It will expire in 5 minutes.`,
  };

  await transporter.sendMail(mailOptions);
}
