const Invoice = require("../DataBase/Models/InvoiceModule");


const mongoose = require("mongoose");


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
    totalQty: items.reduce((q, i) => q + safeNum(i.qty), 0),
  };
};

// Export if you want to reuse in other places
module.exports.computeTotals = computeTotals;

// ------- Functions -------

// Create Invoice (data passed directly)
async function createInvoice(data) {
  // Required by your schema
  if (!data?.company?.name) throw new Error("company.name is required");
  if (!data?.company?.address) throw new Error("company.address is required");
  if (!data?.company?.gstin) throw new Error("company.gstin is required");
  if (!data?.invoice?.number) throw new Error("invoice.number is required");
  if (!data?.invoice?.date) throw new Error("invoice.date is required");
  if (!data?.billTo?.name) throw new Error("billTo.name is required");
  if (!Array.isArray(data?.items) || data.items.length === 0) throw new Error("items[] is required");
  if (!data?.forCompany) throw new Error("forCompany is required");

  const invoice = await Invoice.create(data);
  const obj = invoice.toObject();
  const totals = computeTotals(obj);
  return { invoice, totals };
}

// async function getInvoiceByOrderId(orderId) {
//   // findOne will return a single document, not an array
//   const invoice = await Invoice.findOne({ orderId }).sort({ createdAt: -1 });

//   if (!invoice) throw new Error("Invoice not found for this order");

//   const totals = computeTotals(invoice.toObject());
//   return { invoice, totals };
// }
async function getInvoiceByOrderId(orderId) {
  // Try to coerce to ObjectId if valid
  const asObjectId = mongoose.isValidObjectId(orderId)
    ? new mongoose.Types.ObjectId(orderId)
    : null;

  // Try both patterns:
  //  1) { order: ObjectId }       -> typical Mongoose ref to Order
  //  2) { orderId: <string|id> }  -> some apps store the order id as a string
  const query = {
    $or: [
      ...(asObjectId ? [{ order: asObjectId }] : []),
      { orderId: orderId }, // keep as string for exact match
    ],
  };

  // Get the latest invoice for that order
  const invoiceDoc = await Invoice.findOne(query).sort({ createdAt: -1 });

  if (!invoiceDoc) {
    throw new Error("Invoice not found for this order");
  }

  // If computeTotals expects a POJO, use .toObject(); if it’s already OK with a doc, you can pass invoiceDoc directly
  const invoiceObj = invoiceDoc.toObject ? invoiceDoc.toObject() : invoiceDoc;
  


  return { invoice: invoiceObj };
}


// Get list with filters
// Supports: number (exact/partial), gstin (billTo), forCompany, name (billTo.name partial),
// date range (from, to) even when invoice.date is a String in "DD-MM-YYYY" or ISO.
async function getInvoices(filters = {}) {
  const {
    number,            // string - partial ok
    gstin,             // string - billTo.gstin
    forCompany,        // string
    name,              // string - billTo.name (partial)
    from,              // "YYYY-MM-DD" preferred; also accepts "DD-MM-YYYY"
    to,                // same as above
    page = 1,
    limit = 20,
    sort = "-createdAt", // or "invoice.number" etc
  } = filters;

  const pageN = Math.max(1, parseInt(page, 10));
  const limitN = Math.max(1, parseInt(limit, 10));
  const skipN = (pageN - 1) * limitN;

  // Build $match for non-date filters
  const match = {};
  if (number) {
    // partial match on invoice.number
    match["invoice.number"] = { $regex: String(number).trim(), $options: "i" };
  }
  if (gstin) match["billTo.gstin"] = String(gstin).trim();
  if (forCompany) match.forCompany = String(forCompany).trim();
  if (name) match["billTo.name"] = { $regex: String(name).trim(), $options: "i" };

  // Build sort stage
  const sortStage = {};
  // allow "-field" or "field"
  String(sort)
    .split(/\s+/)
    .filter(Boolean)
    .forEach((key) => {
      if (key.startsWith("-")) sortStage[key.slice(1)] = -1;
      else sortStage[key] = 1;
    });

  // Date parsing helper: we’ll parse at query-time inside the pipeline
  // invoice.date could be either "DD-MM-YYYY" or ISO "YYYY-MM-DD"
  const pipeline = [
    { $match: match },
    {
      $addFields: {
        _parsedDate: {
          $ifNull: [
            {
              $dateFromString: {
                dateString: "$invoice.date",
                format: "%d-%m-%Y",
                onError: null,
                onNull: null,
              },
            },
            {
              $dateFromString: {
                dateString: "$invoice.date",
                onError: null,
                onNull: null,
              },
            },
          ],
        },
      },
    },
  ];

  // Range filter if provided
  if (from || to) {
    // Convert filter strings to real Date in JS; DB compares with those
    const parseBound = (s) => {
      if (!s) return null;
      // try ISO first
      const iso = new Date(s);
      if (!Number.isNaN(iso.valueOf())) return iso;
      // try DD-MM-YYYY
      const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(String(s));
      if (m) {
        const [_, dd, mm, yyyy] = m;
        return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
      }
      return null;
    };

    const fromDate = parseBound(from);
    const toDate = parseBound(to);

    const dateMatch = {};
    if (fromDate) dateMatch.$gte = fromDate;
    if (toDate) {
      // set to end-of-day inclusive
      const end = new Date(toDate);
      end.setUTCHours(23, 59, 59, 999);
      dateMatch.$lte = end;
    }
    pipeline.push({ $match: { _parsedDate: dateMatch } });
  }

  // Sorting, pagination, and total count in one go
  pipeline.push(
    { $sort: Object.keys(sortStage).length ? sortStage : { createdAt: -1 } },
    {
      $facet: {
        rows: [{ $skip: skipN }, { $limit: limitN }],
        totalDocs: [{ $count: "count" }],
      },
    },
    {
      $project: {
        rows: 1,
        total: { $ifNull: [{ $arrayElemAt: ["$totalDocs.count", 0] }, 0] },
      },
    }
  );

  const [agg] = await Invoice.aggregate(pipeline);
  const rows = agg?.rows || [];
  const total = agg?.total || 0;

  // Populate order for returned rows (if you need it)
  const populated = await Invoice.populate(rows, { path: "order" });

  const data = populated.map((inv) => {
    const obj = inv; // already plain from aggregate
    // remove helper field if present
    delete obj._parsedDate;
    return { invoice: obj, totals: computeTotals(obj) };
  });

  return { total, page: pageN, limit: limitN, data };
}

// Get by invoice number (exact)
async function getInvoiceByNumber(number) {
  const invoice = await Invoice.findOne({ "invoice.number": String(number).trim() }).populate("order");
  if (!invoice) throw new Error("Invoice not found");
  const totals = computeTotals(invoice.toObject());
  return { invoice, totals };
}

module.exports.createInvoice = createInvoice;
module.exports.getInvoiceByOrderId = getInvoiceByOrderId;
module.exports.getInvoices = getInvoices;
module.exports.getInvoiceByNumber = getInvoiceByNumber;
