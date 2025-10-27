// routes/printroveRoutes.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
const {
  syncPrintroveCatalog,
} = require('../Controller/printroveSyncController');
const {
  createPrintroveOrder,
  listPrintroveProducts,
  getPrintroveProduct,
  uploadDesignToPrintrove,
  testPrintroveConnection,
} = require('../Controller/printroveHelper');
const { getPrintroveToken } = require('../Controller/printroveAuth');

router.get('/sync', syncPrintroveCatalog);

// ✅ Test Printrove integration endpoints
router.get('/test/connection', async (req, res) => {
  try {
    const result = await testPrintroveConnection();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.get('/test/products', async (req, res) => {
  try {
    const products = await listPrintroveProducts();
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/test/product/:id', async (req, res) => {
  try {
    const product = await getPrintroveProduct(req.params.id);
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/test/upload-design', async (req, res) => {
  try {
    const { designImage, designName } = req.body;
    const result = await uploadDesignToPrintrove(designImage, designName);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Test order creation with minimal data
router.post('/test/create-order', async (req, res) => {
  try {
    const testOrder = {
      _id: 'test-order-' + Date.now(),
      razorpayPaymentId: 'test-payment-' + Date.now(),
      products: [
        {
          printroveProductId: null,
          printroveVariantId: null,
          price: 100,
          quantity: 1,
          design: {},
        },
      ],
      address: {
        fullName: 'Test Customer',
        email: 'test@example.com',
        phone: '9999999999',
        houseNumber: '123',
        street: 'Test Street',
        city: 'Test City',
        state: 'Test State',
        pincode: '110001',
      },
    };

    const result = await createPrintroveOrder(testOrder);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      details: err.response?.data,
    });
  }
});

// ✅ Test with real Printrove IDs from your account
router.post('/test/create-order-exact', async (req, res) => {
  try {
    const token = await getPrintroveToken();

    // ✅ Get real product and variant IDs from your account
    const products = await listPrintroveProducts();
    const variantProductId = products?.products?.[0]?.id || 807600;

    let realProductId = 464; // Parent product ID
    let realVariantId = 22094474; // Use the one we know works

    if (products?.products?.[0]?.id) {
      const productDetails = await getPrintroveProduct(variantProductId);
      if (productDetails?.product?.product?.id) {
        realProductId = productDetails.product.product.id; // Parent product ID
      }
      if (productDetails?.product?.variants?.[0]?.id) {
        realVariantId = productDetails.product.variants[0].id;
      }
    }

    const payload = {
      reference_number: 'OD1001',
      retail_price: 500,
      customer: {
        name: 'John Doe',
        email: 'johndoe@example.com',
        number: 9844654321,
        address1: '123 Lane, Area',
        address2: 'Address Line 2',
        address3: 'Landmark here',
        pincode: 600001,
        state: 'Tamil Nadu',
        city: 'Chennai',
        country: 'India',
      },
      order_products: [
        {
          // product_id: realProductId, // Try without product_id first
          quantity: 1,
          variant_id: realVariantId, // Use real variant ID
          is_plain: true, // Set to true for plain products (no design)
        },
      ],
      // courier_id: 7, // Remove invalid courier ID
      cod: false, // Set to false for online payments
      invoice_url:
        'https://printrove.s3.ap-south-1.amazonaws.com/invoice/od1001.pdf',
    };

    console.log('🧪 Testing with real Printrove IDs:', {
      productId: realProductId,
      variantId: realVariantId,
      payload,
    });

    const response = await axios.post(
      'https://api.printrove.com/api/external/orders',
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    res.json({ success: true, data: response.data });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      details: err.response?.data,
    });
  }
});

module.exports = router;
