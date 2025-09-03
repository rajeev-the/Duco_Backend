const express = require("express")

const router = express.Router();
const {getInvoiceByOrderId}  = require("../Controller/invoiceService")


// GET /api/invoices/by-order/:orderId
router.get("/invoice/:id", async (req, res) => {
  try {
    const { invoice, totals } = await getInvoiceByOrderId(req.params.orderId);
    res.json({ invoice, totals });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to fetch invoice" });
  }
});

module.exports = router
