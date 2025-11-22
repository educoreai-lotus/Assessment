const express = require("express");
const router = express.Router();
const { sendTestEmail } = require("../utils/emailSender");

router.get("/test-email", async (req, res) => {
  try {
    await sendTestEmail();
    res.json({ ok: true, message: "Test email sent successfully" });
  } catch (err) {
    console.error("[TEST EMAIL ERROR]", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;


