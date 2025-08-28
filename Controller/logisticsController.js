// controllers/logisticsController.js
const mongoose = require("mongoose");
const Logistic = require("../models/Logistic"); // <- adjust path if different

// Small helper to validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Create Logistic
 * Body: { orderId, trackingNumber?, carrier?, estimatedDelivery?, shippingAddress, img?, note? }
 */
exports.createLogistic = async (req, res) => {
  try {
    const {
      orderId,
      trackingNumber,
      carrier,
      estimatedDelivery,
      shippingAddress,
      img = [],
      note,
    } = req.body;

    if (!orderId || !isValidObjectId(orderId)) {
      return res.status(400).json({ error: "Valid orderId is required" });
    }
    if (!shippingAddress) {
      return res.status(400).json({ error: "shippingAddress is required" });
    }

    // Normalize img to array of { URL }
    const imgArr = Array.isArray(img)
      ? img.map((i) => ({ URL: typeof i === "string" ? i : i?.URL }))
      : [];

    const logistic = await Logistic.create({
      orderId,
      trackingNumber,
      carrier,
      estimatedDelivery,
      shippingAddress,
      img: imgArr,
      note,
    });

    // Optional: populate order basic fields
    await logistic.populate({ path: "orderId", select: "_id status total" });

    return res.status(201).json(logistic);
  } catch (err) {
    // handle unique index error for trackingNumber
    if (err?.code === 11000 && err?.keyPattern?.trackingNumber) {
      return res
        .status(409)
        .json({ error: "trackingNumber already exists" });
    }
    console.error("createLogistic error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Update Logistic by _id
 * Params: :id
 * Body: any of { trackingNumber, carrier, estimatedDelivery, shippingAddress, img, note }
 */
exports.updateLogistic = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid logistic id" });
    }

    const payload = { ...req.body, updatedAt: new Date() };

    // If img provided, normalize to [{ URL }]
    if (payload.img) {
      payload.img = Array.isArray(payload.img)
        ? payload.img.map((i) => ({ URL: typeof i === "string" ? i : i?.URL }))
        : [];
    }

    const updated = await Logistic.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    }).populate({ path: "orderId", select: "_id status total" });

    if (!updated) {
      return res.status(404).json({ error: "Logistic not found" });
    }

    return res.json(updated);
  } catch (err) {
    if (err?.code === 11000 && err?.keyPattern?.trackingNumber) {
      return res
        .status(409)
        .json({ error: "trackingNumber already exists" });
    }
    console.error("updateLogistic error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Get Logistics by Order ID
 * Params: :orderId
 * Query: ?populate=true (optional)
 */
exports.getLogisticsByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { populate } = req.query;

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({ error: "Invalid orderId" });
    }

    let query = Logistic.find({ orderId }).sort({ createdAt: -1 });

    if (String(populate).toLowerCase() === "true") {
      query = query.populate({ path: "orderId", select: "_id status total" });
    }

    const items = await query.exec();
    return res.json(items);
  } catch (err) {
    console.error("getLogisticsByOrder error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * (Optional) Get single logistic by _id
 */
exports.getLogisticById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const item = await Logistic.findById(id).populate({
      path: "orderId",
      select: "_id status total",
    });
    if (!item) return res.status(404).json({ error: "Not found" });
    return res.json(item);
  } catch (err) {
    console.error("getLogisticById error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
