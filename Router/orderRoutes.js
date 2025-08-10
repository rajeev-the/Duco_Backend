// routes/orderRoutes.js
const express = require("express");
const router = express.Router();
const { getOrdersByUser ,getAllOrders  ,getOrderById} = require("../Controller/OrderController");

router.get("/order/user/:userId", getOrdersByUser);
router.get("/order", getAllOrders);
router.get("/order/:id", getOrderById);

module.exports = router;
