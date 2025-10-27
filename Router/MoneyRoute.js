const express = require('express')
const router = express.Router();
const {createOrUpdatePriceEntry,getUpdatePricesByLocation,getAllPrices} = require('../Controller/price_calc.js');


router.post('/get_location_increase',getUpdatePricesByLocation);
router.post('/create_location_price_increase',createOrUpdatePriceEntry);
router.get("/get_money",getAllPrices)

module.exports = router;