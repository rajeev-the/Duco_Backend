const bcrypt = require("bcrypt");
const EmployeesAcc = require("../DataBase/Models/EmployessAcc");

exports.createEmployeeAcc = async (req, res) => {
  try {
    req.body.password = await bcrypt.hash(req.body.password, 10);
    const doc = await EmployeesAcc.create(req.body);
    const obj = doc.toObject();
    delete obj.password;
    res.status(201).json(obj);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Employee with this url + employeeid already exists" });
    }
    res.status(400).json({ error: err.message });
  }
};

exports.getEmployeesAcc = async (req, res) => {
  try {
    const { url, employeeid } = req.query;
    const query = {};
    if (url) query.url = url;
    if (employeeid) query.employeeid = employeeid;
    const docs = await EmployeesAcc.find(query).select("-password").sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getEmployeeAccById = async (req, res) => {
  try {
    const doc = await EmployeesAcc.findById(req.params.id).select("-password");
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateEmployeeAcc = async (req, res) => {
  try {
    if (req.body.password) req.body.password = await bcrypt.hash(req.body.password, 10);
    const doc = await EmployeesAcc.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select("-password");
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Employee with this url + employeeid already exists" });
    }
    res.status(400).json({ error: err.message });
  }
};

exports.checkEmployeeLogin = async (req, res) => {
  try {
    const { employeeid, password } = req.body;
    if (!employeeid || !password) {
      return res.status(400).json({ ok: false, error: "Missing credentials" });
    }
    const user = await EmployeesAcc.findOne({ employeeid });
    if (!user) return res.json({ ok: false });
    const ok = await bcrypt.compare(password, user.password);
    res.json({ ok, url: user.url });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
};

exports.resetEmployeePassword = async (req, res) => {
  try {
    const { employeeid, newPassword, confirmPassword } = req.body;
    if (!employeeid || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }
    const user = await EmployeesAcc.findOne({ employeeid });
    if (!user) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
