// routes/chargePlanRoutes.js
const express = require("express");
const router = express.Router();
const {
  getPlan,
  updatePlan,
  getRatesForQty,
  getTotalsForQty,
} = require("../Controller/chargePlanController");

// Read the single plan (auto-creates baseline if none)
router.get("/chargeplan", getPlan);

// Update tiers (any of the three arrays). Body should contain arrays of { minqty, maxqty, cost }.
router.patch("/chargeplan", updatePlan);

// Get per-unit rates for a given qty
router.get("/chargeplan/rates", getRatesForQty);

// Get totals (per category + grand total) for a given qty
router.get("/chargeplan/totals", getTotalsForQty);

module.exports = router;
