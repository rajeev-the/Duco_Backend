// controllers/completeOrder.js
const Razorpay = require("razorpay");
const Order = require("../DataBase/Models/OrderModel");
const { createInvoice } = require("./invoiceService");
const { getOrCreateSingleton } = require("../Router/DataRoutes");
const {createTransaction} = require("./walletController")

// --- Razorpay client ---
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// --- Helpers ---
function safeNum(v, fb = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}

function sumQuantity(obj) {
  return Object.values(obj || {}).reduce((acc, q) => acc + safeNum(q, 0), 0);
}

/**
 * Build invoice items from cart products
 * Each product expected shape:
 * {
 *   _id, products_name, price, quantity: { S:1, M:2, ... }
 * }
 */
function buildInvoiceItems(products, { hsn = "7307", unit = "Pcs." } = {}) {
  const items = [];
  (products || []).forEach((p) => {
    const qty = sumQuantity(p.quantity);
    if (!qty) return; // skip zero-qty lines
    items.push({
      description: p.products_name || "Item",
      barcode: p._id || "",
      hsn,
      qty,
      unit,
      price: safeNum(p.price, 0),
    });
  });
  return items;
}

function formatDateDDMMYYYY(d = new Date()) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function addressToLine(a = {}) {
  const {
    fullName = "",
    houseNumber = "",
    street = "",
    landmark = "",
    city = "",
    state = "",
    pincode = "",
    country = "",
  } = a || {};
  return [fullName, houseNumber, street, landmark, city, state && `${state} - ${pincode}`, country]
    .filter(Boolean)
    .join(", ");
}

async function verifyRazorpayPayment(paymentId, expectedAmountINR) {
  if (!paymentId) throw new Error("Missing paymentId");
  const payment = await razorpay.payments.fetch(paymentId);

  if (!payment) throw new Error("Payment not found");
  if (payment.status !== "captured") {
    throw new Error(`Payment not captured (status: ${payment.status})`);
  }

  // Basic amount check (paise vs INR)
  const expectedPaise = Math.round(safeNum(expectedAmountINR, 0) * 100);
  if (safeNum(payment.amount, -1) !== expectedPaise) {
    throw new Error(
      `Payment amount mismatch. Expected ₹${expectedAmountINR}, got ₹${safeNum(payment.amount, 0) / 100}`
    );
  }

  return payment;
}

// --- Controller ---
const completeOrder = async (req, res) => {
  const { paymentId, orderData, paymentmode } = req.body || {};

  // Quick validations
  if (!orderData || !orderData.items || !orderData.user || !orderData.address) {
    return res.status(400).json({ success: false, message: "Invalid order data" });
  }

  let order = null;
  let payment = null;

  try {
    const items = Array.isArray(orderData.items) ? orderData.items : [];
    const totalPay = safeNum(orderData.totalPay, 0);
    const address = orderData.address;
    const user = orderData.user; // expected { _id, name, ... }

    // --- Case 1: Bank Transfer / Manual (no Razorpay call) ---
    if (paymentmode === "netbanking") {
      order = await Order.create({
        products: items,
        price: totalPay,
        address,
        user: user._id,
        razorpayPaymentId: paymentId || null,
        status: "Pending",
        paymentmode: "Bank Transfer",
        pf: safeNum(orderData.pf, 0),
        gst: safeNum(orderData.gst, 0),
        printing: safeNum(orderData.printing, 0),
      });

      // Build and persist invoice (optional for bank transfer—kept for parity)
      const settings = await getOrCreateSingleton();
      const invoicePayload = {
        company: {
          name: settings?.company?.name,
          address: settings?.company?.address,
          gstin: settings?.company?.gstin,
          cin: settings?.company?.cin,
          email: settings?.company?.email,
          pan: settings?.company?.pan,
          iec: settings?.company?.iec,
          gst: settings?.company?.gst,
        },
        invoice: {
          number: String(order._id), // use order id as a unique number
          date: formatDateDDMMYYYY(),
          placeOfSupply: settings?.invoice?.placeOfSupply,
          reverseCharge: !!settings?.invoice?.reverseCharge,
          copyType: settings?.invoice?.copyType || "Original Copy",
        },
        billTo: {
          name: user.name || "",
          address: addressToLine(address),
          gstin: "", // fill if you have it for B2B
        },
        items: buildInvoiceItems(items),
        charges: {
          pf: safeNum(orderData.pf, 0),
          printing: safeNum(orderData.printing, 0),
        },
        tax: {
          cgstRate: safeNum(orderData.gst, 0) / 2,
          sgstRate: safeNum(orderData.gst, 0) / 2,
        },
        terms: settings?.terms,
        forCompany: settings?.forCompany,
        order: order._id,
      };

      try {
        await createInvoice(invoicePayload);
      } catch (e) {
        // Don’t block order creation if invoicing fails; just log
        console.error("Invoice creation failed (netbanking):", e);
      }

      return res.status(200).json({ success: true, order });
    }

    // --- Case 2: Online via Razorpay ---
    if (paymentmode === "online") {
      payment = await verifyRazorpayPayment(paymentId, totalPay);

      order = await Order.create({
        products: items,
        price: totalPay,
        address,
        user: user._id,
        razorpayPaymentId: payment.id,
        status: "Pending",
        paymentmode: "Razorpay",
        pf: safeNum(orderData.pf, 0),
        gst: safeNum(orderData.gst, 0),
        printing: safeNum(orderData.printing, 0),
      });

      // Prepare invoice data from singleton & order
      const settings = await getOrCreateSingleton();
      const invoicePayload = {
        company: {
          name: settings?.company?.name,
          address: settings?.company?.address,
          gstin: settings?.company?.gstin,
          cin: settings?.company?.cin,
          email: settings?.company?.email,
          pan: settings?.company?.pan,
          iec: settings?.company?.iec,
          gst: settings?.company?.gst,
        },
        invoice: {
          number: String(order._id),
          date: formatDateDDMMYYYY(),
          placeOfSupply: settings?.invoice?.placeOfSupply,
          reverseCharge: !!settings?.invoice?.reverseCharge,
          copyType: settings?.invoice?.copyType || "Original Copy",
        },
        billTo: {
          name: user.name || "",
          address: addressToLine(address),
          gstin: "", // fill if available
        },
        items: buildInvoiceItems(items),
        charges: {
          pf: safeNum(orderData.pf, 0),
          printing: safeNum(orderData.printing, 0),
        },
        tax: {
          cgstRate: safeNum(orderData.gst, 0) / 2,
          sgstRate: safeNum(orderData.gst, 0) / 2,
        },
        terms: settings?.terms,
        forCompany: settings?.forCompany,
        order: order._id,
      };

      try {
        await createInvoice(invoicePayload);
      } catch (e) {
        console.error("Invoice creation failed (razorpay):", e);
        // continue; order is valid
      }

      return res.status(200).json({ success: true, order });
    }
      if (paymentmode === "50%") {
        

      payment = await verifyRazorpayPayment(paymentId, totalPay/2);

      order = await Order.create({
        products: items,
        price: totalPay,
        address,
        user: user._id,
        razorpayPaymentId: payment.id,
        status: "Pending",
        paymentmode: "Razorpay",
        pf: safeNum(orderData.pf, 0),
        gst: safeNum(orderData.gst, 0),
        printing: safeNum(orderData.printing, 0),
      });


      try {
         await createTransaction(user._id, order._id, totalPay / 2, "50%");
        
      } catch (error) {
         console.error("Wallet  creation failed (halfpay):", error);
      }
     
      const settings = await getOrCreateSingleton();
      const invoicePayload = {
        company: {
          name: settings?.company?.name,
          address: settings?.company?.address,
          gstin: settings?.company?.gstin,
          cin: settings?.company?.cin,
          email: settings?.company?.email,
          pan: settings?.company?.pan,
          iec: settings?.company?.iec,
          gst: settings?.company?.gst,
        },
        invoice: {
          number: String(order._id),
          date: formatDateDDMMYYYY(),
          placeOfSupply: settings?.invoice?.placeOfSupply,
          reverseCharge: !!settings?.invoice?.reverseCharge,
          copyType: settings?.invoice?.copyType || "Original Copy",
        },
        billTo: {
          name: user.name || "",
          address: addressToLine(address),
          gstin: "", // fill if available
        },
        items: buildInvoiceItems(items),
        charges: {
          pf: safeNum(orderData.pf, 0),
          printing: safeNum(orderData.printing, 0),
        },
        tax: {
          cgstRate: safeNum(orderData.gst, 0) / 2,
          sgstRate: safeNum(orderData.gst, 0) / 2,
        },
        terms: settings?.terms,
        forCompany: settings?.forCompany,
        order: order._id,
      };

      try {
        await createInvoice(invoicePayload);
      } catch (e) {
        console.error("Invoice creation failed (razorpay):", e);
        // continue; order is valid
      }

      return res.status(200).json({ success: true, order });
    }

    // Unknown payment mode
    return res.status(400).json({ success: false, message: "Invalid payment mode" });
  } catch (err) {
    // Best-effort rollback & refund
    try {
      if (payment?.id) {
        await razorpay.payments.refund(payment.id);
      }
    } catch (e) {
      console.error("Refund attempt failed:", e);
    }

    try {
      if (order?._id) {
        await Order.findByIdAndDelete(order._id);
      }
    } catch (e) {
      console.error("Order rollback failed:", e);
    }

    console.error("💥 completeOrder failed:", err);
    return res.status(500).json({ success: false, message: err.message || "Internal error" });
  }
};

module.exports = { completeOrder };
