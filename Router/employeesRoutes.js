const express = require("express");
const router = express.Router();
const {
  createEmployeeAcc,
  getEmployeesAcc,
  getEmployeeAccById,
  updateEmployeeAcc,
  checkEmployeeLogin,
  resetEmployeePassword,
} = require("../Controller/employeesAccController");

router.post("/employeesacc", createEmployeeAcc);

router.get("/employeesacc", getEmployeesAcc);

router.get("/employeesacc/:id", getEmployeeAccById);

router.patch("/employeesacc/:id", updateEmployeeAcc);

router.post("/employeesacc/login", checkEmployeeLogin);

router.post("/employeesacc/reset-password", resetEmployeePassword);

module.exports = router;
