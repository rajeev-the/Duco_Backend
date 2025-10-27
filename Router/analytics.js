// Router/analytics.js
const express = require("express");
const router = express.Router();

// ✅ Point this to the controller file you actually placed.
// If you kept your old name, use "../Controller/getsell"
const { getSalesAnalytics } = require("../Controller/analyticsController"); 
// const { getSalesAnalytics } = require("../Controller/getsell"); // <- use this line instead if your file is getsell.js

/**
 * GET /api/analytics/sales
 * Query:
 *  - from=YYYY-MM-DD (required)
 *  - to=YYYY-MM-DD   (required)
 *  - groupBy=day|month|none (optional; if omitted, controller simply skips breakdown)
 *  - status=Delivered,Shipped,... (optional CSV)
 *  - includeCancelled=true (optional)
 *
 * Response shape:
 *  {
 *    range: { from, to },
 *    summary: { totalOrders, totalAmount, avgOrderValue },
 *    breakdown: [{ _id: "YYYY-MM" | "YYYY-MM-DD", totalAmount, count }, ...],
 *    orders: [ { _id, createdAt, user, price, status, razorpayPaymentId }, ... ]
 *  }
 */
router.get("/sales", getSalesAnalytics);

module.exports = router;
