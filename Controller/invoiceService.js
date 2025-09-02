const Invoice = require("../DataBase/Models/InvoiceModule");

// ------- Helpers -------
const safeNum = (v, fb = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};

const computeTotals = (doc = {}) => {
  const items = Array.isArray(doc.items) ? doc.items : [];
  const charges = doc.charges || {};
  const tax = doc.tax || {};

  const subtotal = items.reduce((sum, i) => sum + safeNum(i.price) * safeNum(i.qty), 0);
  const chargesTotal = ["pf", "printing"].reduce((s, k) => s + safeNum(charges[k]), 0);
  const taxableValue = subtotal + chargesTotal;

  const cgstRate = safeNum(tax.cgstRate);
  const sgstRate = safeNum(tax.sgstRate);
  const cgstAmt = (taxableValue * cgstRate) / 100;
  const sgstAmt = (taxableValue * sgstRate) / 100;

  const grandTotal = taxableValue + cgstAmt + sgstAmt;

  return {
    subtotal: +subtotal.toFixed(2),
    chargesTotal: +chargesTotal.toFixed(2),
    taxableValue: +taxableValue.toFixed(2),
    cgstAmt: +cgstAmt.toFixed(2),
    sgstAmt: +sgstAmt.toFixed(2),
    grandTotal: +grandTotal.toFixed(2),
  };
};

// ------- Functions -------

// Create Invoice (data passed directly)
async function createInvoice(data) {
  if (!data?.company?.name || !data?.invoice?.number || !Array.isArray(data?.items)) {
    throw new Error("Missing required fields: company.name, invoice.number, items[]");
  }

  const invoice = await Invoice.create(data);
  const totals = computeTotals(invoice.toObject());
  return { invoice, totals };
}

// Get by ID
async function getInvoiceById(id) {
  const invoice = await Invoice.findById(id);
  if (!invoice) throw new Error("Invoice not found");

  const totals = computeTotals(invoice.toObject());
  return { invoice, totals };
}

// Get list with filters
async function getInvoices(filters = {}) {
  const {
    number,
    gstin,
    from,
    to,
    page = 1,
    limit = 20,
    sort = "-createdAt",
  } = filters;

  const q = {};
  if (number) q["invoice.number"] = String(number).trim();
  if (gstin) q.$or = [{ "billTo.gstin": gstin }, { "shipTo.gstin": gstin }];
  if (from || to) {
    q["invoice.date"] = {};
    if (from) q["invoice.date"].$gte = from;
    if (to) q["invoice.date"].$lte = to;
  }

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));

  const [rows, total] = await Promise.all([
    Invoice.find(q).sort(sort).skip(skip).limit(Math.max(1, parseInt(limit, 10))),
    Invoice.countDocuments(q),
  ]);

  const data = rows.map((inv) => {
    const obj = inv.toObject();
    return { invoice: obj, totals: computeTotals(obj) };
  });

  return { total, page: Number(page), limit: Number(limit), data };
}

// Get by invoice number
async function getInvoiceByNumber(number) {
  const invoice = await Invoice.findOne({ "invoice.number": number });
  if (!invoice) throw new Error("Invoice not found");

  const totals = computeTotals(invoice.toObject());
  return { invoice, totals };
}

module.exports = {
  createInvoice,
  getInvoiceById,
  getInvoices,
  getInvoiceByNumber,
};
