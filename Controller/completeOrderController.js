const Razorpay = require('razorpay');
const Order = require('../DataBase/Models/OrderModel');
const Design = require('../DataBase/Models/DesignModel');
const { createInvoice } = require('./invoiceService');
const { getOrCreateSingleton } = require('../Router/DataRoutes');
const { createTransaction } = require('./walletController');
const { createPrintroveOrder } = require('./printroveHelper');
const LZString = require('lz-string');

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

// --- Order Processing Functions ---
async function processOrderData(req) {
  const { paymentId, orderData, paymentmode, compressed } = req.body || {};

  // Decompress if compressed
  if (compressed && typeof orderData === 'string') {
    try {
      const jsonString = LZString.decompressFromBase64(orderData);
      return {
        paymentId,
        orderData: JSON.parse(jsonString),
        paymentmode,
        compressed: false,
      };
    } catch (e) {
      console.error('❌ Decompression failed:', e.message);
      throw new Error('Invalid compressed payload');
    }
  }

  return { paymentId, orderData, paymentmode, compressed: false };
}

function validateOrderData(orderData) {
  if (!orderData || !orderData.items || !orderData.user || !orderData.address) {
    throw new Error('Invalid order data - missing required fields');
  }
  return true;
}

function normalizeCharges(orderData) {
  const pfCharge =
    safeNum(orderData?.charges?.pf, 0) || safeNum(orderData?.pf, 0) || 0;
  const printingCharge =
    safeNum(orderData?.charges?.printing, 0) ||
    safeNum(orderData?.printing, 0) ||
    0;
  const gst = safeNum(orderData.gst, 0);

  return { pfCharge, printingCharge, gst };
}

function getPaymentModeDisplay(paymentmode) {
  const modeMap = {
    store_pickup: 'Pay on Store',
    netbanking: 'Paid via Netbanking',
    '50%': '50% Advance Payment',
    online: 'Online Payment',
    manual_payment: 'Manual Payment',
  };
  return modeMap[paymentmode] || paymentmode;
}

function detectOrderType(items) {
  const isCorporateOrder = (items || []).some(
    (item) => item?.isCorporate === true
  );
  return isCorporateOrder ? 'B2B' : 'B2C';
}

async function createOrderRecord(orderData, paymentId, paymentmode, charges) {
  const { items, totalPay, address, user } = orderData;
  const { pfCharge, printingCharge, gst } = charges;
  const orderType = detectOrderType(items);
  const readableMode = getPaymentModeDisplay(paymentmode);

  const orderDataForDB = {
    products: items,
    price: totalPay,
    address: {
      ...address,
      email: address?.email || orderData.user?.email || 'not_provided@duco.com',
    },
    user:
      typeof orderData.user === 'object'
        ? orderData.user._id
        : orderData.user?.toString?.() || orderData.user,
    razorpayPaymentId: paymentId || null,
    status: 'Pending',
    paymentmode: readableMode,
    pf: pfCharge,
    printing: printingCharge,
    gst: gst,
    orderType,
  };

  return await Order.create(orderDataForDB);
}

async function syncWithPrintrove(order) {
  try {
    console.log('🔄 Syncing order with Printrove...');
    const printData = await createPrintroveOrder(order);

    order.printroveOrderId = printData?.id || null;
    order.printroveStatus = printData?.status || 'Processing';
    order.printroveItems = printData?.items || [];
    order.printroveTrackingUrl = printData?.tracking_url || '';

    await order.save();
    console.log('✅ Order synced with Printrove:', order.printroveOrderId);
    return printData;
  } catch (err) {
    console.error('❌ Printrove sync failed:', err.message);
    order.printroveStatus = 'Error';
    order.printroveError = err.message;
    await order.save();
    throw err;
  }
}

async function createInvoiceForOrder(order, orderData, charges) {
  try {
    const settings = await getOrCreateSingleton();
    const { pfCharge, printingCharge, gst } = charges;

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
        address: addressToLine(order.address),
        gstin: '',
      },
      items: buildInvoiceItems(order.products),
      charges: {
        pf: pfCharge,
        printing: printingCharge,
      },
      tax: {
        cgstRate: gst / 2,
        sgstRate: gst / 2,
      },
      terms: settings?.terms,
      forCompany: settings?.forCompany,
      order: order._id,
    };

    await createInvoice(invoicePayload);
    console.log('✅ Invoice created for order:', order._id);
  } catch (err) {
    console.error('❌ Invoice creation failed:', err.message);
    // Don't throw here as invoice creation is not critical
  }
}

async function handleWalletTransaction(user, orderId, totalPay, paymentmode) {
  if (paymentmode === '50%') {
    try {
      await createTransaction(user, orderId, totalPay, '50%');
      console.log('✅ Wallet transaction created for 50% payment');
    } catch (error) {
      console.error('❌ Wallet creation failed:', error.message);
      // Don't throw here as wallet creation is not critical for order completion
    }
  }
}

// --- Main Order Processing Function ---
async function processOrder(paymentmode, orderData, paymentId, charges) {
  const order = await createOrderRecord(
    orderData,
    paymentId,
    paymentmode,
    charges
  );

  // Handle wallet transaction for 50% payments
  await handleWalletTransaction(
    order.user,
    order._id,
    order.price,
    paymentmode
  );

  // Sync with Printrove
  try {
    await syncWithPrintrove(order);
  } catch (printroveError) {
    console.error(
      'Printrove sync failed, but continuing with order:',
      printroveError.message
    );
  }

  // Create invoice
  await createInvoiceForOrder(order, orderData, charges);

  return order;
}

// ================================================================
// COMPLETE ORDER - Main Controller Function
// ================================================================
const completeOrder = async (req, res) => {
  try {
    // Process and validate input data
    const { paymentId, orderData, paymentmode } = await processOrderData(req);
    validateOrderData(orderData);
    const charges = normalizeCharges(orderData);

    console.log(
      `🛒 Processing ${paymentmode} order for user:`,
      orderData.user?.email || orderData.user
    );

    // Process order based on payment mode
    let order;

    switch (paymentmode) {
      case 'store_pickup':
      case 'netbanking':
      case 'online':
      case '50%':
        order = await processOrder(paymentmode, orderData, paymentId, charges);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid payment mode',
        });
    }

    console.log('✅ Order completed successfully:', order._id);
    return res.status(200).json({
      success: true,
      order,
      message: 'Order placed successfully',
    });
  } catch (err) {
    console.error('💥 completeOrder failed:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Internal server error',
    });
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

// ================================================================
// SYNC ORDER WITH PRINTROVE (Manual sync endpoint)
// ================================================================
const syncOrderWithPrintrove = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    await syncWithPrintrove(order);

    return res.status(200).json({
      success: true,
      message: 'Order synced with Printrove successfully',
      printroveOrderId: order.printroveOrderId,
      printroveStatus: order.printroveStatus,
    });
  } catch (err) {
    console.error('❌ syncOrderWithPrintrove failed:', err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  completeOrder,
  getOrderById,
  getAllOrders,
  syncOrderWithPrintrove,
};
