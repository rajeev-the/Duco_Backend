const express = require("express")

const  router = express.Router();

const {CreateProdcuts ,GetProducts,GetProductssingle,GetProductsSubcategory,updateProduct ,deleteProduct} = require("../Controller/ProdcutsController")



router.post('/create',CreateProdcuts)
router.get("/get",GetProducts)
router.get("/get/:prodcutsid",GetProductssingle)
router.get("/getsub/:idsub",GetProductsSubcategory)
router.put("/update/:productId",updateProduct)
router.delete("/deleted/:productId",deleteProduct)




module.exports = router