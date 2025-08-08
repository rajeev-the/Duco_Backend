const Razorpay = require('razorpay');
const Order = require("../DataBase/Models/OrderModel");
const placeQlinkOrder= require("./placeQlinkOrder")

// Ensure you have Razorpay instance configured
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

const completeOrder = async (req, res) => {
  const { paymentId, orderData } = req.body;

  let payment = null;
  let qlink = null;
  let order = null;

  try {
    // 1. Confirm Payment Status from Razorpay
    payment = await razorpay.payments.fetch(paymentId);
    if (payment.status !== 'captured') {
      throw new Error("Payment not captured");
    }

    // 2. Place Qlink Order (external API)
    qlink = await placeQlinkOrder(orderData); // ← ensure this function is defined elsewhere
    if (!qlink?.orderId) throw new Error("Qlink order failed");

    // 3. Save Order to MongoDB
    order = await Order.create({
      ...orderData,
      razorpayPaymentId: paymentId,
      qlinkOrderId: qlink.orderId,
    });

    return res.status(200).json({ success: true, order });

  } catch (err) {
    // 4. Rollback logic
    if (qlink?.orderId) {
      try {
        await cancelQlinkOrder(qlink.orderId);
      } catch {}
    }

    if (payment?.id) {
      try {
        await razorpay.payments.refund(payment.id);
      } catch {}
    }

    if (order?._id) {
      try {
        await Order.findByIdAndDelete(order._id);
      } catch {}
    }

    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  completeOrder
};
