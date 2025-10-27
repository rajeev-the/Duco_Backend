/**
 * Find Valid Printrove IDs
 * Find the correct product IDs and variant IDs for your account
 */

const axios = require('axios');
const { getPrintroveToken } = require('./Controller/printroveAuth');

async function findValidPrintroveIds() {
  console.log('🔍 Finding Valid Printrove IDs for Your Account\n');

  try {
    // Get Printrove token
    console.log('1️⃣ Getting Printrove token...');
    const token = await getPrintroveToken();
    console.log('✅ Token obtained successfully');

    // Get all products from catalog
    console.log('\n2️⃣ Fetching products from Catalog API...');
    const catalogResponse = await axios.get(
      'https://api.printrove.com/api/external/products',
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    console.log('✅ Catalog products fetched successfully');
    console.log(
      '📦 Total catalog products:',
      catalogResponse.data.products?.length || 0
    );

    if (
      catalogResponse.data.products &&
      catalogResponse.data.products.length > 0
    ) {
      console.log('\n3️⃣ Available catalog products:');
      catalogResponse.data.products.forEach((product, index) => {
        console.log(`Product ${index + 1}:`, {
          id: product.id,
          name: product.name,
          hasVariants: !!product.variants && product.variants.length > 0,
          variantCount: product.variants?.length || 0,
        });

        // Show variants if available
        if (product.variants && product.variants.length > 0) {
          console.log(
            `  Variants:`,
            product.variants.map((v) => ({
              id: v.id,
              sku: v.sku,
            }))
          );
        }
      });
    }

    // Test different product IDs to find valid ones
    console.log('\n4️⃣ Testing different product IDs for orders...');

    const testProductIds = [462, 460021, 1, 2, 3, 10, 100, 1000];
    const testVariantIds = [460021, 1, 2, 3, 10, 100, 1000, 22094474];

    for (const productId of testProductIds) {
      console.log(`\n🧪 Testing product_id: ${productId}`);

      const testOrder = {
        reference_number: 'TEST-PRODUCT-' + productId + '-' + Date.now(),
        retail_price: 25.99,
        customer: {
          name: 'Test User',
          email: 'test@example.com',
          number: 9876543210,
          address1: '123 Test Street',
          address2: 'Test Area',
          address3: 'Test Landmark',
          pincode: 110001,
          state: 'Delhi',
          city: 'New Delhi',
          country: 'India',
        },
        order_products: [
          {
            quantity: 1,
            is_plain: true,
            product_id: productId,
          },
        ],
        cod: false,
      };

      try {
        const response = await axios.post(
          'https://api.printrove.com/api/external/orders',
          testOrder,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          }
        );

        console.log(`✅ Product ID ${productId} is VALID!`);
        console.log('📦 Order response:', {
          status: response.status,
          orderId: response.data?.order?.id || response.data?.id,
        });
        break; // Found a valid product ID
      } catch (error) {
        if (error.response?.status === 422) {
          const errors = error.response.data?.errors || {};
          if (errors['order_products.0.product_id']) {
            console.log(
              `❌ Product ID ${productId} is invalid: ${errors['order_products.0.product_id'][0]}`
            );
          } else if (
            error.response.data?.message?.includes('sufficient credits')
          ) {
            console.log(
              `✅ Product ID ${productId} is VALID (credits issue only)`
            );
            break; // Found a valid product ID
          } else {
            console.log(
              `❌ Product ID ${productId} failed: ${error.response.data?.message}`
            );
          }
        } else {
          console.log(`❌ Product ID ${productId} failed: ${error.message}`);
        }
      }
    }

    // Test different variant IDs
    console.log('\n5️⃣ Testing different variant IDs for orders...');

    for (const variantId of testVariantIds) {
      console.log(`\n🧪 Testing variant_id: ${variantId}`);

      const testOrder = {
        reference_number: 'TEST-VARIANT-' + variantId + '-' + Date.now(),
        retail_price: 25.99,
        customer: {
          name: 'Test User',
          email: 'test@example.com',
          number: 9876543210,
          address1: '123 Test Street',
          address2: 'Test Area',
          address3: 'Test Landmark',
          pincode: 110001,
          state: 'Delhi',
          city: 'New Delhi',
          country: 'India',
        },
        order_products: [
          {
            quantity: 1,
            is_plain: true,
            variant_id: variantId,
          },
        ],
        cod: false,
      };

      try {
        const response = await axios.post(
          'https://api.printrove.com/api/external/orders',
          testOrder,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          }
        );

        console.log(`✅ Variant ID ${variantId} is VALID!`);
        console.log('📦 Order response:', {
          status: response.status,
          orderId: response.data?.order?.id || response.data?.id,
        });
        break; // Found a valid variant ID
      } catch (error) {
        if (error.response?.status === 422) {
          const errors = error.response.data?.errors || {};
          if (errors['order_products.0.variant_id']) {
            console.log(
              `❌ Variant ID ${variantId} is invalid: ${errors['order_products.0.variant_id'][0]}`
            );
          } else if (
            error.response.data?.message?.includes('sufficient credits')
          ) {
            console.log(
              `✅ Variant ID ${variantId} is VALID (credits issue only)`
            );
            break; // Found a valid variant ID
          } else {
            console.log(
              `❌ Variant ID ${variantId} failed: ${error.response.data?.message}`
            );
          }
        } else {
          console.log(`❌ Variant ID ${variantId} failed: ${error.message}`);
        }
      }
    }

    console.log('\n🎯 Summary:');
    console.log('✅ This script tests different product IDs and variant IDs');
    console.log('✅ Look for "VALID" messages above to find working IDs');
    console.log('✅ Use those IDs in your order creation code');
    console.log(
      '✅ The IDs from the documentation example may not work for your account'
    );
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
if (require.main === module) {
  findValidPrintroveIds()
    .then(() => {
      console.log('\n✅ Valid Printrove IDs search completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Valid Printrove IDs search failed:', error.message);
      process.exit(1);
    });
}

module.exports = { findValidPrintroveIds };
