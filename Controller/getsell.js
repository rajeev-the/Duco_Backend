const mongoose = require("mongoose");
const Order = require("../DataBase/Models/OrderModel"); // adjust path if needed

const tz = "Asia/Kolkata";

function parseDateRange(from, to) {
  if (!from || !to) {
    const err = new Error("Query params 'from' and 'to' (YYYY-MM-DD) are required.");
    err.status = 400;
    throw err;
  }
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);

  const start = new Date(Date.UTC(fy, (fm || 1) - 1, fd || 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(ty, (tm || 1) - 1, td || 1, 23, 59, 59, 999));
  return { start, end };
}

async function getSalesAnalytics(req, res) {
  try {
    const { from, to, groupBy, status, includeCancelled } = req.query;
    const { start, end } = parseDateRange(from, to);

    const statusArray = status
      ? String(status).split(",").map((s) => s.trim()).filter(Boolean)
      : null;

    const excludeCancelled = String(includeCancelled || "").toLowerCase() !== "true";

    // Match only paid orders (razorpayPaymentId not null)
    const match = {
      createdAt: { $gte: start, $lte: end },
      razorpayPaymentId: { $ne: null },
    };

    if (statusArray && statusArray.length) {
      match.status = { $in: statusArray };
    } else if (excludeCancelled) {
      match.status = { $ne: "Cancelled" };
    }

    // SUMMARY
    const summaryAgg = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: "$price" },
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
    const summary = summaryAgg[0] || { totalOrders: 0, totalAmount: 0, avgOrderValue: 0 };

    // BREAKDOWN (optional)
    let breakdown = [];
    if (groupBy === "day" || groupBy === "month") {
      const dateFormat = groupBy === "day" ? "%Y-%m-%d" : "%Y-%m";
      breakdown = await Order.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              $dateToString: { format: dateFormat, date: "$createdAt", timezone: tz },
            },
            totalAmount: { $sum: "$price" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
    }

    // ALL ORDERS (no pagination)
    const orders = await Order.find(match).sort({ createdAt: -1 }).select("-__v");

    return res.json({
      range: { from, to },
      summary,
      breakdown,
      orders,
    });
  } catch (err) {
    console.error("getSalesAnalytics error:", err);
    return res.status(err.status || 400).json({ error: err.message || "Failed to fetch sales analytics" });
  }
}

module.exports = { getSalesAnalytics };
