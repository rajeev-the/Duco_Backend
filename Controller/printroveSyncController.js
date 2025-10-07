// controllers/printroveController.js
const { listPrintroveProductsWithVariants } = require("./printroveHelper");

exports.syncPrintroveCatalog = async (req, res) => {
  try {
    const products = await listPrintroveProductsWithVariants();
    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("❌ Sync Printrove failed:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
