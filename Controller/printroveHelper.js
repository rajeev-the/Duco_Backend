// controllers/printroveHelper.js
const axios = require('axios');
const { getPrintroveToken } = require('./printroveAuth');
require('dotenv').config();

// ✅ Initialize Axios instance
const printrove = axios.create({
  baseURL: 'https://api.printrove.com/api',
  headers: { 'Content-Type': 'application/json' },
});

/* -------------------------------------------------------------------------- */
/* 🟢 CREATE ORDER (Corrected Format for Printrove API v1)                    */
/* -------------------------------------------------------------------------- */
async function createPrintroveOrder(order) {
  const token = await getPrintroveToken();
  const o = order.toObject ? order.toObject() : order;

  // Calculate total retail price
  const totalRetailPrice = o.price || 0;

  // ✅ Build Printrove-compliant payload according to API documentation
  const payload = {
    reference_number:
      o.razorpayPaymentId || o._id?.toString() || `ORD-${Date.now()}`,
    retail_price: totalRetailPrice,
    customer: {
      name: o.address?.fullName || o.address?.name || 'Duco Customer',
      email: o.address?.email || 'noemail@duco.com',
      number: o.address?.mobileNumber || o.address?.phone || '9999999999',
      address1: o.address?.houseNumber || '',
      address2: o.address?.street || '',
      address3: o.address?.landmark || '',
      pincode: parseInt(
        o.address?.pincode || o.address?.postalCode || '110019'
      ),
      state: o.address?.state || 'Delhi',
      city: o.address?.city || 'New Delhi',
      country: o.address?.country || 'India',
    },
    order_products: (o.products || []).map((p) => {
      const qty =
        typeof p.quantity === 'object'
          ? Object.values(p.quantity || {}).reduce(
              (a, b) => a + Number(b || 0),
              0
            )
          : Number(p.quantity) || 1;

      // ✅ Correct design object per Printrove docs - nested structure
      let design = null;
      if (p.design?.frontImage || p.design?.backImage) {
        design = {};

        if (p.design?.frontImage) {
          design.front = {
            id: p.design?.frontDesignId || 1, // You may need to upload design first
            dimensions: {
              width: p.design?.frontWidth || 3000,
              height: p.design?.frontHeight || 3000,
              top: p.design?.frontTop || 10,
              left: p.design?.frontLeft || 50,
            },
          };
        }

        if (p.design?.backImage) {
          design.back = {
            id: p.design?.backDesignId || 1, // You may need to upload design first
            dimensions: {
              width: p.design?.backWidth || 3000,
              height: p.design?.backHeight || 3000,
              top: p.design?.backTop || 10,
              left: p.design?.backLeft || 50,
            },
          };
        }
      }

      return {
        product_id: Number(p.printroveProductId || p.product_id || 1),
        variant_id: Number(p.printroveVariantId || p.variant_id || 1),
        quantity: qty,
        design: design,
        is_plain: !design, // true if no design is to be printed
      };
    }),
    courier_id: 7, // Default courier ID - you may need to get this from Printrove
    cod: o.paymentmode === 'store_pickup' || o.paymentmode === '50%', // true for COD orders
    invoice_url: '', // Optional: URL to your invoice
  };

  console.log(
    '📦 Sending payload to Printrove:',
    JSON.stringify(payload, null, 2)
  );

  try {
    const res = await printrove.post('/external/orders', payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    console.log('✅ Printrove order created successfully:', res.data);
    return res.data;
  } catch (err) {
    console.error(
      '❌ Error creating Printrove order:',
      err.response?.data || err.message
    );
    throw new Error(
      `Printrove order creation failed: ${
        err.response?.data?.message || err.message
      }`
    );
  }
}

/* -------------------------------------------------------------------------- */
/* 🟣 FETCH ALL PRINTROVE PRODUCTS                                            */
/* -------------------------------------------------------------------------- */
async function listPrintroveProducts() {
  const token = await getPrintroveToken();
  try {
    const res = await printrove.get('/external/products', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(
      '✅ Printrove Products fetched:',
      res.data?.products?.length || 0
    );
    return res.data;
  } catch (err) {
    console.error(
      '❌ Failed to fetch Printrove products:',
      err.response?.data || err.message
    );
    throw new Error('Failed to fetch Printrove products');
  }
}

/* -------------------------------------------------------------------------- */
/* 🟤 FETCH SINGLE PRODUCT (variants)                                         */
/* -------------------------------------------------------------------------- */
async function getPrintroveProduct(productId) {
  const token = await getPrintroveToken();
  try {
    const res = await printrove.get(`/external/products/${productId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`✅ Printrove Product (${productId}) fetched successfully.`);
    return res.data;
  } catch (err) {
    console.error(
      '❌ Failed to fetch Printrove product:',
      err.response?.data || err.message
    );
    throw new Error('Failed to fetch Printrove product');
  }
}

/* -------------------------------------------------------------------------- */
/* 🟠 COMBINED: PRODUCT + VARIANTS                                            */
/* -------------------------------------------------------------------------- */
async function listPrintroveProductsWithVariants() {
  const baseList = await listPrintroveProducts();
  const products = baseList?.products || [];
  const detailed = [];

  for (const p of products) {
    try {
      const detail = await getPrintroveProduct(p.id);

      console.log(
        `🧩 Printrove Product ${p.id} example variant:`,
        detail?.product?.variants?.[0]
      );

      detailed.push({
        id: p.id,
        name: p.name,
        variants:
          detail?.product?.variants?.map((v) => ({
            id: v.id,
            color:
              v.color ||
              v.product?.color ||
              v.attributes?.color ||
              (v.sku && v.sku.split(' ')[1]) ||
              '',
            size:
              v.size ||
              v.product?.size ||
              v.attributes?.size ||
              (v.sku && v.sku.split(' ')[2]) ||
              '',
            mockup_front: v.mockup?.front_mockup || '',
            mockup_back: v.mockup?.back_mockup || '',
          })) || [],
      });
    } catch (err) {
      console.warn(`⚠️ Could not fetch variants for product ${p.id}`);
      detailed.push({ id: p.id, name: p.name, variants: [] });
    }
  }

  return detailed;
}

/* -------------------------------------------------------------------------- */
/* ✅ EXPORT MODULES                                                          */
/* -------------------------------------------------------------------------- */
module.exports = {
  createPrintroveOrder,
  listPrintroveProducts,
  getPrintroveProduct,
  listPrintroveProductsWithVariants,
};
