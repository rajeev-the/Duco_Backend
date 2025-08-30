const mongoose = require("mongoose");

const EmployeesAccSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    employeeid: { type: String, required: true, trim: true },
    password: { type: String, required: true }, // plain for now (hash later if you want)
    employeesdetails: {
      name: { type: String, trim: true },
      email: { type: String, trim: true },
      role: { type: String, trim: true },
    },
    employeesNote: { type: String, trim: true },
  },
  { timestamps: true }
);

// (url, employeeid) should be unique pair
EmployeesAccSchema.index({ url: 1, employeeid: 1 }, { unique: true });

module.exports = mongoose.model("EmployeesAcc", EmployeesAccSchema);
