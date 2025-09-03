const Razorpay = require('razorpay');
const Order = require('../DataBase/Models/OrderModel');
const {createInvoice} = require("./invoiceService")

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const completeOrder = async (req, res) => {
  const { paymentId, orderData, paymentmode } = req.body;

  let payment = null;
  let order = null;

  try {
    // ✅ Case 1: Bank Transfer (skip Razorpay verification)
    if (paymentmode === "netbanking") {
      order = await Order.create({
        products: orderData.items,
        price: orderData.totalPay,
        address: orderData.address,
        user: orderData.user._id,
        razorpayPaymentId: paymentId || null,
        status: "Pending",
        paymentmode: "Bank Transfer",
        pf:orderData.pf,
        gst:printing.gst,
        printing:printing.gst

      });

      return res.status(200).json({ success: true, order });
    }

    // ✅ Case 2: Razorpay payment verification
    if(paymentmode === "online") {
    payment = await razorpay.payments.fetch(paymentId);
    if (!payment || payment.status !== "captured") {
      throw new Error(`Payment not captured (status: ${payment?.status || "unknown"})`);
    }

    order = await Order.create({
      products: orderData.items,
      price: orderData.totalPay,
      address: orderData.address,
      user: orderData.user._id,
      razorpayPaymentId: paymentId,
      status: "Pending",
      paymentmode: "Razorpay",
         pf:orderData.pf,
        gst:orderData.gst,
        printing:orderData.printing
    });

    if(res.status == 200){

      const DEMO_INVOICE = {
  company: {
    name: "DUCO ART PRIVATE LIMITED",
    address: "SADIJA COMPOUND AVANTI VIHAR LIG 64\nNEAR BANK OF BARODA, RAIPUR C.G",
    gstin: "22AAICD1719N1ZM",
    cin: "U52601CT2020PTC010997",
    email: "ducoart1@gmail.com",
    pan: "ABCDE1234F",
    iec: "1234567890",
 
        gst:orderData.gst,

  },
  invoice: {
    number: "209",
    date: "26-08-2025",          // ⚠️ if you switch schema to Date, use new Date("2025-08-26")
    placeOfSupply: "Chhattisgarh (22)",
    reverseCharge: false,
    copyType: "Original Copy",
  },
  billTo: {
    name: user.name,
    address:`${address.fullName}, ${address.houseNumber}, ${address.street}, ${address.landmark}, ${address.city}, ${address.state} - ${address.pincode}, ${address.country})`,
    gstin: "",
  },
  items: [
    {
      description: "",
      barcode: "000015",
      hsn: "7307",
      qty: 1,
      unit: "Pcs.",
      price: 4800,
    },
  ],
  charges: {
    pf: orderData.pf,
    printing: orderData.printing,
  },
  tax: {
    cgstRate: 9,
    sgstRate: 9,
  },
  terms: [
    "Goods once sold will not be taken back.",
    "Interest @ 18% p.a. will be charged if the payment is not made within the stipulated time.",
    "Subject to 'Chhattisgarh' Jurisdiction only.",
  ],
  forCompany: "DUCO ART PRIVATE LIMITED",
};



      const res2 = await  createInvoice(DEMO_INVOICE)


    }

    return res.status(200).json({ success: true, order });
  }


  } catch (err) {
    // Rollback best-effort
    if (payment?.id) {
      try {
        await razorpay.payments.refund(payment.id);
      } catch {}
    }

    if (order?._id) {
      try {
        await Order.findByIdAndDelete(order._id);
      } catch {}
    }

    console.error("💥 completeOrder failed:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { completeOrder };
