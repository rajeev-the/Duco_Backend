// routes/orderRoutes.js
const express = require("express");
const router = express.Router();
const { getOrdersByUser } = require("../Controller/OrderController");

router.get("/order/user/:userId", getOrdersByUser);

module.exports = router;
