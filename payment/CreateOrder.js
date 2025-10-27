const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay order with partial payment support
const createRazorpayOrder = async (req, res) => {
  console.group('💳 BACKEND: Creating Razorpay Order');
  console.log('⏰ Request received at:', new Date().toISOString());

  try {
    console.log('🔍 STEP 1: Validating request body...');
    let { amount, half = false } = req.body;

    console.log('📥 Request body:', { amount, half });
    console.log('🔑 Razorpay credentials check:', {
      hasKeyId: !!process.env.RAZORPAY_KEY_ID,
      hasKeySecret: !!process.env.RAZORPAY_KEY_SECRET,
      keyId: process.env.RAZORPAY_KEY_ID?.substring(0, 10) + '...',
    });

    if (!amount || isNaN(amount)) {
      console.error('❌ CRITICAL: Invalid amount:', amount);
      return res
        .status(400)
        .json({ error: 'Amount is required and must be a number' });
    }

    console.log('✅ Amount validation passed');

    // Calculate final amount to charge
    const finalAmount = half ? Math.ceil(amount / 2) : amount;
    const amountInPaise = Math.round(finalAmount * 100);

    console.log('🔍 STEP 2: Calculating amounts...');
    console.log('💰 Original amount:', amount);
    console.log('💰 Final amount (INR):', finalAmount);
    console.log('💰 Amount in paise:', amountInPaise);
    console.log('🔀 Half payment:', half);

    console.log('🔍 STEP 3: Creating Razorpay order...');
    const orderData = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    };

    console.log('📤 Razorpay order data:', orderData);

    const order = await razorpay.orders.create(orderData);

    console.log('✅ Razorpay order created successfully');
    console.log('📥 Order response:', {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
    });

    const response = { orderId: order.id, amount: order.amount, half };
    console.log('📤 Sending response to frontend:', response);
    console.groupEnd();

    res.json(response);
  } catch (err) {
    console.group('❌ BACKEND: Razorpay Order Creation Failed');
    console.error('❌ Error details:', {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      response: err.response?.data,
      stack: err.stack,
    });
    console.error('🔍 Request details:', {
      body: req.body,
      headers: req.headers,
      method: req.method,
      url: req.url,
    });
    console.groupEnd();

    res.status(500).json({
      error: 'Razorpay order creation failed',
      details: err.message,
    });
  }
};

// Verify Razorpay payment signature
const verifyPayment = async (req, res) => {
  console.group('🔐 BACKEND: Verifying Razorpay Payment');
  console.log('⏰ Verification request received at:', new Date().toISOString());

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    console.log('🔍 STEP 1: Validating verification data...');
    console.log('📥 Verification request:', {
      razorpay_order_id,
      razorpay_payment_id,
      has_signature: !!razorpay_signature,
    });

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error('❌ CRITICAL: Missing verification data');
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification data',
      });
    }

    console.log('✅ Verification data validation passed');

    console.log('🔍 STEP 2: Generating expected signature...');
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    console.log('📝 Signature body:', body);

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    console.log('🔐 Expected signature:', expectedSignature);
    console.log('🔐 Received signature:', razorpay_signature);

    if (expectedSignature !== razorpay_signature) {
      console.error('❌ CRITICAL: Signature mismatch');
      console.error('🔍 Signature comparison:', {
        expected: expectedSignature,
        received: razorpay_signature,
        match: expectedSignature === razorpay_signature,
      });
      return res
        .status(400)
        .json({ success: false, message: 'Signature mismatch' });
    }

    console.log('✅ Payment signature verification successful');
    console.log('📤 Sending success response to frontend');
    console.groupEnd();

    res.json({ success: true, razorpay_payment_id });
  } catch (err) {
    console.group('❌ BACKEND: Payment Verification Failed');
    console.error('❌ Error details:', {
      message: err.message,
      stack: err.stack,
    });
    console.error('🔍 Request details:', {
      body: req.body,
      headers: req.headers,
    });
    console.groupEnd();

    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      details: err.message,
    });
  }
};

module.exports = {
  createRazorpayOrder,
  verifyPayment,
};
