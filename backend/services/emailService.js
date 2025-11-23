const { Resend } = require('resend');

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const notifyAdminEmail = process.env.NOTIFY_ADMIN_EMAIL || null;

if (!resendApiKey) {
  // eslint-disable-next-line no-console
  console.warn('[EmailService][WARN] RESEND_API_KEY is not set; using mock sender for CI/tests.');
}
if (!emailFrom) {
  // eslint-disable-next-line no-console
  console.warn('[EmailService][WARN] EMAIL_FROM is not set; using fallback onboarding@resend.dev.');
}
if (!notifyAdminEmail) {
  // eslint-disable-next-line no-console
  console.warn('[EmailService][WARN] NOTIFY_ADMIN_EMAIL is not set; admin alerts will have no recipient.');
}

let resend = null;
if (resendApiKey) {
  resend = new Resend(resendApiKey);
} else {
  // Safe mock for CI/tests where API key is absent
  resend = {
    emails: {
      // Keep signature compatible with Resend.emails.send
      send: async () => {
        // eslint-disable-next-line no-console
        console.warn('[EmailService][Mock] Email skipped because RESEND_API_KEY is not set.');
        return { ok: false, skipped: true };
      },
    },
  };
}

async function sendAlertEmail({ to, subject, html }) {
  try {
    const response = await resend.emails.send({
      from: emailFrom,
      to,
      subject,
      html,
    });
    // eslint-disable-next-line no-console
    console.log('[EmailService] Email sent successfully', { id: response?.id || null });
    return { ok: true, response };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[EmailService] Email send failed', { message: err?.message, code: err?.code });
    return { ok: false, error: err };
  }
}

module.exports = { sendAlertEmail };


// One-time direct-run test trigger (executes only when this file is run directly)
if (require.main === module) {
  (async () => {
    try {
      const result = await sendAlertEmail({
        to: "khawlass410@gmail.com",
        subject: "EduCore Email Test — It Works 🎉",
        html: "<h2>Success!</h2><p>If you received this email, Resend is fully configured and working.</p>"
      });
      // eslint-disable-next-line no-console
      console.log("[EmailService][SmokeTest] result:", result);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[EmailService][SmokeTest][ERROR]", e?.message || e);
    }
  })();
}

