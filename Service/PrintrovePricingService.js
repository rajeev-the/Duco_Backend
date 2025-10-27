// Service for handling Printrove pricing calculations
const axios = require('axios');
const { getPrintroveToken } = require('../Controller/printroveAuth');

class PrintrovePricingService {
  constructor() {
    this.baseURL =
      process.env.PRINTROVE_BASE_URL || 'https://api.printrove.com/api';
  }

  /**
   * Get Printrove product pricing by variant ID
   * @param {number} variantId - Printrove variant ID
   * @returns {Promise<Object>} Pricing information
   */
  async getVariantPricing(variantId) {
    try {
      const token = await getPrintroveToken();

      const response = await axios.get(
        `${this.baseURL}/external/products/${variantId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );

      const product = response.data?.product;
      if (!product) {
        throw new Error('Product not found in Printrove response');
      }

      // Extract pricing information
      const pricing = {
        variantId: variantId,
        productId: product.id,
        productName: product.name,
        basePrice: product.price || 0,
        currency: 'INR',
        isAvailable: product.is_available || true,
        variants: product.variants || [],
      };

      console.log(`💰 Printrove pricing for variant ${variantId}:`, pricing);
      return pricing;
    } catch (error) {
      console.error(
        `❌ Error fetching Printrove pricing for variant ${variantId}:`,
        error.message
      );
      throw new Error(`Failed to fetch Printrove pricing: ${error.message}`);
    }
  }

  /**
   * Calculate total order cost using Printrove pricing
   * @param {Array} orderProducts - Array of order products
   * @returns {Promise<Object>} Total cost breakdown
   */
  async calculateOrderCost(orderProducts) {
    try {
      let totalCost = 0;
      const productCosts = [];

      for (const product of orderProducts) {
        const variantId = product.printroveVariantId || product.variant_id;
        if (!variantId) {
          console.warn('⚠️ No variant ID found for product:', product);
          continue;
        }

        try {
          const pricing = await this.getVariantPricing(variantId);
          const quantity = product.quantity || 1;
          const productTotal = pricing.basePrice * quantity;

          productCosts.push({
            variantId,
            productName: pricing.productName,
            basePrice: pricing.basePrice,
            quantity,
            total: productTotal,
          });

          totalCost += productTotal;
        } catch (error) {
          console.warn(
            `⚠️ Could not get pricing for variant ${variantId}:`,
            error.message
          );
          // Use fallback pricing
          const fallbackPrice = 499; // Default fallback price
          const quantity = product.quantity || 1;
          const productTotal = fallbackPrice * quantity;

          productCosts.push({
            variantId,
            productName: 'Unknown Product',
            basePrice: fallbackPrice,
            quantity,
            total: productTotal,
            isFallback: true,
          });

          totalCost += productTotal;
        }
      }

      const result = {
        totalCost: Math.round(totalCost),
        currency: 'INR',
        productCosts,
        productCount: productCosts.length,
      };

      console.log('💰 Printrove order cost calculation:', result);
      return result;
    } catch (error) {
      console.error(
        '❌ Error calculating Printrove order cost:',
        error.message
      );
      throw new Error(`Failed to calculate order cost: ${error.message}`);
    }
  }

  /**
   * Validate if retail price matches Printrove cost
   * @param {number} retailPrice - Retail price from frontend
   * @param {number} printroveCost - Cost from Printrove API
   * @param {number} tolerance - Tolerance percentage (default 10%)
   * @returns {Object} Validation result
   */
  validatePricing(retailPrice, printroveCost, tolerance = 10) {
    const difference = Math.abs(retailPrice - printroveCost);
    const percentageDiff = (difference / printroveCost) * 100;
    const isValid = percentageDiff <= tolerance;

    const result = {
      isValid,
      retailPrice,
      printroveCost,
      difference,
      percentageDiff: Math.round(percentageDiff * 100) / 100,
      tolerance,
      message: isValid
        ? 'Pricing is within acceptable range'
        : `Pricing difference too high: ${
            Math.round(percentageDiff * 100) / 100
          }% (max: ${tolerance}%)`,
    };

    console.log('🔍 Pricing validation:', result);
    return result;
  }
}

module.exports = new PrintrovePricingService();
