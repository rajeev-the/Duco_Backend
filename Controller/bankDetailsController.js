// controllers/bankDetailsController.js
const BankDetails = require("../DataBase/Models/BankDetails"); // adjust path as needed

// Create bank details
exports.createBankDetails = async (req, res) => {
  try {
    const newDetails = new BankDetails(req.body);
    const savedDetails = await newDetails.save();
    res.status(201).json({ success: true, data: savedDetails });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get all bank details
exports.getBankDetails = async (req, res) => {
  try {
    const details = await BankDetails.find();
    res.status(200).json({ success: true, data: details });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update bank details by ID
exports.updateBankDetails = async (req, res) => {
  try {
    const updatedDetails = await BankDetails.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedDetails) {
      return res.status(404).json({ success: false, message: "Details not found" });
    }

    res.status(200).json({ success: true, data: updatedDetails });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
