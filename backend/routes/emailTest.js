const express = require("express");
const router = express.Router();
const { sendAlertEmail } = require("../services/emailService");

// GET /api/test-email
router.get("/", async (req, res) => {
  try {
    const result = await sendAlertEmail({
      to: process.env.NOTIFY_ADMIN_EMAIL || "khawlass410@gmail.com",
      subject: "Assessment Tests – Email Delivery Test",
      html: `
        <h2>Email Test Successful 🎉</h2>
        <p>Your domain is configured correctly and email delivery works.</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      `,
    });

    res.json({ ok: true, delivery: result });
  } catch (err) {
    console.error("[TEST EMAIL ERROR]", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;


