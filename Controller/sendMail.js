// Controller/sendMail.js
const { Resend } = require("resend");
require("dotenv").config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendOtpEmail(to, otp) {
  const from = process.env.RESEND_FROM || "Duco <no-reply@ducoart.com>";

  const html = `
    <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6">
      <h2 style="margin:0 0 8px">Your OTP</h2>
      <p style="margin:0 0 12px">Use this code within <b>5 minutes</b>:</p>
      <div style="font-size:22px;font-weight:700;letter-spacing:2px">${otp}</div>
      <p style="color:#666;margin-top:16px">If you didn’t request this, you can ignore this email.</p>
    </div>
  `;

  return resend.emails.send({
    from,         // now your verified domain
    to,
    subject: "Your OTP for Login",
    html,
    text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
    // replyTo: "support@ducoart.com", // optional
    tags: [{ name: "type", value: "otp" }],    // optional but handy
  });
}

module.exports = sendOtpEmail;
