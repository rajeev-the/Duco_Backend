const Razorpay = require('razorpay');
const Order = require('../DataBase/Models/OrderModel');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const completeOrder = async (req, res) => {
  const { paymentId, orderData, paymentmode } = req.body;

  let payment = null;
  let order = null;

  try {
    // ✅ Case 1: Bank Transfer (skip Razorpay verification)
    if (paymentmode === "netbanking") {
      order = await Order.create({
        products: orderData.items,
        price: orderData.totalPay,
        address: orderData.address,
        user: orderData.user._id,
        razorpayPaymentId: paymentId || null,
        status: "Pending",
        paymentmode: "Bank Transfer",
      });

      return res.status(200).json({ success: true, order });
    }

    // ✅ Case 2: Razorpay payment verification
    if(paymentmode === "online") {
    payment = await razorpay.payments.fetch(paymentId);
    if (!payment || payment.status !== "captured") {
      throw new Error(`Payment not captured (status: ${payment?.status || "unknown"})`);
    }

    order = await Order.create({
      products: orderData.items,
      price: orderData.totalPay,
      address: orderData.address,
      user: orderData.user._id,
      razorpayPaymentId: paymentId,
      status: "Pending",
      paymentmode: "Razorpay",
    });

    return res.status(200).json({ success: true, order });
  }


  } catch (err) {
    // Rollback best-effort
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

    console.error("💥 completeOrder failed:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { completeOrder };
