const express = require("express");
const router = express.Router();
const {
  createBankDetails,
  getBankDetails,
  updateBankDetails,
  deleteBankDetails,
} = require("../Controller/bankDetailsController");

// Create new details
router.post("/bankdetails", createBankDetails);

// Get all details
router.get("/bankdetails", getBankDetails);

// Update details by ID
router.patch("/bankdetails/:id", updateBankDetails);

//Delete details by id
router.delete("/bankdetails/:id", deleteBankDetails);

module.exports = router;