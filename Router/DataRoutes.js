const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const dataFile = path.join(__dirname, "../Data/data.json");

// Helper: read JSON
function readData() {
  if (!fs.existsSync(dataFile)) return {};
  const data = fs.readFileSync(dataFile, "utf8");
  return JSON.parse(data);
}

// Helper: write JSON
function writeData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), "utf8");
}

// READ (get full data)
router.get("/", (req, res) => {
  res.json(readData());
});

// UPDATE (replace or update fields)
router.put("/", (req, res) => {
  let currentData = readData();
  const updated = { ...currentData, ...req.body };
  writeData(updated);
  res.json(updated);
});

// RESET (reset to initial state)
router.post("/reset", (req, res) => {
  const initial = {
    company: {
      name: "",
      address: "",
      gstin: "",
      cin: "",
      email: "",
      pan: "",
      iec: "",
      gst: ""
    },
    invoice: {
      placeOfSupply: "",
      reverseCharge: false,
      copyType: "Original Copy"
    },
    terms: [""],
    forCompany: ""
  };

  writeData(initial);
  res.json(initial);
});

module.exports = router;
