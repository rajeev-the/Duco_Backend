/**
 * Printrove Product Creation Service
 * Handles design uploads and product information for Printrove orders
 * Updated to follow Printrove API documentation exactly
 */

const axios = require('axios');

class PrintroveProductCreationService {
  constructor() {
    this.baseURL = 'https://api.printrove.com/api/external';
    this.cache = new Map();
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Upload a design to Printrove Design Library
   * @param {string} imageData - Base64 image data or URL
   * @param {string} name - Design name
   * @param {string} token - Printrove auth token
   * @returns {Promise<Object>} Uploaded design data
   */
  async uploadDesign(imageData, name, token) {
    try {
      console.log(`📤 Uploading design: ${name}`);

      // Check if it's a URL or base64 data
      const isUrl = imageData.startsWith('http');

      let response;
      if (isUrl) {
        // Upload using URL
        response = await axios.post(
          `${this.baseURL}/designs/url`,
          {
            url: imageData,
            name: name,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
      } else {
        // Upload using base64 data - convert to proper file format
        const FormData = require('form-data');
        const form = new FormData();

        // Convert base64 to buffer
        const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Create a proper file object
        form.append('file', buffer, {
          filename: `${name}.png`,
          contentType: 'image/png',
        });
        form.append('name', name);

        response = await axios.post(`${this.baseURL}/designs`, form, {
          headers: {
            Authorization: `Bearer ${token}`,
            ...form.getHeaders(),
          },
        });
      }

      if (response.data && response.data.design) {
        console.log(
          `✅ Design uploaded successfully: ${response.data.design.id}`
        );
        return response.data.design;
      } else {
        throw new Error('Invalid response from Printrove design upload');
      }
    } catch (error) {
      console.error('❌ Design upload error:', error.message);
      if (error.response) {
        console.error('❌ Response data:', error.response.data);
        console.error('❌ Response status:', error.response.status);
      }
      throw error;
    }
  }

  /**
   * Get or create a product for an order item
   * @param {Object} orderItem - Order item data
   * @param {string} token - Printrove auth token
   * @returns {Promise<Object>} Product/variant information
   */
  async getOrCreateProduct(orderItem, token) {
    const { ducoProductId, color, size, design } = orderItem;

    // For custom t-shirts with designs
    if (
      ducoProductId &&
      ducoProductId.toString().startsWith('custom-tshirt-') &&
      design
    ) {
      try {
        // Upload designs and return design info for order
        return await this.processCustomDesign(
          {
            ducoProductId,
            color,
            size,
            design,
          },
          token
        );
      } catch (error) {
        console.warn(
          `⚠️ Custom design processing failed, falling back to plain: ${error.message}`
        );
        // Fallback to plain product
        return {
          productId: 462,
          variantId: null, // Will be resolved by variant lookup
          isPlain: true,
          sku: `Plain-${ducoProductId}-${color}-${size}`,
        };
      }
    }

    // For other products, return basic info for variant lookup
    return {
      productId: ducoProductId,
      variantId: null,
      isPlain: !design,
      sku: `${ducoProductId}-${color}-${size}`,
    };
  }

  /**
   * Process custom design by uploading to Design Library
   * @param {Object} productInfo - Product information
   * @param {string} token - Printrove auth token
   * @returns {Promise<Object>} Design information for order
   */
  async processCustomDesign(productInfo, token) {
    const { ducoProductId, color, size, design } = productInfo;

    console.log(`🎨 Processing custom design: ${ducoProductId}`);

    // Upload designs to Printrove Design Library
    let designObject = {};

    try {
      // Upload front design if present
      if (design?.frontImage) {
        console.log(`📤 Uploading front design: ${ducoProductId}`);
        const frontDesign = await this.uploadDesign(
          design.frontImage,
          `Custom Design Front - ${ducoProductId}`,
          token
        );
        designObject.front = {
          id: frontDesign.id,
          dimensions: {
            width: 3000,
            height: 3000,
            top: 10,
            left: 50,
          },
        };
      }

      // Upload back design if present
      if (design?.backImage) {
        console.log(`📤 Uploading back design: ${ducoProductId}`);
        const backDesign = await this.uploadDesign(
          design.backImage,
          `Custom Design Back - ${ducoProductId}`,
          token
        );
        designObject.back = {
          id: backDesign.id,
          dimensions: {
            width: 3000,
            height: 3000,
            top: 10,
            left: 50,
          },
        };
      }

      // Get a valid product ID for orders (not from catalog)
      let validProductId = 462; // Use the correct product ID for orders

      try {
        const productsResponse = await axios.get(`${this.baseURL}/products`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (
          productsResponse.data &&
          productsResponse.data.products &&
          productsResponse.data.products.length > 0
        ) {
          // Find a t-shirt product
          const tshirtProduct = productsResponse.data.products.find(
            (p) =>
              p.name &&
              (p.name.toLowerCase().includes('t-shirt') ||
                p.name.toLowerCase().includes('tshirt') ||
                p.name.toLowerCase().includes('shirt'))
          );

          if (tshirtProduct) {
            validProductId = tshirtProduct.id;
            console.log(
              `✅ Found valid product: ${tshirtProduct.name} (ID: ${validProductId})`
            );
          } else {
            // Use first available product
            validProductId = productsResponse.data.products[0].id;
            console.log(
              `⚠️ Using first available product: ${productsResponse.data.products[0].name} (ID: ${validProductId})`
            );
          }
        }
      } catch (fetchError) {
        console.warn(
          `⚠️ Could not fetch products, using default: ${validProductId}`
        );
      }

      // For custom designs, we'll use the design directly in the order
      // without creating a product in the Product Library
      console.log(`🎨 Using design directly in order for: ${ducoProductId}`);

      return {
        productId: validProductId,
        variantId: null, // Will be resolved by variant lookup
        isPlain: Object.keys(designObject).length === 0,
        sku: `Custom-${ducoProductId}-${color}-${size}`,
        design: designObject, // Include design object for order
        designIds: {
          front: designObject.front?.id,
          back: designObject.back?.id,
        },
      };
    } catch (error) {
      console.error(
        `❌ Design processing failed for ${ducoProductId}:`,
        error.message
      );
      if (error.response) {
        console.error('❌ Response data:', error.response.data);
        console.error('❌ Response status:', error.response.status);
      }
      throw error;
    }
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }
}

module.exports = new PrintroveProductCreationService();
