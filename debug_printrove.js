// Debug script for Printrove integration
const {
  createPrintroveOrder,
  listPrintroveProducts,
  testPrintroveConnection,
} = require('./Controller/printroveHelper');
const PrintroveSyncService = require('./Service/PrintroveSyncService');

async function debugPrintroveIntegration() {
  console.log('🔍 Starting Printrove integration debug...\n');

  try {
    // Test connection
    console.log('1. Testing Printrove connection...');
    const connectionTest = await testPrintroveConnection();
    console.log('Connection test result:', connectionTest);
    console.log('');

    // List products
    console.log('2. Fetching Printrove products...');
    const products = await listPrintroveProducts();
    console.log(`Found ${products?.products?.length || 0} products`);

    // Show first few products
    if (products?.products?.length > 0) {
      console.log('First 5 products:');
      products.products.slice(0, 5).forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name} (ID: ${p.id})`);
      });
    }
    console.log('');

    // Test t-shirt variant finding
    console.log('3. Testing t-shirt variant finding...');
    const tshirtVariant = await PrintroveSyncService.findTShirtVariant(
      'blue',
      'M'
    );
    console.log(`Found t-shirt variant: ${tshirtVariant}`);
    console.log('');

    // Test custom t-shirt mapping
    console.log('4. Testing custom t-shirt mapping...');
    const customTshirtVariant =
      await PrintroveSyncService.getPrintroveVariantId(
        'custom-tshirt-1760479480303',
        'blue',
        'M'
      );
    console.log(`Custom t-shirt variant: ${customTshirtVariant}`);
    console.log('');

    console.log('✅ Debug completed successfully!');
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error(error.stack);
  }
}

// Run the debug if this file is executed directly
if (require.main === module) {
  debugPrintroveIntegration();
}

module.exports = { debugPrintroveIntegration };
