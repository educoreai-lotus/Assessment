const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendEmail({ to, subject, html }) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    console.log("[EMAIL][SENT]", { to, subject });
    return true;
  } catch (err) {
    console.error("[EMAIL][ERROR]", err);
    return false;
  }
}

async function sendTestEmail() {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: process.env.NOTIFY_ADMIN_EMAIL,
    subject: "Assessment System SMTP Test",
    text: "Your SMTP setup is working. This is a test email.",
  });
}

module.exports = { sendEmail, sendTestEmail };


