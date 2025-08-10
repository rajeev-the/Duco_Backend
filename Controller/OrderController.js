// controllers/orderController.js
const mongoose = require("mongoose");
const Order = require("../DataBase/Models/OrderModel"); // adjust path if needed

exports.getOrdersByUser = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?._id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid or missing userId" });
    }

    const sort = req.query.sort || "-createdAt"; // default: newest first

    const orders = await Order.find({ user: userId }).sort(sort);

    return res.json(orders);
  } catch (err) {
    console.error("getOrdersByUser error:", err);
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
};



// Get all orders sorted by newest first
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }); // -1 means descending
    res.json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};