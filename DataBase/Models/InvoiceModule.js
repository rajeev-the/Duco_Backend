const mongoose = require("mongoose");

const { Schema } = mongoose;

// Company Schema
const CompanySchema = new Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  gstin: { type: String, required: true },
  cin: { type: String },
  email: { type: String },
  pan: { type: String },
  iec: { type: String },
}, { _id: false });

// Invoice Info Schema
const InvoiceInfoSchema = new Schema({
  number: { type: String, required: true },
  date: { type: String, required: true },   // or Date if you want to store as Date
  placeOfSupply: { type: String },
  reverseCharge: { type: Boolean, default: false },
  copyType: { type: String, default: "Original Copy" },
}, { _id: false });

// Party Schema (BillTo / ShipTo)
const PartySchema = new Schema({
  name: { type: String, required: true },
  address: { type: String },
  gstin: { type: String },

}, { _id: false });

// Item Schema
const ItemSchema = new Schema({
  description: { type: String, required: true },
  barcode: { type: String },
  hsn: { type: String },
  qty: { type: Number, required: true },
  unit: { type: String, default: "Pcs." },
  price: { type: Number, required: true },
}, { _id: false });

// Charges Schema
const ChargesSchema = new Schema({
  pf: { type: Number, default: 0 },
  printing: { type: Number, default: 0 },
}, { _id: false });

// Tax Schema
const TaxSchema = new Schema({
  cgstRate: { type: Number, default: 0 },
  sgstRate: { type: Number, default: 0 },
}, { _id: false });

// Main Invoice Schema
const InvoiceSchema = new Schema({
  company: { type: CompanySchema, required: true },
  invoice: { type: InvoiceInfoSchema, required: true },
  billTo: { type: PartySchema, required: true },
  items: { type: [ItemSchema], required: true },
  charges: { type: ChargesSchema, default: {} },
  tax: { type: TaxSchema, default: {} },
  terms: [{ type: String }],
  forCompany: { type: String, required: true },
  order:{
     type:mongoose.Schema.Types.ObjectId,ref:"Order"
  }
}, { timestamps: true });

InvoiceSchema.index({ order: 1 }, { unique: true, sparse: true });


module.exports = mongoose.model("Invoice", InvoiceSchema);
