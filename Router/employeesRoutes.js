const express = require("express");
const router = express.Router();
const {
  createEmployeeAcc,
  getEmployeesAcc,
  getEmployeeAccById,
  updateEmployeeAcc,
  checkEmployeeLogin,
} = require("../Controller/employeesAccController");

// Create
router.post("/employeesacc", createEmployeeAcc);

// Get all (filterable with ?url=&employeeid=)
router.get("/employeesacc", getEmployeesAcc);

// Get one by id
router.get("/employeesacc/:id", getEmployeeAccById);

// Update by id
router.patch("/employeesacc/:id", updateEmployeeAcc);

// Auth check: returns { ok: true/false }
router.post("/employeesacc/login", checkEmployeeLogin);

module.exports = router;
