const Product = require('../DataBase/Models/ProductsModel')


const CreateProdcuts = async (req, res) => {
  try {
    const {
      products_name,
      image_url,
      pricing,
      Desciptions,
      subcategory,
      gender = "Male", // Default to Male if not provided
    } = req.body;

    if (!products_name || !image_url || !pricing || !Desciptions || !subcategory) {
      return res.status(400).send({ message: "All required fields must be provided" });
    }

    const product = new Product({
      products_name,
      image_url,
      pricing,
      Desciptions,
      subcategory,
      gender, // Now included
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


const deleteProduct = async (req, res) => {
 
  const productId = req.params.productId || req.params.prodcutsid;

  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: 'Invalid product id' });
  }

  try {
   

    const deleted = await Product.findByIdAndDelete(productId);
    if (!deleted) {
      return res.status(404).json({ message: 'Product not found' });
    }

   

    return res.status(200).json({
      message: 'Product deleted successfully',
      product: deleted,
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
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


// PUT /api/products/:id
const updateProduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    const updates = req.body;

    // Optional: Validate ObjectId
    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    // Optional: Recalculate Stock if image_url/content is provided
    if (updates.image_url) {
      let total = 0;
      updates.image_url.forEach((img) => {
        if (Array.isArray(img.content)) {
          img.content.forEach((item) => {
            total += item.minstock || 0;
          });
        }
      });
      updates.Stock = total;
    }

    const updatedProduct = await Product.findByIdAndUpdate(productId, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json({ message: 'Product updated successfully', product: updatedProduct });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Server error' });
  }
};





module.exports = {
    CreateProdcuts,
    GetProducts,
    GetProductssingle,
    GetProductsSubcategory,
    updateProduct,
    deleteProduct
}