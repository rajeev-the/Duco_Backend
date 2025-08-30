const EmployeesAcc = require("../DataBase/Models/EmployessAcc");

/** Create */
exports.createEmployeeAcc = async (req, res) => {
  try {
    const doc = await EmployeesAcc.create(req.body);
    // Hide password in response
    const obj = doc.toObject();
    delete obj.password;
    res.status(201).json(obj);
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ error: "Employee with this url + employeeid already exists" });
    }
    res.status(400).json({ error: err.message });
  }
};

/** Get all (optional filters by url/employeeid) */
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

/** Get one by _id */
exports.getEmployeeAccById = async (req, res) => {
  try {
    const doc = await EmployeesAcc.findById(req.params.id).select("-password");
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/** Update by _id */
exports.updateEmployeeAcc = async (req, res) => {
  try {
    // prevent changing the unique pair to a duplicate without catching it
    const doc = await EmployeesAcc.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select("-password");

    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ error: "Employee with this url + employeeid already exists" });
    }
    res.status(400).json({ error: err.message });
  }
};

/** Auth check:   employeeid + password => { ok: true/false } */
exports.checkEmployeeLogin = async (req, res) => {
  try {
    const { employeeid, password } = req.body;
    if ( !employeeid || !password) {
      return res.status(400).json({ ok: false, error: "Missing credentials" });
    }

    // fetch one with these creds
    const user = await EmployeesAcc.findOne({ employeeid });
    if (!user) return res.json({ ok: false });

    // plain-text compare (add bcrypt later if you wish)
    const ok = user.password === password;
    res.json({ ok , url:user.url});
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
};
