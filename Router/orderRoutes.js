// routes/orderRoutes.js
const express = require("express");
const router = express.Router();
const { getOrdersByUser ,getAllOrders } = require("../Controller/OrderController");

router.get("/order/user/:userId", getOrdersByUser);
router.get("/order", getAllOrders);

module.exports = router;
