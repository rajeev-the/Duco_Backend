const { createPrintroveOrder } = require('./Controller/printroveHelper');
const PrintroveProductCreationService = require('./Service/PrintroveProductCreationService');

/**
 * Test script for the refactored Printrove integration
 * Tests both plain products and custom designs with product library approach
 */

async function testRefactoredIntegration() {
  console.log('🧪 Testing Refactored Printrove Integration\n');

  try {
    // Test 1: Plain Product Order
    console.log('📦 Test 1: Plain Product Order');
    const plainOrder = {
      _id: 'test-plain-order-001',
      razorpayPaymentId: 'pay_test_plain_001',
      products: [
        {
          productId: 'tshirt-001',
          name: 'Basic T-shirt',
          color: 'Black',
          quantity: { M: 2 },
          price: 299,
          // No design - should be plain
        },
      ],
      address: {
        fullName: 'Test User',
        email: 'test@example.com',
        mobileNumber: '9876543210',
        houseNumber: '123',
        street: 'Test Street',
        landmark: 'Near Test Mall',
        pincode: '110001',
        state: 'Delhi',
        city: 'New Delhi',
        country: 'India',
      },
      totalAmount: 598,
    };

    console.log('Creating plain product order...');
    const plainResult = await createPrintroveOrder(plainOrder);
    console.log('✅ Plain product order result:', {
      success: plainResult.success,
      orderId: plainResult.printroveOrderId,
      message: plainResult.message,
    });

    // Test 2: Custom Design Order (with product library)
    console.log('\n🎨 Test 2: Custom Design Order');
    const customOrder = {
      _id: 'test-custom-order-002',
      razorpayPaymentId: 'pay_test_custom_002',
      products: [
        {
          productId: 'custom-tshirt-1234567890',
          name: 'Custom T-shirt with Design',
          color: 'White',
          quantity: { L: 1 },
          price: 399,
          design: {
            frontImage:
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // 1x1 pixel PNG
            backImage: null,
          },
        },
      ],
      address: {
        fullName: 'Custom User',
        email: 'custom@example.com',
        mobileNumber: '9876543211',
        houseNumber: '456',
        street: 'Custom Street',
        landmark: 'Near Custom Mall',
        pincode: '110002',
        state: 'Delhi',
        city: 'New Delhi',
        country: 'India',
      },
      totalAmount: 399,
    };

    console.log('Creating custom design order...');
    const customResult = await createPrintroveOrder(customOrder);
    console.log('✅ Custom design order result:', {
      success: customResult.success,
      orderId: customResult.printroveOrderId,
      message: customResult.message,
    });

    // Test 3: Mixed Order (plain + custom)
    console.log('\n🔄 Test 3: Mixed Order');
    const mixedOrder = {
      _id: 'test-mixed-order-003',
      razorpayPaymentId: 'pay_test_mixed_003',
      products: [
        {
          productId: 'tshirt-002',
          name: 'Plain T-shirt',
          color: 'Red',
          quantity: { S: 1 },
          price: 199,
          // No design
        },
        {
          productId: 'custom-tshirt-0987654321',
          name: 'Custom T-shirt',
          color: 'Blue',
          quantity: { XL: 1 },
          price: 499,
          design: {
            frontImage:
              'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A', // 1x1 pixel JPEG
            backImage: null,
          },
        },
      ],
      address: {
        fullName: 'Mixed User',
        email: 'mixed@example.com',
        mobileNumber: '9876543212',
        houseNumber: '789',
        street: 'Mixed Street',
        landmark: 'Near Mixed Mall',
        pincode: '110003',
        state: 'Delhi',
        city: 'New Delhi',
        country: 'India',
      },
      totalAmount: 698,
    };

    console.log('Creating mixed order...');
    const mixedResult = await createPrintroveOrder(mixedOrder);
    console.log('✅ Mixed order result:', {
      success: mixedResult.success,
      orderId: mixedResult.printroveOrderId,
      message: mixedResult.message,
    });

    // Test 4: Product Creation Service Cache
    console.log('\n💾 Test 4: Product Creation Service Cache');
    const cacheStats = PrintroveProductCreationService.getCacheStats();
    console.log('Cache statistics:', cacheStats);

    // Test 5: Design Upload Fallback
    console.log('\n⚠️ Test 5: Design Upload Fallback');
    const fallbackOrder = {
      _id: 'test-fallback-order-004',
      razorpayPaymentId: 'pay_test_fallback_004',
      products: [
        {
          productId: 'custom-tshirt-fallback-123',
          name: 'Custom T-shirt (Fallback Test)',
          color: 'Green',
          quantity: { M: 1 },
          price: 299,
          design: {
            frontImage: 'invalid-base64-data', // Invalid data to trigger fallback
            backImage: null,
          },
        },
      ],
      address: {
        fullName: 'Fallback User',
        email: 'fallback@example.com',
        mobileNumber: '9876543213',
        houseNumber: '321',
        street: 'Fallback Street',
        landmark: 'Near Fallback Mall',
        pincode: '110004',
        state: 'Delhi',
        city: 'New Delhi',
        country: 'India',
      },
      totalAmount: 299,
    };

    console.log('Creating fallback order (should use plain product)...');
    const fallbackResult = await createPrintroveOrder(fallbackOrder);
    console.log('✅ Fallback order result:', {
      success: fallbackResult.success,
      orderId: fallbackResult.printroveOrderId,
      message: fallbackResult.message,
    });

    console.log('\n🎉 All tests completed!');
    console.log('\n📊 Test Summary:');
    console.log(
      '- Plain Product Order:',
      plainResult.success ? '✅ PASS' : '❌ FAIL'
    );
    console.log(
      '- Custom Design Order:',
      customResult.success ? '✅ PASS' : '❌ FAIL'
    );
    console.log('- Mixed Order:', mixedResult.success ? '✅ PASS' : '❌ FAIL');
    console.log(
      '- Fallback Order:',
      fallbackResult.success ? '✅ PASS' : '❌ FAIL'
    );
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the tests
if (require.main === module) {
  testRefactoredIntegration()
    .then(() => {
      console.log('\n✅ Test script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testRefactoredIntegration };
