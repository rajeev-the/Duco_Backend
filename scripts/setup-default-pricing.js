/**
 * Setup Default Pricing Data
 * Creates default pricing configuration for all locations
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import the Money model
const Money = require('../DataBase/Models/MoneyModel');

async function setupDefaultPricing() {
  try {
    console.log('🚀 Setting up default pricing data...');

    // Connect to MongoDB
    const mongoURI =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/duco-ecommerce';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Default pricing data for different locations
    const defaultPricingData = [
      {
        location: 'Asia',
        price_increase: 0, // No markup for Asia
        currency: {
          country: 'India',
          toconvert: 1, // 1:1 conversion
        },
      },
      {
        location: 'North America',
        price_increase: 20, // 20% markup for North America
        currency: {
          country: 'United States',
          toconvert: 0.012, // 1 INR = 0.012 USD (approximate)
        },
      },
      {
        location: 'Europe',
        price_increase: 15, // 15% markup for Europe
        currency: {
          country: 'United Kingdom',
          toconvert: 0.0095, // 1 INR = 0.0095 GBP (approximate)
        },
      },
      {
        location: 'Australia',
        price_increase: 18, // 18% markup for Australia
        currency: {
          country: 'Australia',
          toconvert: 0.018, // 1 INR = 0.018 AUD (approximate)
        },
      },
    ];

    // Clear existing pricing data
    await Money.deleteMany({});
    console.log('🗑️ Cleared existing pricing data');

    // Insert default pricing data
    for (const pricingData of defaultPricingData) {
      const money = new Money(pricingData);
      await money.save();
      console.log(
        `✅ Created pricing for ${pricingData.location}: ${pricingData.price_increase}% markup, ${pricingData.currency.toconvert} conversion rate`
      );
    }

    console.log('\n🎉 Default pricing data setup completed!');
    console.log('\n📋 Summary:');
    console.log('- Asia: 0% markup, 1:1 conversion');
    console.log('- North America: 20% markup, 0.012 conversion');
    console.log('- Europe: 15% markup, 0.0095 conversion');
    console.log('- Australia: 18% markup, 0.018 conversion');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('📤 Database connection closed');
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDefaultPricing()
    .then(() => {
      console.log('✅ Default pricing setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Default pricing setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { setupDefaultPricing };
