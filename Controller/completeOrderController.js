const Razorpay = require('razorpay');
const Order = require("../DataBase/Models/OrderModel");
const placeQlinkOrder = require("./placeQlinkOrder");

// ✅ Use the correct env var names
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,  // <— was RAZORPAY_SECRET
});

const completeOrder = async (req, res) => {
  const { paymentId, orderData } = req.body;

  let payment = null;
  let qlink = null;
  let order = null;

  try {
    // 1) Verify payment
    payment = await razorpay.payments.fetch(paymentId);
    if (!payment || payment.status !== 'captured') {
      throw new Error(`Payment not captured (status: ${payment?.status || 'unknown'})`);
    }

    // 2) Place Qikink order
    qlink = await placeQlinkOrder(orderData);
    if (!qlink?.orderId) throw new Error("Qlink order failed");

    // 3) Persist order
    order = await Order.create({
      products: orderData.items,       // or map to lean items if your schema is strict
      price: orderData.totalPay,
      address: orderData.address,
      user: orderData.user._id,
      razorpayPaymentId: paymentId,
      qlinkOrderId: qlink.orderId,
      status: 'paid',
    });

    return res.status(200).json({ success: true, order });

  } catch (err) {
    // 4) Rollback best-effort
    if (qlink?.orderId) {
      try {
        // await cancelQlinkOrder(qlink.orderId); // optional if you implement this
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

    console.error('💥 completeOrder failed:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { completeOrder };
