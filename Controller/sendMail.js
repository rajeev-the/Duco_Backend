// Controller/sendMail.js

const nodemailer = require("nodemailer");
require("dotenv").config();

async function sendOtpEmail(to, otp) {

  try {

    // Create transporter
    const transporter = nodemailer.createTransport({

      host: process.env.EMAIL_HOST,

      port: process.env.EMAIL_PORT,

      secure: process.env.EMAIL_SECURE === "true",

      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },

    });

    // HTML Template
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.6">

        <h2 style="margin-bottom:10px">
          Your OTP
        </h2>

        <p>
          Use this OTP within <b>5 minutes</b>:
        </p>

        <div style="
          font-size:28px;
          font-weight:bold;
          letter-spacing:4px;
          margin:20px 0;
          color:#2563eb;
        ">
          ${otp}
        </div>

        <p style="color:#666">
          If you didn’t request this, you can ignore this email.
        </p>

      </div>
    `;

    // Send Email
    const info = await transporter.sendMail({

      from: `"Duco" <${process.env.EMAIL_FROM}>`,

      to,

      subject: "Your OTP for Login",

      html,

      text: `Your OTP is ${otp}. It will expire in 5 minutes.`,

    });

    console.log("✅ Email Sent:", info.messageId);

    return info;

  } catch (error) {

    console.error("❌ Email Error:", error);

    throw new Error("Failed to send OTP email");
  }
}

module.exports = sendOtpEmail;