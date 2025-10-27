// routes/invoiceHelper.routes.js
const express = require("express");
const router = express.Router();

const InvoiceHelper = require("../DataBase/Models/InvoiceHelper");

// ---- Default (initial) document ----
const INITIAL_DOC = {
  company: {
    name: "",
    address: "",
    gstin: "",
    cin: "",
    email: "",
    pan: "",
    iec: "",
    gst: ""
  },
  invoice: {
    placeOfSupply: "",
    reverseCharge: false,
    copyType: "Original Copy"
  },
  terms: [],
  forCompany: ""
};

// ---- Helpers ----
async function getOrCreateSingleton() {
  let doc = await InvoiceHelper.findOne({});
  if (!doc) {
    doc = await InvoiceHelper.create(INITIAL_DOC);
  }
  return doc;
}

// ---- READ (get the singleton) ----
router.get("/", async (req, res) => {
  try {
    const doc = await getOrCreateSingleton();
    res.json(doc);
  } catch (err) {
    console.error("GET /invoice-helper error:", err);
    res.status(500).json({ error: "Failed to fetch invoice helper" });
  }
});

// ---- UPDATE (merge update fields) ----
router.put("/", async (req, res) => {
  try {
    const current = await getOrCreateSingleton();
    const payload = req.body || {};

    if (payload.company && typeof payload.company === "object") {
      current.company = {
        ...(current.company?.toObject?.() || current.company || {}),
        ...payload.company
      };
    }

    if (payload.invoice && typeof payload.invoice === "object") {
      current.invoice = {
        ...(current.invoice?.toObject?.() || current.invoice || {}),
        ...payload.invoice
      };
    }

    if (Array.isArray(payload.terms)) {
      current.terms = payload.terms;
    }

    if (typeof payload.forCompany === "string") {
      current.forCompany = payload.forCompany;
    }

    await current.save();
    res.json(current);
  } catch (err) {
    console.error("PUT /invoice-helper error:", err);
    res.status(500).json({ error: "Failed to update invoice helper" });
  }
});

// ---- RESET (reset to initial state) ----
router.post("/reset", async (req, res) => {
  try {
    await InvoiceHelper.deleteMany({});
    const doc = await InvoiceHelper.create(INITIAL_DOC);
    res.json(doc);
  } catch (err) {
    console.error("POST /invoice-helper/reset error:", err);
    res.status(500).json({ error: "Failed to reset invoice helper" });
  }
});

// ✅ Export both
module.exports = {
  router,
  getOrCreateSingleton
};
