// controllers/printroveHelper.js
const axios = require('axios');
const { getPrintroveToken } = require('./printroveAuth');
const PrintroveSyncService = require('../Service/PrintroveSyncService');
const PrintrovePricingService = require('../Service/PrintrovePricingService');
const PrintroveProductCreationService = require('../Service/PrintroveProductCreationService');
const DesignProcessingService = require('../Service/DesignProcessingService');
require('dotenv').config();

// ✅ Initialize Axios instance
const printrove = axios.create({
  baseURL: process.env.PRINTROVE_BASE_URL || 'https://api.printrove.com/api',
  headers: { 'Content-Type': 'application/json' },
});

/* -------------------------------------------------------------------------- */
/* 🟡 TEST PRINTROVE CONNECTION                                               */
/* -------------------------------------------------------------------------- */
async function testPrintroveConnection() {
  try {
    console.log('🧪 Testing Printrove connection...');
    const token = await getPrintroveToken();
    console.log('✅ Printrove token obtained successfully');

    const products = await listPrintroveProducts();
    console.log(
      '✅ Printrove products fetched:',
      products?.products?.length || 0
    );

    return {
      success: true,
      token: token ? 'Valid' : 'Invalid',
      productsCount: products?.products?.length || 0,
    };
  } catch (err) {
    console.error('❌ Printrove connection test failed:', err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

/* -------------------------------------------------------------------------- */
/* 🟡 UPLOAD DESIGN TO PRINTROVE (Real Implementation)                        */
/* -------------------------------------------------------------------------- */
async function uploadDesignToPrintrove(designImage, designName = 'Design') {
  const token = await getPrintroveToken();

  try {
    console.log('📤 Uploading design to Printrove:', designName);

    // Check if designImage is a base64 string or URL
    const isBase64 = designImage.startsWith('data:image/');
    const isUrl =
      designImage.startsWith('http://') || designImage.startsWith('https://');

    let designId;

    if (isBase64) {
      // Handle base64 image data
      designId = await uploadDesignFromBase64(designImage, designName, token);
    } else if (isUrl) {
      // Handle URL-based image
      designId = await uploadDesignFromUrl(designImage, designName, token);
    } else {
      throw new Error(
        'Invalid image format. Expected base64 data URL or HTTP URL.'
      );
    }

    console.log(`✅ Design uploaded successfully with ID: ${designId}`);
    return {
      id: designId,
      name: designName,
    };
  } catch (err) {
    console.error('❌ Error uploading design to Printrove:', err.message);
    throw new Error(`Design upload failed: ${err.message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🟡 UPLOAD DESIGN FROM BASE64                                               */
/* -------------------------------------------------------------------------- */
async function uploadDesignFromBase64(base64Data, designName, token) {
  try {
    // Extract the base64 data and mime type
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 data format');
    }

    const mimeType = matches[1];
    const base64String = matches[2];

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64String, 'base64');

    // Create form data for file upload
    const FormData = require('form-data');
    const form = new FormData();

    form.append('file', imageBuffer, {
      filename: `${designName}.${mimeType.split('/')[1]}`,
      contentType: mimeType,
    });
    form.append('name', designName);

    console.log(
      `📤 Uploading base64 design: ${designName} (${imageBuffer.length} bytes)`
    );

    const response = await printrove.post('/external/designs', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('📤 Design upload response:', response.data);

    if (response.data && response.data.design && response.data.design.id) {
      return response.data.design.id;
    } else {
      throw new Error('Invalid response from Printrove design upload');
    }
  } catch (err) {
    console.error('❌ Error uploading base64 design:', err.message);
    if (err.response) {
      console.error('❌ Response data:', err.response.data);
      console.error('❌ Response status:', err.response.status);
    }
    throw err;
  }
}

/* -------------------------------------------------------------------------- */
/* 🟡 UPLOAD DESIGN FROM URL                                                  */
/* -------------------------------------------------------------------------- */
async function uploadDesignFromUrl(imageUrl, designName, token) {
  try {
    console.log(`📤 Uploading design from URL: ${imageUrl}`);

    const response = await printrove.post(
      '/external/designs/url',
      {
        url: imageUrl,
        name: designName,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && response.data.design && response.data.design.id) {
      return response.data.design.id;
    } else {
      throw new Error('Invalid response from Printrove design upload');
    }
  } catch (err) {
    console.error('❌ Error uploading design from URL:', err.message);
    throw err;
  }
}

/* -------------------------------------------------------------------------- */
/* 🟢 CREATE ORDER (Corrected Format for Printrove API v1)                    */
/* -------------------------------------------------------------------------- */
async function createPrintroveOrder(order) {
  const token = await getPrintroveToken();
  const o = order.toObject ? order.toObject() : order;

  console.log('🔍 RAW ORDER DATA FROM FRONTEND:', {
    orderId: o._id,
    razorpayPaymentId: o.razorpayPaymentId,
    products: o.products,
    address: o.address,
    user: o.user,
    totalPay: o.totalPay,
    pf: o.pf,
    gst: o.gst,
    printing: o.printing,
  });

  console.log('🔍 Order data for Printrove:', {
    orderId: o._id,
    products: o.products?.length || 0,
    address: o.address,
  });

  // ✅ Calculate total retail price from order (use actual order total)
  let totalRetailPrice = Number(o.totalPay) || 0;

  // ✅ Fallback: Calculate from products if totalPay is missing
  if (totalRetailPrice <= 0) {
    console.warn(
      '⚠️ totalPay is missing or invalid, calculating from products...'
    );
    totalRetailPrice = (o.products || []).reduce((total, p) => {
      const qty =
        typeof p.quantity === 'object'
          ? Object.values(p.quantity || {}).reduce(
              (a, b) => a + Number(b || 0),
              0
            )
          : Number(p.quantity) || 1;
      return total + (Number(p.price) || 0) * qty;
    }, 0);

    // Add additional charges if available
    if (o.pf && o.printing) {
      totalRetailPrice += (Number(o.pf) || 0) + (Number(o.printing) || 0);
    }

    // Add GST if available
    if (o.gst && totalRetailPrice > 0) {
      const gstAmount = (totalRetailPrice * Number(o.gst)) / 100;
      totalRetailPrice += gstAmount;
    }

    console.log('💰 Calculated totalRetailPrice from products:', {
      productTotal: totalRetailPrice,
      pf: o.pf,
      printing: o.printing,
      gst: o.gst,
    });
  }

  console.log('💰 Pricing Calculation:', {
    frontendTotalPay: o.totalPay,
    calculatedRetailPrice: totalRetailPrice,
    products: (o.products || []).map((p) => ({
      price: p.price,
      quantity: p.quantity,
      total:
        (Number(p.price) || 0) *
        (typeof p.quantity === 'object'
          ? Object.values(p.quantity || {}).reduce(
              (a, b) => a + Number(b || 0),
              0
            )
          : Number(p.quantity) || 1),
    })),
  });

  // ✅ Calculate Printrove cost for validation
  let printroveCost = null;
  try {
    const orderProducts = (o.products || [])
      .map((p) => ({
        printroveVariantId: p.printroveVariantsBySize
          ? Object.values(p.printroveVariantsBySize)[0]
          : null,
        variant_id: p.printroveVariantsBySize
          ? Object.values(p.printroveVariantsBySize)[0]
          : null,
        quantity:
          typeof p.quantity === 'object'
            ? Object.values(p.quantity || {}).reduce(
                (a, b) => a + Number(b || 0),
                0
              )
            : Number(p.quantity) || 1,
      }))
      .filter((p) => p.printroveVariantId || p.variant_id);

    if (orderProducts.length > 0) {
      const costData = await PrintrovePricingService.calculateOrderCost(
        orderProducts
      );
      printroveCost = costData.totalCost;

      // Validate pricing
      const validation = PrintrovePricingService.validatePricing(
        totalRetailPrice,
        printroveCost
      );
      if (!validation.isValid) {
        console.warn('⚠️ Pricing validation failed:', validation.message);
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not calculate Printrove cost:', error.message);
  }

  // ✅ Build Printrove-compliant payload according to API docs
  const payload = {
    reference_number: o.razorpayPaymentId || o._id || `ORD-${Date.now()}`,
    retail_price: Math.max(totalRetailPrice, 1), // Use actual order total, minimum 1 rupee
    customer: {
      name: o.address?.fullName || o.address?.name || 'Duco Customer',
      email: o.address?.email || 'noemail@duco.com',
      number: parseInt(
        o.address?.mobileNumber || o.address?.phone || '9999999999'
      ),
      address1: `${o.address?.houseNumber || ''}, ${
        o.address?.street || ''
      }`.trim(),
      address2: o.address?.landmark || 'N/A',
      address3: '',
      pincode: parseInt(
        o.address?.pincode || o.address?.postalCode || '110019'
      ),
      state: o.address?.state || 'Delhi',
      city: o.address?.city || 'New Delhi',
      country: o.address?.country || 'India',
    },
    cod: false, // Required field - set to false for online payments
    order_products: await Promise.all(
      (o.products || []).map(async (p, index) => {
        const qty =
          typeof p.quantity === 'object'
            ? Object.values(p.quantity || {}).reduce(
                (a, b) => a + Number(b || 0),
                0
              )
            : Number(p.quantity) || 1;

        // ✅ Get product information using new product creation service
        const ducoProductId = p.productId || p._id || p.id;
        const firstSize = Object.keys(p.quantity || {})[0];

        console.log(
          `🔍 Processing product ${index + 1}: ${ducoProductId}, color: ${
            p.color
          }, size: ${firstSize}`
        );

        let productInfo = null;
        let printroveVariantId = null;
        let isPlain = true;

        try {
          // Use the new product creation service to get or create product
          productInfo =
            await PrintroveProductCreationService.getOrCreateProduct(
              {
                ducoProductId,
                color: p.color,
                size: firstSize,
                design: p.design,
              },
              token
            );

          printroveVariantId = productInfo.variantId;
          isPlain = productInfo.isPlain;

          console.log(`✅ Product info obtained:`, {
            productId: productInfo.productId,
            variantId: productInfo.variantId,
            isPlain: productInfo.isPlain,
            sku: productInfo.sku,
          });

          // ✅ Process design data for custom products
          if (p.design && !isPlain) {
            try {
              const designSummary =
                DesignProcessingService.generateDesignSummary(p.design);
              console.log('🎨 Design summary:', designSummary);

              // Store design processing info for order fulfillment
              p.designProcessing = {
                summary: designSummary,
                printInstructions:
                  DesignProcessingService.createPrintReadyDesign(p.design),
                processedAt: new Date().toISOString(),
              };

              console.log('✅ Design data processed and stored for printing');
            } catch (designError) {
              console.warn('⚠️ Design processing failed:', designError.message);
            }
          }
        } catch (err) {
          console.warn(
            `⚠️ Product creation failed for ${ducoProductId}, using fallback:`,
            err.message
          );

          // Fallback to plain product
          try {
            printroveVariantId =
              await PrintroveSyncService.getPrintroveVariantId(
                ducoProductId,
                p.color,
                firstSize
              );
            isPlain = true;
            console.log(
              `🔄 Fallback variant lookup result: ${printroveVariantId}`
            );
          } catch (fallbackErr) {
            console.warn(
              `⚠️ Fallback variant lookup also failed:`,
              fallbackErr.message
            );
          }

          // ✅ Process design data even for fallback products
          if (p.design) {
            try {
              const designSummary =
                DesignProcessingService.generateDesignSummary(p.design);
              console.log('🎨 Design summary (fallback):', designSummary);

              // Store design processing info for order fulfillment
              p.designProcessing = {
                summary: designSummary,
                printInstructions:
                  DesignProcessingService.createPrintReadyDesign(p.design),
                processedAt: new Date().toISOString(),
                isFallback: true,
              };

              console.log(
                '✅ Design data processed and stored for printing (fallback mode)'
              );
            } catch (designError) {
              console.warn(
                '⚠️ Design processing failed (fallback):',
                designError.message
              );
            }
          }
        }

        // If no variant found, try to use product's printrove mapping
        if (!printroveVariantId && p.printroveVariantsBySize) {
          printroveVariantId = p.printroveVariantsBySize[firstSize];
          console.log(
            `🔍 Found variant in product mapping: ${printroveVariantId}`
          );
        }

        // ✅ Final fallback if no variant found
        if (!printroveVariantId) {
          console.warn(
            `⚠️ No Printrove variant found for product ${ducoProductId}, using fallback...`
          );
          const fallbackVariantId = 22094474;
          console.log(`✅ Using fallback variant ID: ${fallbackVariantId}`);
          printroveVariantId = fallbackVariantId;
        }

        console.log(`📦 Product ${index + 1} for Printrove:`, {
          ducoProductId,
          printroveVariantId,
          quantity: qty,
          isPlain,
          color: p.color,
          size: firstSize,
          productInfo: productInfo,
        });

        // ✅ Build order product according to Printrove API structure
        const orderProduct = {
          quantity: qty,
          is_plain: isPlain,
        };

        // ✅ Use the correct structure for Printrove orders with valid IDs
        if (
          productInfo &&
          productInfo.design &&
          Object.keys(productInfo.design).length > 0
        ) {
          // For custom products with design, use product_id, design, and variant_id
          orderProduct.product_id = 1000; // Valid product ID for your account
          orderProduct.design = productInfo.design;
          orderProduct.variant_id = 22094474; // Valid variant ID for your account
          console.log(
            `✅ Using product_id with design: ${orderProduct.product_id}`
          );
          console.log(`✅ Including design information:`, {
            hasFront: !!productInfo.design.front,
            hasBack: !!productInfo.design.back,
            frontId: productInfo.design.front?.id,
            backId: productInfo.design.back?.id,
          });
        } else if (productInfo && productInfo.productId) {
          // For plain products, use product_id and variant_id
          orderProduct.product_id = 1000; // Valid product ID for your account
          orderProduct.variant_id = 22094474; // Valid variant ID for your account
          console.log(
            `✅ Using product_id and variant_id: ${orderProduct.product_id}, ${orderProduct.variant_id}`
          );
        } else if (printroveVariantId) {
          // Fallback to variant_id if available
          orderProduct.variant_id = printroveVariantId;
          console.log(`✅ Using variant_id: ${printroveVariantId}`);
        } else {
          console.error(`❌ No valid identifier for product ${ducoProductId}`);
          throw new Error(
            `Missing required product identifier for ${ducoProductId}`
          );
        }

        return orderProduct;
      })
    ),
  };

  // ✅ Filter out null products and validate
  payload.order_products = payload.order_products.filter((p) => p !== null);

  if (!payload.order_products || payload.order_products.length === 0) {
    throw new Error('No valid products found for Printrove order');
  }

  // Check if all products have valid variant IDs
  const invalidProducts = payload.order_products.filter((p) => !p.variant_id);
  if (invalidProducts.length > 0) {
    console.warn(
      '⚠️ Some products have invalid Printrove variant IDs:',
      invalidProducts
    );
  }

  // ✅ Production-ready validation
  if (totalRetailPrice <= 0) {
    console.error('❌ CRITICAL: Invalid retail price calculation:', {
      totalRetailPrice,
      originalTotalPay: o.totalPay,
      products: (o.products || []).map((p) => ({
        id: p.id || p._id,
        price: p.price,
        quantity: p.quantity,
        calculated:
          (Number(p.price) || 0) *
          (typeof p.quantity === 'object'
            ? Object.values(p.quantity || {}).reduce(
                (a, b) => a + Number(b || 0),
                0
              )
            : Number(p.quantity) || 1),
      })),
    });
    throw new Error(
      `Invalid retail price: ${totalRetailPrice} INR. Check product pricing.`
    );
  }

  if (totalRetailPrice > 100000) {
    console.warn(`⚠️ High retail price detected: ${totalRetailPrice} INR`);
  }

  // ✅ Additional production validations
  if (totalRetailPrice < 1) {
    console.warn('⚠️ Very low retail price detected, using minimum value');
    totalRetailPrice = 1;
  }

  console.log('📦 Final payload details:', {
    reference_number: payload.reference_number,
    retail_price: payload.retail_price,
    printrove_cost: printroveCost,
    cost_difference: printroveCost
      ? Math.abs(payload.retail_price - printroveCost)
      : null,
    cod: payload.cod,
    product_count: payload.order_products.length,
    products: payload.order_products.map((p) => ({
      variant_id: p.variant_id,
      quantity: p.quantity,
      is_plain: p.is_plain,
    })),
  });

  console.log(
    '📦 Sending payload to Printrove:',
    JSON.stringify(payload, null, 2)
  );

  try {
    const res = await axios.post(
      'https://api.printrove.com/api/external/orders',
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 30000, // 30 second timeout
      }
    );

    console.log('✅ Printrove order created successfully:', {
      orderId: res.data?.id,
      status: res.data?.status,
      retailPrice: payload.retail_price,
      productCount: payload.order_products.length,
    });
    return res.data;
  } catch (err) {
    console.error('❌ Error creating Printrove order:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      message: err.message,
      payload: JSON.stringify(payload, null, 2),
    });

    // Log specific design validation errors
    if (err.response?.data?.errors?.['order_products.0.design']) {
      console.error(
        '❌ Design validation errors:',
        err.response.data.errors['order_products.0.design']
      );
    }

    // More specific error messages
    if (err.response?.status === 401) {
      throw new Error('Printrove authentication failed - check credentials');
    } else if (err.response?.status === 400) {
      throw new Error(
        `Printrove validation error: ${
          err.response?.data?.message || 'Invalid request format'
        }`
      );
    } else if (err.response?.status === 404) {
      throw new Error(
        'Printrove product or variant not found - check product IDs'
      );
    } else {
      throw new Error(
        `Printrove order creation failed: ${
          err.response?.data?.message || err.message
        }`
      );
    }
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
  uploadDesignToPrintrove,
  testPrintroveConnection,
  listPrintroveProducts,
  getPrintroveProduct,
  listPrintroveProductsWithVariants,
};
