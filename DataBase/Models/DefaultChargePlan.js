// models/DefaultChargePlan.js
const mongoose = require("mongoose");

const RangeSchema = new mongoose.Schema({
  minqty: { type: Number, required: true },
  maxqty: { type: Number, required: true },
  cost: { type: Number, required: true }, // cost per unit
});

const GstRangeSchema = new mongoose.Schema({
  minqty: { type: Number, required: true },
  maxqty: { type: Number, required: true },
  percent: { type: Number, required: true }, // ✅ percent instead of cost
});

const ChargePlanSchema = new mongoose.Schema({
  pakageingandforwarding: [RangeSchema],
  printingcost: [RangeSchema],
  gst: [GstRangeSchema], // ✅ gst is now a percent rate
});

module.exports = mongoose.model("ChargePlan", ChargePlanSchema);
