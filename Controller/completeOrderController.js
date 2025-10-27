const Razorpay = require('razorpay');
const Order = require('../DataBase/Models/OrderModel');
const Design = require('../DataBase/Models/DesignModel');
const { createInvoice } = require('./invoiceService');
const { getOrCreateSingleton } = require('../Router/DataRoutes');
const { createTransaction } = require('./walletController');
const { createPrintroveOrder } = require('./printroveHelper');
const LZString = require('lz-string'); // ✅ added for decompression

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

function buildInvoiceItems(products, { hsn = '7307', unit = 'Pcs.' } = {}) {
  const items = [];
  (products || []).forEach((p) => {
    const qty = sumQuantity(p.quantity);
    if (!qty) return;
    items.push({
      description: p.products_name || 'Item',
      barcode: p._id || '',
      hsn,
      qty,
      unit,
      price: safeNum(p.price, 0),
    });
  });
  return items;
}

function formatDateDDMMYYYY(d = new Date()) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function addressToLine(a = {}) {
  const {
    fullName = '',
    houseNumber = '',
    street = '',
    landmark = '',
    city = '',
    state = '',
    pincode = '',
    country = '',
  } = a || {};
  return [
    fullName,
    houseNumber,
    street,
    landmark,
    city,
    state && `${state} - ${pincode}`,
    country,
  ]
    .filter(Boolean)
    .join(', ');
}

async function verifyRazorpayPayment(paymentId, expectedAmountINR) {
  if (!paymentId) throw new Error('Missing paymentId');
  const payment = await razorpay.payments.fetch(paymentId);
  if (!payment) throw new Error('Payment not found');
  if (payment.status !== 'captured') {
    throw new Error(`Payment not captured (status: ${payment.status})`);
  }
  const expectedPaise = Math.round(safeNum(expectedAmountINR, 0) * 100);
  if (safeNum(payment.amount, -1) !== expectedPaise) {
    throw new Error(
      `Payment amount mismatch. Expected ₹${expectedAmountINR}, got ₹${
        safeNum(payment.amount, 0) / 100
      }`
    );
  }
  return payment;
}

// ================================================================
// COMPLETE ORDER
// ================================================================
const completeOrder = async (req, res) => {
  let { paymentId, orderData, paymentmode, compressed } = req.body || {};

  // ✅ Log raw data from frontend
  console.log('🔍 RAW REQUEST DATA FROM FRONTEND:', {
    paymentId,
    paymentmode,
    compressed,
    orderData: orderData
      ? {
          items: orderData.items?.length || 0,
          totalPay: orderData.totalPay,
          address: orderData.address,
          user: orderData.user,
          pf: orderData.pf,
          pfFlat: orderData.pfFlat,
          gst: orderData.gst,
          printing: orderData.printing,
          printingPerSide: orderData.printingPerSide,
          printingUnits: orderData.printingUnits,
        }
      : null,
  });

  // ✅ Normalize charge structure (accept both orderData.charges.* or flat fields)
  // TODO: Commented out packaging and forwarding for testing - uncomment later
  // const pfCharge =
  //   safeNum(orderData?.charges?.pf, 0) || safeNum(orderData?.pf, 0) || 0;
  const pfCharge = 0; // Temporarily set to 0 for testing
  const printingCharge =
    safeNum(orderData?.charges?.printing, 0) ||
    safeNum(orderData?.printing, 0) ||
    0;

  try {
    // ✅ Decompress if compressed
    if (compressed && typeof orderData === 'string') {
      try {
        const jsonString = LZString.decompressFromBase64(orderData);
        orderData = JSON.parse(jsonString);
        console.log('✅ Order data decompressed successfully');
      } catch (e) {
        console.error('❌ Decompression failed:', e.message);
        return res
          .status(400)
          .json({ success: false, message: 'Invalid compressed payload' });
      }
    }

    if (
      !orderData ||
      !orderData.items ||
      !orderData.user ||
      !orderData.address
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid order data' });
    }

    let order = null;
    let payment = null;

    const items = Array.isArray(orderData.items) ? orderData.items : [];
    const totalPay = safeNum(orderData.totalPay, 0);
    const address = {
      ...orderData.address,
      email:
        orderData.address?.email ||
        orderData.user?.email ||
        'not_provided@duco.com',
    };

    const user =
      typeof orderData.user === 'object'
        ? orderData.user._id
        : orderData.user?.toString?.() || orderData.user;

    // ✅ Detect if order is Corporate (B2B) or Retail (B2C)
    const isCorporateOrder = (orderData?.items || []).some(
      (item) => item?.isCorporate === true
    );
    const orderType = isCorporateOrder ? 'B2B' : 'B2C';

    // ================================================================
    // CASE 0 – NORMALIZE PAYMENT MODE DISPLAY
    // ================================================================
    let readableMode = paymentmode;
    if (paymentmode === 'store_pickup') readableMode = 'Pay on Store';
    else if (paymentmode === 'netbanking') readableMode = 'Paid via Netbanking';
    else if (paymentmode === '50%') readableMode = '50% Advance Payment';
    else if (paymentmode === 'online') readableMode = 'Online Payment';
    else if (paymentmode === 'manual_payment') readableMode = 'Manual Payment';

    // ================================================================
    // CASE 1 – STORE PICKUP (NEW)
    // ================================================================
    if (paymentmode === 'store_pickup') {
      try {
        order = await Order.create({
          products: items,
          price: totalPay,
          totalPay: totalPay, // ✅ Add totalPay field for Printrove compatibility
          address,
          user,
          status: 'Pending',
          paymentmode: readableMode,
          pf: pfCharge,
          gst: safeNum(orderData.gst, 0),
          printing: printingCharge,
          orderType,
        });
      } catch (createError) {
        if (createError.code === 11000) {
          // Duplicate key error - retry with a new orderId
          console.warn('⚠️ Duplicate orderId detected, retrying...');
          order = await Order.create({
            products: items,
            price: totalPay,
            totalPay: totalPay,
            address,
            user,
            status: 'Pending',
            paymentmode: readableMode,
            pf: pfCharge,
            gst: safeNum(orderData.gst, 0),
            printing: printingCharge,
            orderType,
            orderId: `ORD-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`, // Force new orderId
          });
        } else {
          throw createError;
        }
      }

      try {
        const printData = await createPrintroveOrder(order);
        order.printroveOrderId = printData?.id || null;
        order.printroveStatus = printData?.status || 'Processing';
        order.printroveItems = printData?.items || [];
        order.printroveTrackingUrl = printData?.tracking_url || '';
        await order.save();
        console.log('✅ Sent to Printrove:', order.printroveOrderId);
      } catch (err) {
        console.error('❌ Printrove sync failed (store pickup):', err.message);
        order.printroveStatus = 'Error';
        await order.save();
      }

      const settings = await getOrCreateSingleton();
      const invoicePayload = {
        company: settings?.company,
        invoice: {
          number: String(order._id),
          date: formatDateDDMMYYYY(),
          placeOfSupply: settings?.invoice?.placeOfSupply,
          reverseCharge: !!settings?.invoice?.reverseCharge,
          copyType: settings?.invoice?.copyType || 'Original Copy',
        },
        billTo: {
          name: orderData.user?.name || '',
          address: addressToLine(address),
          gstin: '',
        },
        items: buildInvoiceItems(items),
        charges: {
          // TODO: Commented out packaging and forwarding for testing - uncomment later
          // pf: pfCharge,
          pf: 0, // Temporarily set to 0 for testing
          printing: printingCharge,
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
        console.error('Invoice creation failed (store pickup):', e);
      }

      return res.status(200).json({ success: true, order });
    }

    // ================================================================
    // CASE 2 – NETBANKING
    // ================================================================
    if (paymentmode === 'netbanking') {
      order = await Order.create({
        products: items,
        price: totalPay,
        totalPay: totalPay, // ✅ Add totalPay field for Printrove compatibility
        address,
        user,
        razorpayPaymentId: paymentId || null,
        status: 'Pending',
        paymentmode: readableMode,
        pf: pfCharge,
        printing: printingCharge,
        gst: safeNum(orderData.gst, 0),
        orderType,
      });

      try {
        const printData = await createPrintroveOrder(order);
        order.printroveOrderId = printData?.id || null;
        order.printroveStatus = printData?.status || 'Processing';
        order.printroveItems = printData?.items || [];
        order.printroveTrackingUrl = printData?.tracking_url || '';
        await order.save();
        console.log('✅ Sent to Printrove:', order.printroveOrderId);
      } catch (err) {
        console.error('❌ Printrove sync failed (netbanking):', err.message);
        order.printroveStatus = 'Error';
        await order.save();
      }

      const settings = await getOrCreateSingleton();
      const invoicePayload = {
        company: settings?.company,
        invoice: {
          number: String(order._id),
          date: formatDateDDMMYYYY(),
          placeOfSupply: settings?.invoice?.placeOfSupply,
          reverseCharge: !!settings?.invoice?.reverseCharge,
          copyType: settings?.invoice?.copyType || 'Original Copy',
        },
        billTo: {
          name: orderData.user?.name || '',
          address: addressToLine(address),
          gstin: '',
        },
        items: buildInvoiceItems(items),
        charges: {
          pf: pfCharge,
          printing: printingCharge,
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
        console.error('Invoice creation failed (netbanking):', e);
      }

      return res.status(200).json({ success: true, order });
    }

    // ================================================================
    // CASE 3 – ONLINE (FULL)
    // ================================================================
    if (paymentmode === 'online') {
      console.warn('⚠️ Skipping Razorpay verification for testing mode');
      payment = { id: paymentId || 'test_payment_id_001' };

      try {
        order = await Order.create({
          products: items,
          price: totalPay,
          totalPay: totalPay, // ✅ Add totalPay field for Printrove compatibility
          address,
          user,
          razorpayPaymentId: payment.id,
          status: 'Pending',
          paymentmode: readableMode,
          pf: pfCharge,
          printing: printingCharge,
          gst: safeNum(orderData.gst, 0),
          orderType,
        });
      } catch (createError) {
        if (createError.code === 11000) {
          // Duplicate key error - retry with a new orderId
          console.warn('⚠️ Duplicate orderId detected, retrying...');
          order = await Order.create({
            products: items,
            price: totalPay,
            totalPay: totalPay,
            address,
            user,
            razorpayPaymentId: payment.id,
            status: 'Pending',
            paymentmode: readableMode,
            pf: pfCharge,
            printing: printingCharge,
            gst: safeNum(orderData.gst, 0),
            orderType,
            orderId: `ORD-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`, // Force new orderId
          });
        } else {
          throw createError;
        }
      }

      try {
        const printData = await createPrintroveOrder(order);
        order.printroveOrderId = printData?.id || null;
        order.printroveStatus = printData?.status || 'Processing';
        order.printroveItems = printData?.items || [];
        order.printroveTrackingUrl = printData?.tracking_url || '';
        await order.save();
        console.log('✅ Sent to Printrove:', order.printroveOrderId);
      } catch (err) {
        console.error('❌ Printrove sync failed (online):', err.message);
        order.printroveStatus = 'Error';
        await order.save();
      }

      const settings = await getOrCreateSingleton();
      const invoicePayload = {
        company: settings?.company,
        invoice: {
          number: String(order._id),
          date: formatDateDDMMYYYY(),
          placeOfSupply: settings?.invoice?.placeOfSupply,
          reverseCharge: !!settings?.invoice?.reverseCharge,
          copyType: settings?.invoice?.copyType || 'Original Copy',
        },
        billTo: {
          name: orderData.user?.name || '',
          address: addressToLine(address),
          gstin: '',
        },
        items: buildInvoiceItems(items),
        charges: {
          // TODO: Commented out packaging and forwarding for testing - uncomment later
          // pf: pfCharge,
          pf: 0, // Temporarily set to 0 for testing
          printing: printingCharge,
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
        console.error('Invoice creation failed (razorpay):', e);
      }

      return res.status(200).json({ success: true, order });
    }

    // ================================================================
    // CASE 4 – 50% PAY
    // ================================================================
    if (paymentmode === '50%') {
      console.warn('⚠️ Skipping Razorpay verification for 50% testing mode');
      payment = { id: paymentId || 'test_payment_id_50percent' };

      order = await Order.create({
        products: items,
        price: totalPay,
        totalPay: totalPay, // ✅ Add totalPay field for Printrove compatibility
        address,
        user,
        razorpayPaymentId: payment.id,
        status: 'Pending',
        paymentmode: readableMode,
        pf: pfCharge,
        printing: printingCharge,
        gst: safeNum(orderData.gst, 0),
        orderType,
      });

      try {
        await createTransaction(user, order._id, totalPay, '50%');
      } catch (error) {
        console.error('Wallet creation failed (halfpay):', error);
      }

      try {
        const printData = await createPrintroveOrder(order);
        order.printroveOrderId = printData?.id || null;
        order.printroveStatus = printData?.status || 'Processing';
        order.printroveItems = printData?.items || [];
        order.printroveTrackingUrl = printData?.tracking_url || '';
        await order.save();
        console.log('✅ Sent to Printrove:', order.printroveOrderId);
      } catch (err) {
        console.error('❌ Printrove sync failed (50%):', err.message);
        order.printroveStatus = 'Error';
        await order.save();
      }

      const settings = await getOrCreateSingleton();
      const invoicePayload = {
        company: settings?.company,
        invoice: {
          number: String(order._id),
          date: formatDateDDMMYYYY(),
          placeOfSupply: settings?.invoice?.placeOfSupply,
          reverseCharge: !!settings?.invoice?.reverseCharge,
          copyType: settings?.invoice?.copyType || 'Original Copy',
        },
        billTo: {
          name: orderData.user?.name || '',
          address: addressToLine(address),
          gstin: '',
        },
        items: buildInvoiceItems(items),
        charges: {
          // TODO: Commented out packaging and forwarding for testing - uncomment later
          // pf: pfCharge,
          pf: 0, // Temporarily set to 0 for testing
          printing: printingCharge,
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
        console.error('Invoice creation failed (50%):', e);
      }

      return res.status(200).json({ success: true, order });
    }

    // ✅ fallback if paymentmode didn't match
    return res
      .status(400)
      .json({ success: false, message: 'Invalid payment mode' });
  } catch (err) {
    console.error('💥 completeOrder failed:', err);
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Internal error' });
  }
};

// ================================================================
// GET ORDER BY ID (with design + product enrichment)
// ================================================================
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const enriched = await Promise.all(
      (order.products || []).map(async (p) => {
        const product = { ...p };
        if (p.design && typeof p.design === 'string') {
          const d = await Design.findById(p.design).lean();
          if (d) product.design = d.design;
        }
        if (p.design_data) product.design = p.design_data;

        product.name =
          p.name ||
          p.products_name ||
          p.product_name ||
          p.product?.products_name ||
          'Unnamed Product';
        return product;
      })
    );

    order.items = enriched;
    return res.status(200).json(order);
  } catch (err) {
    console.error('❌ getOrderById failed:', err);
    return res.status(500).json({ message: err.message });
  }
};

// ================================================================
// GET ALL ORDERS (for Manage Orders dashboard)
// ================================================================
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean();

    const enrichedOrders = await Promise.all(
      orders.map(async (o) => {
        const enrichedProducts = await Promise.all(
          (o.products || []).map(async (p) => {
            const product = { ...p };
            if (p.design && typeof p.design === 'string') {
              const d = await Design.findById(p.design).lean();
              if (d) product.design = d.design;
            }
            if (p.design_data) product.design = p.design_data;
            product.name =
              p.name ||
              p.products_name ||
              p.product_name ||
              p.product?.products_name ||
              'Unnamed Product';
            return product;
          })
        );
        return { ...o, items: enrichedProducts };
      })
    );

    return res.status(200).json(enrichedOrders);
  } catch (err) {
    console.error('❌ getAllOrders failed:', err);
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { completeOrder, getOrderById, getAllOrders };
