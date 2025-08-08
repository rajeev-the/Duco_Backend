const express = require('express');
const router = express.Router();
const { createRazorpayOrder, verifyPayment } = require('../payment/CreateOrder');

// Create Razorpay Order
router.post('/create-order', createRazorpayOrder);

// Verify Razorpay Payment
router.post('/verify', verifyPayment);

module.exports = router;
