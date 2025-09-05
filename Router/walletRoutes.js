const express = require("express");
const router = express.Router();
const {getWallet} = require("../Controller/walletController");

router.get("/wallet/:userId", getWallet);


module.exports = router;
