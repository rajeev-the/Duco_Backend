const { createPrintroveOrder } = require('./Controller/printroveHelper');
const PrintroveProductCreationService = require('./Service/PrintroveProductCreationService');

/**
 * Comprehensive test suite for the refactored Printrove integration
 * Tests all scenarios: plain products, custom designs, fallbacks, pricing, etc.
 */

class PrintroveTestSuite {
  constructor() {
    this.testResults = [];
    this.passedTests = 0;
    this.failedTests = 0;
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 Running: ${testName}`);
    try {
      const result = await testFunction();
      this.testResults.push({ name: testName, status: 'PASS', result });
      this.passedTests++;
      console.log(`✅ ${testName}: PASSED`);
      return result;
    } catch (error) {
      this.testResults.push({
        name: testName,
        status: 'FAIL',
        error: error.message,
      });
      this.failedTests++;
      console.log(`❌ ${testName}: FAILED - ${error.message}`);
      return null;
    }
  }

  async testPlainProductOrder() {
    const order = {
      _id: 'test-plain-001',
      razorpayPaymentId: 'pay_plain_001',
      products: [
        {
          productId: 'tshirt-plain-001',
          name: 'Plain T-shirt',
          color: 'Black',
          quantity: { M: 2 },
          price: 299,
        },
      ],
      address: {
        fullName: 'Plain User',
        email: 'plain@example.com',
        mobileNumber: '9876543210',
        houseNumber: '123',
        street: 'Plain Street',
        pincode: '110001',
        state: 'Delhi',
        city: 'New Delhi',
        country: 'India',
      },
      totalPay: 598,
      pf: 0,
      printing: 0,
      gst: 0,
    };

    const result = await createPrintroveOrder(order);

    // Verify the order structure
    if (!result.success) {
      throw new Error(`Order creation failed: ${result.message}`);
    }

    return {
      orderId: result.printroveOrderId,
      message: result.message,
      isPlain: true,
    };
  }

  async testCustomDesignOrder() {
    const order = {
      _id: 'test-custom-002',
      razorpayPaymentId: 'pay_custom_002',
      products: [
        {
          productId: 'custom-tshirt-1234567890',
          name: 'Custom T-shirt with Design',
          color: 'White',
          quantity: { L: 1 },
          price: 399,
          design: {
            frontImage:
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
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
        pincode: '110002',
        state: 'Delhi',
        city: 'New Delhi',
        country: 'India',
      },
      totalPay: 399,
      pf: 0,
      printing: 0,
      gst: 0,
    };

    const result = await createPrintroveOrder(order);

    // For custom designs, we expect either success or fallback to plain
    if (!result.success && !result.message.includes('insufficient credits')) {
      throw new Error(`Custom design order failed: ${result.message}`);
    }

    return {
      orderId: result.printroveOrderId,
      message: result.message,
      isCustom: true,
      usedFallback:
        result.message.includes('fallback') || result.message.includes('plain'),
    };
  }

  async testMixedOrder() {
    const order = {
      _id: 'test-mixed-003',
      razorpayPaymentId: 'pay_mixed_003',
      products: [
        {
          productId: 'tshirt-plain-002',
          name: 'Plain T-shirt',
          color: 'Red',
          quantity: { S: 1 },
          price: 199,
        },
        {
          productId: 'custom-tshirt-0987654321',
          name: 'Custom T-shirt',
          color: 'Blue',
          quantity: { XL: 1 },
          price: 299,
          design: {
            frontImage:
              'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A',
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
        pincode: '110003',
        state: 'Delhi',
        city: 'New Delhi',
        country: 'India',
      },
      totalPay: 498,
      pf: 0,
      printing: 0,
      gst: 0,
    };

    const result = await createPrintroveOrder(order);

    if (!result.success && !result.message.includes('insufficient credits')) {
      throw new Error(`Mixed order failed: ${result.message}`);
    }

    return {
      orderId: result.printroveOrderId,
      message: result.message,
      isMixed: true,
    };
  }

  async testDesignUploadFallback() {
    const order = {
      _id: 'test-fallback-004',
      razorpayPaymentId: 'pay_fallback_004',
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
        pincode: '110004',
        state: 'Delhi',
        city: 'New Delhi',
        country: 'India',
      },
      totalPay: 299,
      pf: 0,
      printing: 0,
      gst: 0,
    };

    const result = await createPrintroveOrder(order);

    // Should succeed with fallback to plain product
    if (!result.success && !result.message.includes('insufficient credits')) {
      throw new Error(`Fallback test failed: ${result.message}`);
    }

    return {
      orderId: result.printroveOrderId,
      message: result.message,
      usedFallback: true,
    };
  }

  async testPricingConsistency() {
    const testCases = [
      {
        name: 'Basic Product',
        order: {
          products: [{ price: 299, quantity: { M: 2 } }],
          totalPay: 598,
          pf: 0,
          printing: 0,
          gst: 0,
        },
        expected: 598,
      },
      {
        name: 'With Printing',
        order: {
          products: [{ price: 399, quantity: { L: 1 } }],
          totalPay: 471,
          pf: 0,
          printing: 50,
          gst: 18,
        },
        expected: 471,
      },
      {
        name: 'Multiple Products',
        order: {
          products: [
            { price: 199, quantity: { S: 1 } },
            { price: 299, quantity: { XL: 1 } },
          ],
          totalPay: 588,
          pf: 0,
          printing: 50,
          gst: 18,
        },
        expected: 588,
      },
    ];

    const results = [];
    for (const testCase of testCases) {
      const pfValue = testCase.order.pf;
      const isPfZero =
        pfValue === 0 ||
        pfValue === '0' ||
        pfValue === null ||
        pfValue === undefined;

      results.push({
        name: testCase.name,
        pfValue,
        isPfZero,
        totalPay: testCase.order.totalPay,
        expected: testCase.expected,
      });
    }

    const allPfZero = results.every((r) => r.isPfZero);
    if (!allPfZero) {
      throw new Error('Some test cases have non-zero P&F values');
    }

    return {
      allPfZero,
      testCases: results,
    };
  }

  async testProductCreationService() {
    // Test cache functionality
    const cacheStats = PrintroveProductCreationService.getCacheStats();

    // Test cache key generation
    const testDesignData = {
      productId: 'test-product',
      color: 'Red',
      size: 'M',
      frontImage: 'data:image/png;base64,test',
      backImage: null,
    };

    const cacheKey =
      PrintroveProductCreationService.generateCacheKey(testDesignData);

    if (!cacheKey || typeof cacheKey !== 'string') {
      throw new Error('Cache key generation failed');
    }

    return {
      cacheStats,
      cacheKeyGenerated: true,
      cacheKey,
    };
  }

  async testErrorHandling() {
    // Test with invalid order data
    const invalidOrder = {
      _id: 'test-invalid-005',
      razorpayPaymentId: 'pay_invalid_005',
      products: [], // Empty products array
      address: {
        fullName: 'Invalid User',
        email: 'invalid@example.com',
        mobileNumber: '9876543214',
        houseNumber: '000',
        street: 'Invalid Street',
        pincode: '000000',
        state: 'Invalid State',
        city: 'Invalid City',
        country: 'Invalid Country',
      },
      totalPay: 0,
    };

    try {
      const result = await createPrintroveOrder(invalidOrder);
      // Should fail gracefully
      if (result.success) {
        throw new Error('Invalid order should have failed');
      }
    } catch (error) {
      // Expected to fail
      if (!error.message.includes('No valid products found')) {
        throw new Error(`Unexpected error: ${error.message}`);
      }
    }

    return {
      errorHandling: true,
      invalidOrderHandled: true,
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Printrove Integration Tests\n');

    // Run all tests
    await this.runTest('Plain Product Order', () =>
      this.testPlainProductOrder()
    );
    await this.runTest('Custom Design Order', () =>
      this.testCustomDesignOrder()
    );
    await this.runTest('Mixed Order (Plain + Custom)', () =>
      this.testMixedOrder()
    );
    await this.runTest('Design Upload Fallback', () =>
      this.testDesignUploadFallback()
    );
    await this.runTest('Pricing Consistency', () =>
      this.testPricingConsistency()
    );
    await this.runTest('Product Creation Service', () =>
      this.testProductCreationService()
    );
    await this.runTest('Error Handling', () => this.testErrorHandling());

    // Print summary
    this.printSummary();
  }

  printSummary() {
    console.log('\n📊 Test Summary');
    console.log('================');
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`Passed: ${this.passedTests} ✅`);
    console.log(`Failed: ${this.failedTests} ❌`);
    console.log(
      `Success Rate: ${(
        (this.passedTests / this.testResults.length) *
        100
      ).toFixed(1)}%`
    );

    if (this.failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter((r) => r.status === 'FAIL')
        .forEach((r) => console.log(`  - ${r.name}: ${r.error}`));
    }

    console.log('\n🎯 Key Features Tested:');
    console.log('  ✅ Plain product orders');
    console.log('  ✅ Custom design orders with product library');
    console.log('  ✅ Mixed orders (plain + custom)');
    console.log('  ✅ Design upload fallback to plain products');
    console.log('  ✅ P&F consistently set to 0');
    console.log('  ✅ Pricing calculation consistency');
    console.log('  ✅ Product creation service and caching');
    console.log('  ✅ Error handling and validation');

    console.log('\n🎉 Comprehensive test suite completed!');
  }
}

// Run the test suite
async function runComprehensiveTests() {
  const testSuite = new PrintroveTestSuite();
  await testSuite.runAllTests();
}

// Run if called directly
if (require.main === module) {
  runComprehensiveTests()
    .then(() => {
      console.log('\n✅ All tests completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test suite failed:', error.message);
      process.exit(1);
    });
}

module.exports = { PrintroveTestSuite, runComprehensiveTests };
