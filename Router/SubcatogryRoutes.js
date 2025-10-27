const express = require("express")
const {SubCreateCatogry,getallsubcategory,getSubcategoriesByCategoryId} = require("../Controller/CategoryController")

const router = express();

router.get("/getallsubctg",getallsubcategory)
router.post("/create",SubCreateCatogry)
router.get("/subcat/:categoryId",getSubcategoriesByCategoryId)






module.exports = router;