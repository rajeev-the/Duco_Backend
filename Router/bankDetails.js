const express = require("express");
const router = express.Router();
const {
  createBankDetails,
  getBankDetails,
  updateBankDetails,
} = require("../Controller/bankDetailsController");

// Create new details
router.post("/bankdetails", createBankDetails);

// Get all details
router.get("/bankdetails", getBankDetails);

// Update details by ID
router.patch("/bankdetails/:id", updateBankDetails);

module.exports = router;
