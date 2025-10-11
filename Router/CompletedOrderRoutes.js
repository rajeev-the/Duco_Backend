const express = require('express');
const router = express.Router();
const {
  completeOrder,
  getOrderById,
  getAllOrders,
  syncOrderWithPrintrove,
} = require('../Controller/completeOrderController');

// Complete Order
router.post('/completedorder', completeOrder);

// Get Order by ID
router.get('/order/:id', getOrderById);

// Get All Orders
router.get('/orders', getAllOrders);

// Sync Order with Printrove
router.post('/sync-printrove/:orderId', syncOrderWithPrintrove);

module.exports = router;
