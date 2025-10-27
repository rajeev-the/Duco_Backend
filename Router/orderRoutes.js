// routes/orderRoutes.js
const express = require("express");
const router = express.Router();
const { getOrdersByUser ,getAllOrders  ,getOrderById ,updateOrderStatus} = require("../Controller/OrderController");

router.get("/order/user/:userId", getOrdersByUser);
router.get("/order", getAllOrders);
router.get("/order/:id", getOrderById);
router.put("/order/update/:id",updateOrderStatus)

module.exports = router;
