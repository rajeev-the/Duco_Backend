// Test script for Printrove order creation
const {
  createPrintroveOrder,
  testPrintroveConnection,
} = require('./Controller/printroveHelper');
const mongoose = require('mongoose');
require('dotenv').config();

async function testPrintroveOrderCreation() {
  try {
    console.log('🧪 Testing Printrove order creation...\n');

    // Test connection first
    console.log('1. Testing Printrove connection...');
    const connectionTest = await testPrintroveConnection();
    console.log('Connection test result:', connectionTest);
    console.log('');

    if (!connectionTest.success) {
      console.error('❌ Cannot proceed without Printrove connection');
      return;
    }

    // Create a test order object
    const testOrder = {
      _id: new mongoose.Types.ObjectId(),
      razorpayPaymentId: 'test_payment_' + Date.now(),
      products: [
        {
          id: 'custom-tshirt-test-' + Date.now(),
          productId: 'custom-tshirt-test-' + Date.now(),
          products_name: 'Test Polo T-Shirt',
          name: 'Test Polo T-Shirt',
          design: {
            frontImage:
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            backImage:
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          },
          color: '#FF5733',
          colortext: 'Custom',
          gender: 'Male',
          price: 1,
          quantity: { M: 1 },
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

    console.log('2. Creating test order...');
    console.log('Test order data:', {
      orderId: testOrder._id,
      products: testOrder.products.length,
      totalPay: testOrder.totalPay,
      hasDesign: !!testOrder.products[0].design,
    });
    console.log('');

    // Test order creation
    const result = await createPrintroveOrder(testOrder);

    console.log('3. Order creation result:');
    console.log('✅ Success:', !!result);
    console.log('Result:', result);
    console.log('');

    if (result) {
      console.log('🎉 Printrove order creation test PASSED!');
    } else {
      console.log('❌ Printrove order creation test FAILED!');
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Error details:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testPrintroveOrderCreation();
}

module.exports = { testPrintroveOrderCreation };
