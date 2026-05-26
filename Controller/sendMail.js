const nodemailer = require("nodemailer");
require("dotenv").config();

async function sendOtpEmail(to, otp) {

  try {

    console.log("EMAIL_USER =>", process.env.EMAIL_USER);

    console.log(
      "EMAIL_PASS EXISTS =>",
      !!process.env.EMAIL_PASS
    );

    const transporter = nodemailer.createTransport({

      host: "rajeevranjan9560807144@gmail.com",

      port: 587,

      secure: false,

      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },

      tls: {
        rejectUnauthorized: false,
      },

      connectionTimeout: 10000,

      greetingTimeout: 10000,

      socketTimeout: 10000,

    });

    await transporter.verify();

    console.log("✅ SMTP READY");

    const info = await transporter.sendMail({

      from: `"Duco" <${process.env.EMAIL_FROM}>`,

      to,

      subject: "Your OTP for Login",

      html: `
        <div>
          <h2>Your OTP</h2>
          <h1>${otp}</h1>
        </div>
      `,

      text: `OTP: ${otp}`,
    });

    console.log("✅ Email Sent:", info.messageId);

    return info;

  } catch (error) {

    console.error("❌ Email Error:", error);

    throw new Error(error.message);
  }
}

module.exports = sendOtpEmail;