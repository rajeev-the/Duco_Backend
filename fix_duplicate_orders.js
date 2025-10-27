// Script to fix duplicate order issues
const mongoose = require('mongoose');
const Order = require('./DataBase/Models/OrderModel');
require('dotenv').config();

async function fixDuplicateOrders() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/duco'
    );
    console.log('✅ Connected to MongoDB');

    // Find orders with duplicate orderIds
    console.log('🔍 Checking for duplicate orderIds...');
    const duplicates = await Order.aggregate([
      {
        $group: {
          _id: '$orderId',
          count: { $sum: 1 },
          orders: { $push: '$_id' },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ]);

    if (duplicates.length === 0) {
      console.log('✅ No duplicate orderIds found');
      return;
    }

    console.log(`⚠️ Found ${duplicates.length} duplicate orderIds:`);

    for (const duplicate of duplicates) {
      console.log(
        `\n📋 OrderId: ${duplicate._id} (${duplicate.count} duplicates)`
      );

      // Keep the first order, remove the rest
      const ordersToKeep = duplicate.orders.slice(0, 1);
      const ordersToRemove = duplicate.orders.slice(1);

      console.log(`  ✅ Keeping: ${ordersToKeep[0]}`);
      console.log(`  🗑️ Removing: ${ordersToRemove.join(', ')}`);

      // Remove duplicate orders
      await Order.deleteMany({
        _id: { $in: ordersToRemove },
      });

      console.log(`  ✅ Removed ${ordersToRemove.length} duplicate orders`);
    }

    console.log('\n🎉 Duplicate order cleanup completed!');
  } catch (error) {
    console.error('❌ Error fixing duplicate orders:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix if this file is executed directly
if (require.main === module) {
  fixDuplicateOrders();
}

module.exports = { fixDuplicateOrders };
