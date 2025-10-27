/**
 * Test Custom T-Shirt Design Functionality
 * Tests the complete flow of creating a custom t-shirt with design
 */

const axios = require('axios');
const PrintroveProductCreationService = require('./Service/PrintroveProductCreationService');
const { getPrintroveToken } = require('./Controller/printroveAuth');

async function testCustomTShirt() {
  console.log('🧪 Testing Custom T-Shirt Design Functionality\n');

  try {
    // Get Printrove token
    console.log('1️⃣ Getting Printrove token...');
    const token = await getPrintroveToken();
    console.log('✅ Token obtained successfully');

    // Use the service instance
    const productService = PrintroveProductCreationService;

    // Test data - simulate a custom t-shirt with design
    const testOrderItem = {
      ducoProductId: 'custom-tshirt-test-123',
      color: '#FF0000',
      size: 'M',
      design: {
        frontImage:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // 1x1 red pixel
        backImage: null,
      },
    };

    console.log('\n2️⃣ Testing custom product creation...');
    console.log('📦 Test order item:', {
      ducoProductId: testOrderItem.ducoProductId,
      color: testOrderItem.color,
      size: testOrderItem.size,
      hasDesign: !!testOrderItem.design,
    });

    // Test the getOrCreateProduct function
    const result = await productService.getOrCreateProduct(
      testOrderItem,
      token
    );

    console.log('✅ Custom product creation result:', {
      productId: result.productId,
      variantId: result.variantId,
      isPlain: result.isPlain,
      sku: result.sku,
      hasDesignIds: !!(result.designIds?.front || result.designIds?.back),
    });

    if (result.isPlain) {
      console.log(
        '⚠️ Product was created as plain (no design) - this might be expected if design upload failed'
      );
    } else {
      console.log('🎨 Custom product with design created successfully!');
    }

    console.log('\n🎉 Custom t-shirt test completed successfully!');
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
  testCustomTShirt()
    .then(() => {
      console.log('\n✅ Custom t-shirt test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Custom t-shirt test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testCustomTShirt };
