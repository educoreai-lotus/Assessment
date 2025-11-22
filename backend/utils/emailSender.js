const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

// Fire-and-forget cancel email
function sendEmail({ to, subject, html }) {
  resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  })
  .then(result => console.log("[RESEND][SENT]", result))
  .catch(err => console.error("[RESEND][ERROR]", err));
}

// Fire-and-forget test email
function sendTestEmail() {
  resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: process.env.NOTIFY_ADMIN_EMAIL,
    subject: "Assessment SMTP Test (Resend)",
    text: "Your Resend configuration works!",
  })
  .then(result => console.log("[RESEND TEST SENT]", result))
  .catch(err => console.error("[RESEND TEST ERROR]", err));
}

module.exports = { sendEmail, sendTestEmail };
