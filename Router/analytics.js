// Router/analytics.js
const express = require("express");
const router = express.Router();

const { getSalesAnalytics } = require("../Controller/getsell"); // adjust if your folder is named differently

// GET /api/analytics/sales?from=YYYY-MM-DD&to=YYYY-MM-DD[&groupBy=day|month][&status=Delivered,Shipped][&includeCancelled=true]
router.get("/sales", getSalesAnalytics);

module.exports = router;
