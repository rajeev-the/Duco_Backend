// controllers/analyticsController.js
const mongoose = require("mongoose");
const Order = require("../DataBase/Models/OrderModel"); // adjust path if needed

const TZ = "Asia/Kolkata";

/**
 * Parse YYYY-MM-DD into IST day bounds (00:00:00.000 – 23:59:59.999 IST)
 * and return UTC Date objects so Mongo comparisons are correct.
 */
function parseDateRangeIST(from, to) {
  if (!from || !to) {
    const err = new Error("Query params 'from' and 'to' (YYYY-MM-DD) are required.");
    err.status = 400;
    throw err;
  }

  // Build ISO strings with explicit +05:30 offset so Node makes the right UTC instant.
  // IST has no DST, so +05:30 is stable.
  const startStr = `${from}T00:00:00.000+05:30`;
  const endStr   = `${to}T23:59:59.999+05:30`;

  const start = new Date(startStr);
  const end   = new Date(endStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    const err = new Error("Invalid 'from' or 'to' date. Use YYYY-MM-DD.");
    err.status = 400;
    throw err;
  }

  return { start, end };
}

function parseStatusArray(raw) {
  if (!raw) return null;
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function getSalesAnalytics(req, res) {
  try {
    const { from, to, groupBy, status, includeCancelled } = req.query;
    const { start, end } = parseDateRangeIST(from, to);

    const statusArray = parseStatusArray(status);
    const excludeCancelled = String(includeCancelled || "").toLowerCase() !== "true";

    // ===== MATCH (paid only + date + status) =====
    const match = {
      createdAt: { $gte: start, $lte: end },
      // paid-only: treat null/""/missing as unpaid
      razorpayPaymentId: { $nin: [null, ""] },
    };

    if (statusArray && statusArray.length) {
      match.status = { $in: statusArray };
    } else if (excludeCancelled) {
      match.status = { $ne: "Cancelled" };
    }

    // ===== SUMMARY =====
    const summaryAgg = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          // cast price to number if stored as string anywhere
          totalAmount: { $sum: { $toDouble: "$price" } },
        },
      },
      {
        $project: {
          _id: 0,
          totalOrders: 1,
          totalAmount: 1,
          avgOrderValue: {
            $cond: [
              { $gt: ["$totalOrders", 0] },
              { $divide: ["$totalAmount", "$totalOrders"] },
              0,
            ],
          },
        },
      },
    ]);

    const summary =
      summaryAgg[0] || { totalOrders: 0, totalAmount: 0, avgOrderValue: 0 };

    // ===== BREAKDOWN (optional) =====
    let breakdown = [];
    if (groupBy === "day" || groupBy === "month") {
      const dateFormat = groupBy === "day" ? "%Y-%m-%d" : "%Y-%m";
      breakdown = await Order.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              $dateToString: {
                format: dateFormat,
                date: "$createdAt",
                timezone: TZ,
              },
            },
            totalAmount: { $sum: { $toDouble: "$price" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
    }

    // ===== ORDERS (no pagination) =====
    // Select only fields your UI needs; add/remove as needed.
    const orders = await Order.find(match)
      .sort({ createdAt: -1 })
      .select("_id createdAt user price status razorpayPaymentId")
      .lean();

    return res.json({
      range: { from, to },
      summary,
      breakdown,
      orders,
    });
  } catch (err) {
    console.error("getSalesAnalytics error:", err);
    return res
      .status(err.status || 400)
      .json({ error: err.message || "Failed to fetch sales analytics" });
  }
}

module.exports = { getSalesAnalytics };

/**
 * Recommended Mongo indexes (create once in your schema or migration):
 *
 * db.orders.createIndex({ createdAt: 1 })
 * db.orders.createIndex({ status: 1, createdAt: 1 })
 * db.orders.createIndex({ razorpayPaymentId: 1, createdAt: 1 })
 *
 * These make the match/query + sort fast for your dashboard windows.
 */
