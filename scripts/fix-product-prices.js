/**
 * Fix Product Prices
 * Updates product prices to realistic values for testing
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import the Product model
const Product = require('../DataBase/Models/ProductsModel');

async function fixProductPrices() {
  try {
    console.log('🚀 Fixing product prices...');

    // Connect to MongoDB
    const mongoURI =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/duco-ecommerce';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Get all products
    const products = await Product.find({});
    console.log(`📦 Found ${products.length} products`);

    let updatedCount = 0;

    for (const product of products) {
      let needsUpdate = false;
      const updateData = {};

      // Fix pricing array
      if (
        product.pricing &&
        Array.isArray(product.pricing) &&
        product.pricing.length > 0
      ) {
        const pricing = product.pricing[0];
        if (pricing.price_per && pricing.price_per < 100) {
          // Set realistic prices based on product type
          let newPrice = 299; // Default price

          if (product.products_name?.toLowerCase().includes('premium')) {
            newPrice = 499;
          } else if (product.products_name?.toLowerCase().includes('basic')) {
            newPrice = 199;
          } else if (product.products_name?.toLowerCase().includes('polo')) {
            newPrice = 399;
          } else if (product.products_name?.toLowerCase().includes('hoodie')) {
            newPrice = 799;
          } else if (product.products_name?.toLowerCase().includes('mug')) {
            newPrice = 199;
          }

          updateData.pricing = [
            {
              ...pricing,
              price_per: newPrice,
            },
          ];
          needsUpdate = true;
          console.log(
            `💰 Updating ${product.products_name}: ₹${pricing.price_per} → ₹${newPrice}`
          );
        }
      } else {
        // Create pricing if missing
        updateData.pricing = [
          {
            price_per: 299,
            original_price: 399,
            discount: 25,
          },
        ];
        needsUpdate = true;
        console.log(`💰 Adding pricing to ${product.products_name}: ₹299`);
      }

      // Update product if needed
      if (needsUpdate) {
        await Product.findByIdAndUpdate(product._id, updateData);
        updatedCount++;
      }
    }

    console.log(`\n🎉 Price fixing completed!`);
    console.log(`📊 Updated ${updatedCount} products`);
  } catch (error) {
    console.error('❌ Price fixing failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('📤 Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  fixProductPrices()
    .then(() => {
      console.log('✅ Product price fixing completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Product price fixing failed:', error.message);
      process.exit(1);
    });
}

module.exports = { fixProductPrices };
