// routes/orderRoutes.js
const express = require("express");
const router = express.Router();
const { getOrdersByUser } = require("../controllers/orderController");

router.get("/order/user/:userId", getOrdersByUser);

module.exports = router;
