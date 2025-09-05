const express = require("express")

const  router = express.Router();

const {CreateProdcuts ,GetProducts,GetProductssingle,GetProductsSubcategory,updateProduct} = require("../Controller/ProdcutsController")



router.post('/create',CreateProdcuts)
router.get("/get",GetProducts)
router.get("/get/:prodcutsid",GetProductssingle)
router.get("/getsub/:idsub",GetProductsSubcategory)
router.put("/update/:productId",updateProduct)
router.delete("/deleted/:productId",updateProduct)




module.exports = router