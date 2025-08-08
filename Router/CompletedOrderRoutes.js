const express = require('express');
const router = express.Router();
const { completeOrder } = require('../Controller/completeOrderController');

// Create Razorpay Order
router.post('/completedorder', completeOrder);



module.exports = router;
