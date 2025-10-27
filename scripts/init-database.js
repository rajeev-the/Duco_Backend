/**
 * Database Initialization Script
 * Sets up MongoDB database with proper indexes and initial data
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../DataBase/Models/UserModel');
const Order = require('../DataBase/Models/OrderModel');
const Product = require('../DataBase/Models/ProductsModel');
const Category = require('../DataBase/Models/Category');
const SubCategory = require('../DataBase/Models/subCategory');
const Design = require('../DataBase/Models/DesignModel');
const PrintroveMapping = require('../DataBase/Models/PrintroveMappingModel');

async function initializeDatabase() {
  try {
    console.log('🚀 Starting database initialization...');

    // Connect to MongoDB
    const mongoURI =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/duco-ecommerce';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Create indexes for better performance
    console.log('📊 Creating database indexes...');

    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ phone: 1 });
    await User.collection.createIndex({ createdAt: -1 });

    // Order indexes
    await Order.collection.createIndex({ orderId: 1 }, { unique: true });
    await Order.collection.createIndex({ razorpayPaymentId: 1 });
    await Order.collection.createIndex({ userId: 1 });
    await Order.collection.createIndex({ status: 1 });
    await Order.collection.createIndex({ createdAt: -1 });
    await Order.collection.createIndex({ 'address.pincode': 1 });

    // Product indexes
    await Product.collection.createIndex({ name: 'text', description: 'text' });
    await Product.collection.createIndex({ category: 1 });
    await Product.collection.createIndex({ subCategory: 1 });
    await Product.collection.createIndex({ price: 1 });
    await Product.collection.createIndex({ isActive: 1 });
    await Product.collection.createIndex({ createdAt: -1 });

    // Category indexes
    await Category.collection.createIndex({ name: 1 }, { unique: true });
    await Category.collection.createIndex({ isActive: 1 });

    // SubCategory indexes
    await SubCategory.collection.createIndex({ name: 1 });
    await SubCategory.collection.createIndex({ categoryId: 1 });
    await SubCategory.collection.createIndex({ isActive: 1 });

    // Design indexes
    await Design.collection.createIndex({ userId: 1 });
    await Design.collection.createIndex({ productId: 1 });
    await Design.collection.createIndex({ createdAt: -1 });

    // PrintroveMapping indexes
    await PrintroveMapping.collection.createIndex(
      { ducoProductId: 1 },
      { unique: true }
    );
    await PrintroveMapping.collection.createIndex({ printroveProductId: 1 });
    await PrintroveMapping.collection.createIndex({ printroveVariantId: 1 });

    console.log('✅ Database indexes created successfully');

    // Create default categories if they don't exist
    console.log('📁 Setting up default categories...');

    const defaultCategories = [
      {
        name: 'T-Shirts',
        description: 'Custom t-shirts and apparel',
        isActive: true,
      },
      {
        name: 'Hoodies',
        description: 'Custom hoodies and sweatshirts',
        isActive: true,
      },
      {
        name: 'Mugs',
        description: 'Custom mugs and drinkware',
        isActive: true,
      },
      {
        name: 'Accessories',
        description: 'Custom accessories and gifts',
        isActive: true,
      },
    ];

    for (const categoryData of defaultCategories) {
      const existingCategory = await Category.findOne({
        name: categoryData.name,
      });
      if (!existingCategory) {
        const category = new Category(categoryData);
        await category.save();
        console.log(`✅ Created category: ${categoryData.name}`);
      } else {
        console.log(`ℹ️ Category already exists: ${categoryData.name}`);
      }
    }

    // Create default subcategories
    console.log('📁 Setting up default subcategories...');

    const tshirtCategory = await Category.findOne({ name: 'T-Shirts' });
    if (tshirtCategory) {
      const tshirtSubcategories = [
        {
          name: 'Basic T-Shirts',
          categoryId: tshirtCategory._id,
          isActive: true,
        },
        {
          name: 'Premium T-Shirts',
          categoryId: tshirtCategory._id,
          isActive: true,
        },
        {
          name: 'V-Neck T-Shirts',
          categoryId: tshirtCategory._id,
          isActive: true,
        },
        { name: 'Polo Shirts', categoryId: tshirtCategory._id, isActive: true },
      ];

      for (const subcatData of tshirtSubcategories) {
        const existingSubcat = await SubCategory.findOne({
          name: subcatData.name,
          categoryId: subcatData.categoryId,
        });
        if (!existingSubcat) {
          const subcategory = new SubCategory(subcatData);
          await subcategory.save();
          console.log(`✅ Created subcategory: ${subcatData.name}`);
        }
      }
    }

    // Create sample products
    console.log('🛍️ Creating sample products...');

    const sampleProducts = [
      {
        name: 'Basic Cotton T-Shirt',
        description: 'High-quality cotton t-shirt perfect for custom designs',
        category: 'T-Shirts',
        subCategory: 'Basic T-Shirts',
        price: 299,
        originalPrice: 399,
        discount: 25,
        colors: ['White', 'Black', 'Red', 'Blue', 'Green'],
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        images: ['/images/tshirt-basic.jpg'],
        isActive: true,
        stock: 100,
        tags: ['cotton', 'basic', 'custom', 'tshirt'],
      },
      {
        name: 'Premium Cotton T-Shirt',
        description: 'Premium quality cotton t-shirt with soft feel',
        category: 'T-Shirts',
        subCategory: 'Premium T-Shirts',
        price: 499,
        originalPrice: 599,
        discount: 17,
        colors: ['White', 'Black', 'Navy', 'Gray'],
        sizes: ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
        images: ['/images/tshirt-premium.jpg'],
        isActive: true,
        stock: 50,
        tags: ['premium', 'cotton', 'soft', 'tshirt'],
      },
    ];

    for (const productData of sampleProducts) {
      const existingProduct = await Product.findOne({ name: productData.name });
      if (!existingProduct) {
        const product = new Product(productData);
        await product.save();
        console.log(`✅ Created product: ${productData.name}`);
      } else {
        console.log(`ℹ️ Product already exists: ${productData.name}`);
      }
    }

    // Create admin user if it doesn't exist
    console.log('👤 Setting up admin user...');

    const adminEmail = 'admin@duco.com';
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const adminUser = new User({
        name: 'Admin User',
        email: adminEmail,
        phone: '9999999999',
        password: 'admin123', // Change this in production
        role: 'admin',
        isActive: true,
        emailVerified: true,
      });

      await adminUser.save();
      console.log('✅ Created admin user');
    } else {
      console.log('ℹ️ Admin user already exists');
    }

    console.log('🎉 Database initialization completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Database indexes created');
    console.log('- Default categories and subcategories created');
    console.log('- Sample products created');
    console.log('- Admin user created');
    console.log('\n🚀 Your database is ready for use!');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('📤 Database connection closed');
  }
}

// Run initialization if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('✅ Database initialization script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database initialization script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
