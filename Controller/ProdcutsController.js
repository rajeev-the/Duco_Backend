const Product = require('../DataBase/Models/ProductsModel')


const CreateProdcuts = async (req, res) => {
  try {
    const {
      products_name,
      image_url,     // should contain color, colorcode, url[], videolink, and content[]
      pricing,       // array of quantity/price_per/discount
      Desciptions,   // array of strings
      subcategory    // ObjectId of subcategory
    } = req.body;

    // Validate essential fields (optional)
    if (!products_name || !image_url || !pricing || !Desciptions || !subcategory) {
      return res.status(400).send({ message: "All required fields must be provided" });
    }

    const product = new Product({
      products_name,
      image_url,
      pricing,
      Desciptions,
      subcategory
      // Stock will be auto-calculated via pre("save") hook
    });

    const savedProduct = await product.save();

    return res.status(201).send({
      message: "Product created successfully",
      product: savedProduct
    });

  } catch (error) {
    console.error(`❌ Error creating product: ${error.message}`);
    return res.status(500).send({ message: "Server error while creating product" });
  }
};

const GetProducts = async (req, res) => {
  try {
    const data = await Product.find(); // fetch all products
    res.status(200).json(data); // return with status 200
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const GetProductssingle = async (req, res) => {
  const {prodcutsid} = req.params
  try {
    const data = await Product.findById(prodcutsid); // fetch all products
    res.status(200).json(data); // return with status 200
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const GetProductsSubcategory = async (req, res) => {

      const {idsub} = req.params

  try {
    const data = await Product.find({subcategory:idsub}); // fetch all products
    res.status(200).json(data); // return with status 200
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



module.exports = {
    CreateProdcuts,
    GetProducts,
    GetProductssingle,
    GetProductsSubcategory
}