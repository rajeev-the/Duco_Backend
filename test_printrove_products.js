/**
 * Test Printrove Products
 * Check what products are available in your Printrove account
 */

const axios = require('axios');
const { getPrintroveToken } = require('./Controller/printroveAuth');

async function testPrintroveProducts() {
  console.log('🧪 Testing Printrove Products\n');

  try {
    // Get Printrove token
    console.log('1️⃣ Getting Printrove token...');
    const token = await getPrintroveToken();
    console.log('✅ Token obtained successfully');

    // Get all products
    console.log('\n2️⃣ Fetching all products from Printrove...');
    const productsResponse = await axios.get(
      'https://api.printrove.com/api/external/products',
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    console.log('✅ Products fetched successfully');
    console.log(
      '📦 Total products:',
      productsResponse.data.products?.length || 0
    );

    if (
      productsResponse.data.products &&
      productsResponse.data.products.length > 0
    ) {
      console.log('\n3️⃣ Available products:');
      productsResponse.data.products.forEach((product, index) => {
        console.log(`Product ${index + 1}:`, {
          id: product.id,
          name: product.name,
          hasVariants: !!product.variants && product.variants.length > 0,
          variantCount: product.variants?.length || 0,
        });

        // Show first few variants if available
        if (product.variants && product.variants.length > 0) {
          console.log(
            `  Variants:`,
            product.variants.slice(0, 3).map((v) => ({
              id: v.id,
              sku: v.sku,
            }))
          );
        }
      });

      // Find a t-shirt product
      const tshirtProduct = productsResponse.data.products.find(
        (p) =>
          p.name &&
          (p.name.toLowerCase().includes('t-shirt') ||
            p.name.toLowerCase().includes('tshirt') ||
            p.name.toLowerCase().includes('shirt'))
      );

      if (tshirtProduct) {
        console.log('\n4️⃣ T-shirt product found:');
        console.log('✅ Product:', {
          id: tshirtProduct.id,
          name: tshirtProduct.name,
          hasVariants:
            !!tshirtProduct.variants && tshirtProduct.variants.length > 0,
        });

        if (tshirtProduct.variants && tshirtProduct.variants.length > 0) {
          console.log('✅ Variants available:');
          tshirtProduct.variants.forEach((variant, index) => {
            console.log(`  Variant ${index + 1}:`, {
              id: variant.id,
              sku: variant.sku,
            });
          });
        }
      } else {
        console.log('\n4️⃣ No t-shirt product found');
        console.log('⚠️ Using first available product for testing');
        const firstProduct = productsResponse.data.products[0];
        console.log('✅ First product:', {
          id: firstProduct.id,
          name: firstProduct.name,
          hasVariants:
            !!firstProduct.variants && firstProduct.variants.length > 0,
        });
      }
    }

    // Test order creation with a simple product
    console.log('\n5️⃣ Testing simple order creation...');

    const testOrder = {
      reference_number: 'TEST-SIMPLE-' + Date.now(),
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
          variant_id: 22094474, // Fallback variant
        },
      ],
      cod: false,
    };

    try {
      const orderResponse = await axios.post(
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

      console.log('✅ Simple order created successfully!');
      console.log('📦 Order response:', {
        status: orderResponse.status,
        orderId: orderResponse.data?.order?.id || orderResponse.data?.id,
      });
    } catch (orderError) {
      console.log('⚠️ Simple order creation test:');
      console.log('Status:', orderError.response?.status);
      console.log('Message:', orderError.response?.data?.message);

      if (
        orderError.response?.status === 422 &&
        orderError.response?.data?.message?.includes('sufficient credits')
      ) {
        console.log(
          '✅ This is expected - the order structure is correct, but you need credits'
        );
      } else {
        console.log('❌ Unexpected error:', orderError.response?.data);
      }
    }
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
  testPrintroveProducts()
    .then(() => {
      console.log('\n✅ Printrove products test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Printrove products test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testPrintroveProducts };
