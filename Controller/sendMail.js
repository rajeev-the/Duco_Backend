const { Resend } = require("resend");

const resend = new Resend(
  process.env.RESEND_API_KEY
);

async function sendOtpEmail(to, otp) {

  try {

    const response =
      await resend.emails.send({

        from: "onboarding@resend.dev",

        to,

        subject: "Your OTP Code",

        html: `
          <div style="font-family:Arial">

            <h2>Your OTP</h2>

            <h1>${otp}</h1>

            <p>
              Valid for 5 minutes
            </p>

          </div>
        `,
      });

    console.log("✅ EMAIL SENT");

    console.log(response);

    return response;

  } catch (error) {

    console.error("❌ RESEND ERROR");

    console.error(error);

    throw error;
  }
}

module.exports = sendOtpEmail;