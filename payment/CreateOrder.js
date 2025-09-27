const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay order with partial payment support
const createRazorpayOrder = async (req, res) => {
  try {
    let { amount, half = false } = req.body;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: "Amount is required and must be a number" });
    }

    // Calculate final amount to charge
    const finalAmount = half ? Math.ceil(amount / 2) : amount;

    const order = await razorpay.orders.create({
      amount: Math.round(finalAmount * 100), // INR → paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    });

    res.json({ orderId: order.id, amount: order.amount, half });
  } catch (err) {
    console.error("Razorpay order creation failed:", err);
    res.status(500).json({ error: "Razorpay order creation failed" });
  }
};

// Verify Razorpay payment signature
const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ success: false, message: "Signature mismatch" });
  }

  // TODO: Update order in DB here: update amountPaid, amountDue, paymentStatus etc.
  // Example:
  // const orderIdInDb = ...;
  // const paymentAmount = ...; // from Razorpay order or from your own logic
  // Update order document with payment progress

  res.json({ success: true, razorpay_payment_id });
};


module.exports = {
  createRazorpayOrder,
  verifyPayment,
};
