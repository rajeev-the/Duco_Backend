const mongoose = require("mongoose");
const Order = require("../DataBase/Models/OrderModel");
const product = require("../DataBase/Models/ProductsModel"); // ✅ needed to fetch product details

// ---------------- CREATE ORDER ----------------
exports.createOrder = async (req, res) => {
  try {
    const { user, items, amount, paymentStatus, paymentmode } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items provided" });
    }

    // Enrich each item with product details
    const enrichedItems = await Promise.all(
      items.map(async (it) => {
        const product = await Product.findById(it.productId);

        if (!product) {
          throw new Error(`Product not found: ${it.productId}`);
        }

        return {
          product: product._id,
          name: product.name,                   // ✅ save product name
          image: product.image_url?.[0] || "",  // ✅ save thumbnail
          qty: it.qty,
          size: it.size,
          color: it.color,
          price: it.price ?? product.price,

          // ✅ carry custom design data if provided
          design: it.design || {},
        };
      })
    );

    const order = await Order.create({
      user,
      items: enrichedItems,
      amount,
      status: "Pending",
      paymentStatus: paymentStatus || "Paid",
      paymentmode: paymentmode || "Prepaid",
    });

    res.status(201).json(order);
  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
};

// ---------------- GET ORDERS BY USER ----------------
exports.getOrdersByUser = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?._id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid or missing userId" });
    }

    const sort = req.query.sort || "-createdAt";
    const orders = await Order.find({ user: userId }).sort(sort);

    return res.json(orders);
  } catch (err) {
    console.error("getOrdersByUser error:", err);
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
};

// ---------------- GET ALL ORDERS ----------------
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};

// ---------------- GET ORDER BY ID ----------------
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
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

// ---------------- UPDATE ORDER STATUS ----------------
exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status, qikinkOrderId, paymentmode } = req.body || {};

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    const patch = {};
    const validStatuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

    if (typeof status !== "undefined") {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }
      patch.status = status;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "qikinkOrderId")) {
      const normalized = (qikinkOrderId ?? "").toString().trim();
      patch.qikinkOrderId = normalized.length ? normalized : null;
    }

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
