const { listPrintroveProducts } = require("./printroveHelper");
const Product = require("../DataBase/Models/ProductsModel");

exports.syncPrintroveCatalog = async (req, res) => {
  try {
    const data = await listPrintroveProducts();
    const products = data?.products || [];

    // Optionally: Save to your own "PrintroveProducts" collection if you want to show them in admin
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
