// models/Invoice.js
const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    company: {
      name: { type: String, trim: true },
      address: { type: String, trim: true },
      gstin: { type: String, trim: true },
      cin: { type: String, trim: true },
      email: { type: String, trim: true },
      pan: { type: String, trim: true },
      iec: { type: String, trim: true },
      gst: { type: String, trim: true }
    },
    invoice: {
      placeOfSupply: { type: String, trim: true },
      reverseCharge: { type: Boolean, default: false },
      copyType: { type: String, default: "Original Copy" }
    },
    terms: [{ type: String, default: [] }],
    forCompany: { type: String, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("InvoiceHelper", invoiceSchema);
