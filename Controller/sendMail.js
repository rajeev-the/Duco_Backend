const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,   // from .env
    pass: process.env.EMAIL_PASS,   // from .env
  },
});
const sendOtpEmail = async (to, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER, // should match auth user
    to,
    subject: 'Your OTP for Login',
    html: `<p>Your OTP is: <b>${otp}</b>. It will expire in 5 minutes.</p>`,
  };
  await transporter.sendMail(mailOptions);
};

module.exports = sendOtpEmail;
