// routes/logistics.js
const express = require("express");
const router = express.Router();
const {
  createLogistic,
  updateLogistic,
  getLogisticsByOrder,
  getLogisticById,
} = require("../Controller/logisticsController");

// Create
router.post("/logistic", createLogistic);

// Update by logistic _id
router.patch("/logistic/:id", updateLogistic);

// Get by Order ID
router.get("/logistic/order/:orderId", getLogisticsByOrder);

// (Optional) Get one by logistic _id
router.get("/logisticid/:id", getLogisticById);

module.exports = router;
