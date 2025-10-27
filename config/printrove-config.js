/**
 * Printrove Configuration
 * Centralized configuration for Printrove integration
 */

const config = {
  // API Configuration
  api: {
    baseURL: process.env.PRINTROVE_BASE_URL || 'https://api.printrove.com/api',
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
  },

  // Product Configuration
  products: {
    // Default parent product IDs for different product types
    parentProducts: {
      tshirt: 462, // Default t-shirt product ID
      hoodie: 123, // Add more as needed
      mug: 456, // Add more as needed
    },

    // Default variant ID fallbacks
    fallbackVariants: {
      tshirt: 22094474, // Update with valid variant ID
      hoodie: 22094475, // Add more as needed
      mug: 22094476, // Add more as needed
    },
  },

  // Design Configuration
  design: {
    // Default design dimensions
    dimensions: {
      width: 3000,
      height: 3000,
      top: 10,
      left: 50,
    },

    // Supported image formats
    supportedFormats: ['png', 'jpg', 'jpeg', 'gif', 'webp'],

    // Max file size (in bytes)
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },

  // Pricing Configuration
  pricing: {
    // P&F settings (set to 0 for testing)
    packagingAndForwarding: {
      enabled: false, // Set to true for production
      perUnit: 0, // Set actual value for production
      flat: 0, // Set actual value for production
    },

    // GST settings
    gst: {
      enabled: true,
      defaultRate: 18, // 18%
    },

    // Printing settings
    printing: {
      enabled: true,
      perUnit: 0, // Set actual value for production
      perSide: 0, // Set actual value for production
    },
  },

  // Cache Configuration
  cache: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    maxSize: 1000, // Maximum number of cached items
  },

  // Error Handling Configuration
  errorHandling: {
    // Retry configuration
    retry: {
      maxAttempts: 3,
      delay: 1000, // 1 second
      backoffMultiplier: 2,
    },

    // Fallback configuration
    fallback: {
      usePlainProduct: true, // Fallback to plain product on design failure
      useDefaultVariant: true, // Use default variant on mapping failure
    },
  },

  // Logging Configuration
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    includePayload: process.env.NODE_ENV !== 'production',
    includeResponse: process.env.NODE_ENV !== 'production',
  },

  // Testing Configuration
  testing: {
    // Use mock responses in test environment
    useMockResponses: process.env.NODE_ENV === 'test',

    // Test data configuration
    testData: {
      validVariantId: 22094474, // Update with valid test variant ID
      validProductId: 462, // Update with valid test product ID
    },
  },
};

module.exports = config;
