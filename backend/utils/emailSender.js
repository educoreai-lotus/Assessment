const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail({ to, subject, html }) {
  try {
    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM,   // onboarding@resend.dev
      to,
      subject,
      html,
    });
    console.log("[EMAIL][SENT]", data);
    return true;
  } catch (err) {
    console.error("[EMAIL][ERROR]", err);
    return false;
  }
}

async function sendTestEmail() {
  try {
    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: process.env.NOTIFY_ADMIN_EMAIL,
      subject: "Test email from Resend",
      html: "<p>Resend is working correctly.</p>",
    });
    console.log("[TEST_EMAIL][SENT]", data);
  } catch (err) {
    console.error("[TEST_EMAIL][ERROR]", err);
  }
}

module.exports = { sendEmail, sendTestEmail };
