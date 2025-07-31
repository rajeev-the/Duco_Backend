const express = require('express')
const {CreateCatogry,getallCatgory} = require("../Controller/CategoryController")

const router = express.Router();


router.post("/create",CreateCatogry)
router.get("/getall",getallCatgory)


module.exports = router;
