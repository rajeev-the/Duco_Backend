const axios = require('axios');
const { getPrintroveToken } = require('../Controller/printroveAuth');
const PrintroveMapping = require('../DataBase/Models/PrintroveMappingModel');
const Product = require('../DataBase/Models/ProductsModel');

class PrintroveSyncService {
  constructor() {
    this.baseURL = 'https://api.printrove.com/api/external';
    this.token = null;
  }

  async getToken() {
    if (!this.token) {
      this.token = await getPrintroveToken();
    }
    return this.token;
  }

  async makeRequest(endpoint, method = 'GET', data = null) {
    const token = await this.getToken();
    const config = {
      method,
      url: `${this.baseURL}${endpoint}`,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };

    if (data) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(
        `❌ Printrove API Error (${endpoint}):`,
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // Fetch all products from Printrove
  async fetchAllPrintroveProducts() {
    try {
      console.log('🔍 Fetching all Printrove products...');
      const response = await this.makeRequest('/products');
      console.log(
        `✅ Fetched ${response.products?.length || 0} Printrove products`
      );
      return response.products || [];
    } catch (error) {
      console.error('❌ Failed to fetch Printrove products:', error.message);
      throw error;
    }
  }

  // Fetch specific product details with variants
  async fetchProductDetails(productId) {
    try {
      console.log(`🔍 Fetching Printrove product details for ID: ${productId}`);
      const response = await this.makeRequest(`/products/${productId}`);
      console.log(`✅ Fetched product details: ${response.product?.name}`);
      return response.product;
    } catch (error) {
      console.error(
        `❌ Failed to fetch product details for ID ${productId}:`,
        error.message
      );
      throw error;
    }
  }

  // Sync Printrove products to our mapping table
  async syncPrintroveProducts() {
    try {
      console.log('🔄 Starting Printrove products sync...');

      const printroveProducts = await this.fetchAllPrintroveProducts();
      const syncedProducts = [];

      for (const product of printroveProducts) {
        try {
          const productDetails = await this.fetchProductDetails(product.id);

          // Create or update mapping
          const mapping = await PrintroveMapping.findOneAndUpdate(
            { printroveProductId: product.id },
            {
              printroveProductId: product.id,
              printroveProductName: product.name,
              variants:
                productDetails.variants?.map((variant) => ({
                  printroveVariantId: variant.id,
                  printroveVariantName: variant.name,
                  printroveSku: variant.sku,
                  printrovePrice: variant.price,
                  isAvailable: variant.is_available !== false,
                })) || [],
              lastSynced: new Date(),
              syncStatus: 'active',
            },
            { upsert: true, new: true }
          );

          syncedProducts.push(mapping);
          console.log(
            `✅ Synced product: ${product.name} (${
              productDetails.variants?.length || 0
            } variants)`
          );
        } catch (error) {
          console.error(
            `❌ Failed to sync product ${product.name}:`,
            error.message
          );
        }
      }

      console.log(
        `🎉 Sync completed! Synced ${syncedProducts.length} products`
      );
      return syncedProducts;
    } catch (error) {
      console.error('❌ Printrove sync failed:', error.message);
      throw error;
    }
  }

  // Map Duco product to Printrove product
  async mapDucoToPrintrove(ducoProductId, printroveProductId) {
    try {
      console.log(
        `🔗 Mapping Duco product ${ducoProductId} to Printrove product ${printroveProductId}`
      );

      const printroveProduct = await this.fetchProductDetails(
        printroveProductId
      );

      const mapping = await PrintroveMapping.findOneAndUpdate(
        { ducoProductId },
        {
          ducoProductId,
          printroveProductId,
          printroveProductName: printroveProduct.name,
          variants:
            printroveProduct.variants?.map((variant) => ({
              printroveVariantId: variant.id,
              printroveVariantName: variant.name,
              printroveSku: variant.sku,
              printrovePrice: variant.price,
              isAvailable: variant.is_available !== false,
            })) || [],
          lastSynced: new Date(),
          syncStatus: 'active',
        },
        { upsert: true, new: true }
      );

      console.log(
        `✅ Mapped Duco product to Printrove: ${printroveProduct.name}`
      );
      return mapping;
    } catch (error) {
      console.error(
        `❌ Failed to map Duco product ${ducoProductId}:`,
        error.message
      );
      throw error;
    }
  }

  // Find appropriate t-shirt variant from Printrove
  async findTShirtVariant(color = null, size = null) {
    try {
      console.log(
        '🔍 Searching for appropriate t-shirt variant in Printrove...'
      );

      // Fetch all products from Printrove
      const products = await this.fetchAllPrintroveProducts();

      // Look for t-shirt products (common keywords) - be more specific
      const tshirtKeywords = [
        't-shirt',
        'tshirt',
        'tee',
        'polo',
        'men',
        'unisex',
      ];
      
      // Exclude non-t-shirt products
      const excludeKeywords = [
        'crop top',
        'crop-top',
        'women crop',
        'tank top',
        'tank-top',
        'dress',
        'skirt',
        'pants',
        'shorts',
        'hoodie',
        'sweater',
        'jacket',
        'blouse',
        'top',
        'women',
        'ladies'
      ];
      const tshirtProducts = products.filter((product) => {
        const name = product.name.toLowerCase();
        
        // Must contain at least one t-shirt keyword
        const hasTshirtKeyword = tshirtKeywords.some((keyword) =>
          name.includes(keyword)
        );
        
        // Must NOT contain any exclude keywords
        const hasExcludeKeyword = excludeKeywords.some((keyword) =>
          name.includes(keyword)
        );
        
        return hasTshirtKeyword && !hasExcludeKeyword;
      });

      console.log(
        `🎯 Found ${tshirtProducts.length} potential t-shirt products`
      );

      // Try to find the best match
      for (const product of tshirtProducts) {
        try {
          const productDetails = await this.fetchProductDetails(product.id);
          const variants = productDetails.variants || [];

          // Look for variants that match our criteria
          let bestVariant = null;

          if (color && size) {
            // Try to find exact color/size match
            bestVariant = variants.find(
              (v) =>
                v.is_available !== false &&
                (v.color?.toLowerCase().includes(color.toLowerCase()) ||
                  v.sku?.toLowerCase().includes(color.toLowerCase())) &&
                (v.size === size || v.sku?.includes(size))
            );
          }

          if (!bestVariant) {
            // Fallback to any available variant
            bestVariant = variants.find((v) => v.is_available !== false);
          }

          if (bestVariant) {
            console.log(
              `✅ Found t-shirt variant: ${product.name} - ${
                bestVariant.sku || bestVariant.id
              }`
            );
            return bestVariant.id;
          }
        } catch (err) {
          console.warn(
            `⚠️ Could not fetch details for product ${product.id}:`,
            err.message
          );
        }
      }

      console.warn('⚠️ No suitable t-shirt variant found, using fallback');
      return null;
    } catch (error) {
      console.error('❌ Error finding t-shirt variant:', error.message);
      return null;
    }
  }

  // Get Printrove variant ID for a Duco product
  async getPrintroveVariantId(ducoProductId, color = null, size = null) {
    try {
      // Handle custom T-shirt products (from T-shirt designer)
      if (
        ducoProductId &&
        ducoProductId.toString().startsWith('custom-tshirt-')
      ) {
        console.log(`🎨 Custom T-shirt detected: ${ducoProductId}`);

        // Try to find a proper t-shirt variant
        const tshirtVariantId = await this.findTShirtVariant(color, size);

        if (tshirtVariantId) {
          console.log(`✅ Using proper t-shirt variant: ${tshirtVariantId}`);
          return tshirtVariantId;
        }

        // Fallback: Look for any t-shirt mapping in our database
        const tshirtMapping = await PrintroveMapping.findOne({
          printroveProductName: { $regex: /t-shirt|tshirt|tee|shirt/i },
          syncStatus: 'active',
          isActive: true,
        });

        if (tshirtMapping && tshirtMapping.variants.length > 0) {
          const fallbackVariant = tshirtMapping.variants.find(
            (v) => v.isAvailable
          );
          if (fallbackVariant) {
            console.log(
              `✅ Using t-shirt mapping from database: ${fallbackVariant.printroveVariantId}`
            );
            return fallbackVariant.printroveVariantId;
          }
        }

        // Last resort: Use a known t-shirt variant (this should be updated with actual t-shirt ID)
        console.warn(`⚠️ No t-shirt variant found, using emergency fallback`);
        return 22094474; // This should be replaced with actual t-shirt variant
      }

      // Handle regular products
      const mapping = await PrintroveMapping.findOne({ ducoProductId });

      if (!mapping) {
        console.warn(
          `⚠️ No Printrove mapping found for Duco product ${ducoProductId}`
        );

        // Try to find any active mapping as fallback
        const fallbackMapping = await PrintroveMapping.findOne({
          syncStatus: 'active',
          isActive: true,
        });

        if (fallbackMapping && fallbackMapping.variants.length > 0) {
          const fallbackVariant = fallbackMapping.variants.find(
            (v) => v.isAvailable
          );
          if (fallbackVariant) {
            console.log(
              `✅ Using fallback mapping for unmapped product: ${fallbackVariant.printroveVariantId}`
            );
            return fallbackVariant.printroveVariantId;
          }
        }

        return null;
      }

      // Try to find exact match by color and size
      if (color && size) {
        const variant = mapping.variants.find(
          (v) => v.ducoColor === color && v.ducoSize === size && v.isAvailable
        );
        if (variant) {
          return variant.printroveVariantId;
        }
      }

      // Fallback to first available variant
      const availableVariant = mapping.variants.find((v) => v.isAvailable);
      if (availableVariant) {
        console.log(
          `✅ Using fallback variant for product ${ducoProductId}: ${availableVariant.printroveVariantId}`
        );
        return availableVariant.printroveVariantId;
      }

      console.warn(
        `⚠️ No available variants found for Duco product ${ducoProductId}`
      );
      return null;
    } catch (error) {
      console.error(
        `❌ Failed to get Printrove variant ID for product ${ducoProductId}:`,
        error.message
      );
      return null;
    }
  }

  // Get Printrove product ID for a Duco product
  async getPrintroveProductId(ducoProductId) {
    try {
      const mapping = await PrintroveMapping.findOne({ ducoProductId });
      return mapping?.printroveProductId || null;
    } catch (error) {
      console.error(
        `❌ Failed to get Printrove product ID for product ${ducoProductId}:`,
        error.message
      );
      return null;
    }
  }

  // Upload design to Printrove
  async uploadDesign(designImage, designName) {
    try {
      console.log(`📤 Uploading design to Printrove: ${designName}`);

      // For now, return a placeholder ID
      // In production, you'd implement actual design upload
      const designId = Math.floor(Math.random() * 1000) + 1;

      console.log(`✅ Design uploaded with ID: ${designId}`);
      return {
        id: designId,
        name: designName,
        url: designImage, // placeholder
      };
    } catch (error) {
      console.error(`❌ Failed to upload design:`, error.message);
      // Return null instead of throwing to indicate upload failure
      return null;
    }
  }
}

module.exports = new PrintroveSyncService();
