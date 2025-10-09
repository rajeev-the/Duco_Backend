// routes/chargePlanRoutes.js
const express = require("express");
const router = express.Router();
const {
  getPlan,
  updatePlan,
  getRatesForQty,
  getTotalsForQty,
} = require("../Controller/chargePlanController");

// ✅ Read the current plan (auto-creates baseline if none exists)
router.get("/chargeplan", getPlan);

// ✅ Update tiers for P&F, printing, and GST
router.patch("/chargeplan", updatePlan);

// ✅ Get per-unit rates for a given qty (legacy endpoint)
router.post("/chargeplan/rates", getRatesForQty);

// ✅ Get full totals (P&F + Printing + GST + Grand Total)
router.post("/chargeplan/totals", getTotalsForQty);

module.exports = router;
