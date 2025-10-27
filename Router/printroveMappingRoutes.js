const express = require('express');
const router = express.Router();
const PrintroveSyncService = require('../Service/PrintroveSyncService');
const PrintroveMapping = require('../DataBase/Models/PrintroveMappingModel');
const Product = require('../DataBase/Models/ProductsModel');

// ✅ Sync all Printrove products
router.post('/sync-products', async (req, res) => {
  try {
    console.log('🔄 Starting Printrove products sync...');
    const syncedProducts = await PrintroveSyncService.syncPrintroveProducts();

    res.json({
      success: true,
      message: `Successfully synced ${syncedProducts.length} products`,
      data: syncedProducts,
    });
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ Get all Duco products without Printrove mapping
router.get('/unmapped-products', async (req, res) => {
  try {
    const products = await Product.find({});
    const mappedProductIds = await PrintroveMapping.distinct('ducoProductId');

    const unmappedProducts = products.filter(
      (product) => !mappedProductIds.includes(product._id.toString())
    );

    res.json({
      success: true,
      data: unmappedProducts.map((p) => ({
        _id: p._id,
        products_name: p.products_name,
        gender: p.gender,
        image_url: p.image_url?.slice(0, 1), // First image only
      })),
    });
  } catch (error) {
    console.error('❌ Failed to get unmapped products:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ Get all Printrove products
router.get('/printrove-products', async (req, res) => {
  try {
    const printroveProducts =
      await PrintroveSyncService.fetchAllPrintroveProducts();

    res.json({
      success: true,
      data: printroveProducts.map((p) => ({
        id: p.id,
        name: p.name,
        product: p.product,
      })),
    });
  } catch (error) {
    console.error('❌ Failed to get Printrove products:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ Map Duco product to Printrove product
router.post('/map-product', async (req, res) => {
  try {
    const { ducoProductId, printroveProductId } = req.body;

    if (!ducoProductId || !printroveProductId) {
      return res.status(400).json({
        success: false,
        error: 'ducoProductId and printroveProductId are required',
      });
    }

    const mapping = await PrintroveSyncService.mapDucoToPrintrove(
      ducoProductId,
      printroveProductId
    );

    res.json({
      success: true,
      message: 'Product mapped successfully',
      data: mapping,
    });
  } catch (error) {
    console.error('❌ Failed to map product:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ Get all mappings
router.get('/mappings', async (req, res) => {
  try {
    const mappings = await PrintroveMapping.find({})
      .populate('ducoProductId', 'products_name gender image_url')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: mappings,
    });
  } catch (error) {
    console.error('❌ Failed to get mappings:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ Update variant mapping for specific color/size
router.put('/mappings/:mappingId/variants', async (req, res) => {
  try {
    const { mappingId } = req.params;
    const { ducoColor, ducoSize, printroveVariantId } = req.body;

    const mapping = await PrintroveMapping.findById(mappingId);
    if (!mapping) {
      return res.status(404).json({
        success: false,
        error: 'Mapping not found',
      });
    }

    // Find existing variant or create new one
    const existingVariant = mapping.variants.find(
      (v) => v.ducoColor === ducoColor && v.ducoSize === ducoSize
    );

    if (existingVariant) {
      existingVariant.printroveVariantId = printroveVariantId;
    } else {
      mapping.variants.push({
        ducoColor,
        ducoSize,
        printroveVariantId,
        isAvailable: true,
      });
    }

    await mapping.save();

    res.json({
      success: true,
      message: 'Variant mapping updated successfully',
      data: mapping,
    });
  } catch (error) {
    console.error('❌ Failed to update variant mapping:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ Delete mapping
router.delete('/mappings/:mappingId', async (req, res) => {
  try {
    const { mappingId } = req.params;

    await PrintroveMapping.findByIdAndDelete(mappingId);

    res.json({
      success: true,
      message: 'Mapping deleted successfully',
    });
  } catch (error) {
    console.error('❌ Failed to delete mapping:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ Create default mapping for testing
router.post('/create-default-mapping', async (req, res) => {
  try {
    // Get the first Duco product
    const firstProduct = await Product.findOne({});
    if (!firstProduct) {
      return res.status(404).json({
        success: false,
        error: 'No Duco products found',
      });
    }

    // Get the first Printrove product
    const printroveProducts =
      await PrintroveSyncService.fetchAllPrintroveProducts();
    if (!printroveProducts || printroveProducts.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No Printrove products found',
      });
    }

    const firstPrintroveProduct = printroveProducts[0];
    const printroveProductDetails =
      await PrintroveSyncService.fetchProductDetails(firstPrintroveProduct.id);

    // Create default mapping
    const mapping = await PrintroveMapping.findOneAndUpdate(
      { ducoProductId: firstProduct._id },
      {
        ducoProductId: firstProduct._id,
        printroveProductId: firstPrintroveProduct.id,
        printroveProductName: firstPrintroveProduct.name,
        variants:
          printroveProductDetails.variants?.map((variant) => ({
            printroveVariantId: variant.id,
            printroveVariantName: variant.name,
            printroveSku: variant.sku,
            printrovePrice: variant.price,
            isAvailable: variant.is_available !== false,
            ducoColor: '#000000', // Default color
            ducoSize: 'M', // Default size
          })) || [],
        lastSynced: new Date(),
        syncStatus: 'active',
        isActive: true,
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Default mapping created successfully',
      data: mapping,
    });
  } catch (error) {
    console.error('❌ Failed to create default mapping:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
