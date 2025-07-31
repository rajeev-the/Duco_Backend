const express = require("express")

const  router = express.Router();

const {CreateProdcuts ,GetProducts,GetProductssingle,GetProductsSubcategory} = require("../Controller/ProdcutsController")



router.post('/create',CreateProdcuts)
router.get("/get",GetProducts)
router.get("/get/:prodcutsid",GetProductssingle)
router.get("/getsub/:idsub",GetProductsSubcategory)




module.exports = router