// Test script for the fixed Printrove integration
const {
  createPrintroveOrder,
  testPrintroveConnection,
} = require('./Controller/printroveHelper');
const mongoose = require('mongoose');
require('dotenv').config();

async function testFixedIntegration() {
  try {
    console.log('🧪 Testing Fixed Printrove Integration...\n');

    // Test connection first
    console.log('1. Testing Printrove connection...');
    const connectionTest = await testPrintroveConnection();
    console.log('Connection test result:', connectionTest);
    console.log('');

    if (!connectionTest.success) {
      console.error('❌ Cannot proceed without Printrove connection');
      return;
    }

    // Create a test order object that matches the frontend data structure
    const testOrder = {
      _id: new mongoose.Types.ObjectId(),
      razorpayPaymentId: 'test_payment_' + Date.now(),
      products: [
        {
          id: 'custom-tshirt-test-' + Date.now(),
          productId: 'custom-tshirt-test-' + Date.now(),
          products_name: 'Polo T-Shirt',
          name: 'Polo T-Shirt',
          printroveProductId: null,
          printroveVariantId: null, // This is what frontend sends
          printroveLineItems: [],
          printroveNeedsMapping: {},
          design: {
            frontImage:
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            backImage:
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          },
          previewImages: {},
          color: '#FF5733',
          colortext: 'Custom',
          gender: 'Male',
          price: 1,
          quantity: { M: 1 }, // This should be an object with size quantities
          additionalFilesMeta: [],
        },
      ],
      address: {
        fullName: 'Test User',
        email: 'test@example.com',
        mobileNumber: '9876543210',
        houseNumber: '123',
        street: 'Test Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country: 'India',
        landmark: 'Test Landmark',
        addressType: 'Home',
      },
      user: new mongoose.Types.ObjectId(),
      totalPay: 1.05,
      pf: 0,
      gst: 5,
      printing: 0,
    };

    console.log('2. Test order data structure:');
    console.log('   - Product ID:', testOrder.products[0].id);
    console.log('   - Product Name:', testOrder.products[0].name);
    console.log('   - Has Design:', !!testOrder.products[0].design);
    console.log(
      '   - Printrove Variant ID:',
      testOrder.products[0].printroveVariantId
    );
    console.log('   - Quantity:', testOrder.products[0].quantity);
    console.log('   - Color:', testOrder.products[0].color);
    console.log('');

    // Test order creation
    console.log('3. Creating Printrove order...');
    const result = await createPrintroveOrder(testOrder);

    console.log('4. Order creation result:');
    if (result) {
      console.log('✅ SUCCESS: Order created successfully!');
      console.log('   - Order ID:', result.id || 'N/A');
      console.log('   - Status:', result.status || 'N/A');
      console.log('   - Reference:', result.reference_number || 'N/A');
    } else {
      console.log('❌ FAILED: Order creation returned null/undefined');
    }
    console.log('');

    console.log('🎉 Test completed!');
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Error details:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testFixedIntegration();
}

module.exports = { testFixedIntegration };
