// controllers/orderController.js
const mongoose = require("mongoose");
const Order = require("../DataBase/Models/OrderModel");

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

// Get single order by ID
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find order by ID
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);
  } catch (err) {
    console.error("Error fetching order:", err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
};

exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status, qikinkOrderId, paymentmode } = req.body || {};

  try {
    // ✅ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    // ✅ Build a safe patch
    const patch = {};
    const validStatuses = [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ];

    // status (optional)
    if (typeof status !== "undefined") {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }
      patch.status = status;
    }
    // qikinkOrderId (optional) — normalize "" -> null
    if (Object.prototype.hasOwnProperty.call(req.body, "qikinkOrderId")) {
      const normalized = (qikinkOrderId ?? "").toString().trim();
      patch.qikinkOrderId = normalized.length ? normalized : null;
    }

    // paymentmode (optional)
    if (typeof paymentmode !== "undefined") {
      const validModes = ["COD", "Prepaid"];
      if (!validModes.includes(paymentmode)) {
        return res.status(400).json({ error: "Invalid payment mode" });
      }
      patch.paymentmode = paymentmode;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    // ✅ Update
    const order = await Order.findByIdAndUpdate(
      id,
      { $set: patch },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({
      message: "Order updated successfully",
      updatedFields: Object.keys(patch),
      order,
    });
  } catch (err) {
    console.error("Error updating order:", err);
    res.status(500).json({ error: "Failed to update order" });
  }
};
