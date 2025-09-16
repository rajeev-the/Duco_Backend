const express = require('express')
const {CreateCatogry,getallCatgory ,getProductsByCategory} = require("../Controller/CategoryController")

const router = express.Router();


router.post("/create",CreateCatogry)
router.get("/getall",getallCatgory)
router.get("/get/:categoryId",getProductsByCategory)


module.exports = router;
