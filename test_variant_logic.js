// Test the variant logic to see what's happening
const { createPrintroveOrder } = require('./Controller/printroveHelper');
const mongoose = require('mongoose');
require('dotenv').config();

async function testVariantLogic() {
  try {
    console.log('🧪 Testing Variant Logic...\n');

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
          printroveVariantId: null,
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
          quantity: { S: 1 },
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

    console.log('📋 Test order data:');
    console.log('   - Product ID:', testOrder.products[0].id);
    console.log('   - Has Design:', !!testOrder.products[0].design);
    console.log(
      '   - Printrove Variant ID:',
      testOrder.products[0].printroveVariantId
    );
    console.log('');

    // Test order creation
    console.log('🚀 Creating Printrove order...');
    const result = await createPrintroveOrder(testOrder);

    console.log('✅ Test completed!');
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Error details:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testVariantLogic();
}

module.exports = { testVariantLogic };
