const express = require("express");
const bcrypt = require("bcrypt");
const EmployeesAcc = require("./DataBase/Models/EmployessAcc");

const app = express();
const conntectDb = require("./DataBase/DBConnection");
const cors = require("cors");

const UserRoute = require("./Router/userRoute.js");
const ProdcutsRoute = require("./Router/ProdcutsRoute");
const SubCategoryRoute = require("./Router/SubcatogryRoutes.js");
const CategoryRoute = require("./Router/CategoryRoute.js");
const MoneyRoute = require("./Router/MoneyRoute.js");
const ImageKitRoute = require("./Router/imagekit.js");
const DesignRoute = require("./Router/DesignRoutes.js");
const paymentRoute = require("./Router/paymentRoutes.js");
const completedorderRoutes = require("./Router/CompletedOrderRoutes.js");
const orderRoutes = require("./Router/orderRoutes.js");
const analytics = require("./Router/analytics");
const { router } = require("./Router/DataRoutes.js");
const InvoiceRoutes = require("./Router/InvoiceRoutes.js");
const BannerRoutes = require("./Router/BannerRoutes.js");
const wallet = require("./Router/walletRoutes.js");

require('dotenv').config();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));
app.use(cors());

conntectDb();

app.get('/', (req, res) => {
  res.send("hello");
});

app.use('/user', UserRoute);
app.use('/products', ProdcutsRoute);
app.use("/subcategory", SubCategoryRoute);
app.use("/category", CategoryRoute);
app.use("/money", MoneyRoute);
app.use('/api/imagekit', ImageKitRoute);
app.use('/api', DesignRoute);
app.use("/api/payment", paymentRoute);
app.use("/api", completedorderRoutes);
app.use("/api", orderRoutes);
app.use("/api", analytics);
app.use("/api", require("./Router/LogisticsRoutes"));
app.use("/api", require("./Router/chargePlanRoutes"));
app.use("/api", require("./Router/bankDetails"));
app.use("/api", require("./Router/employeesRoutes.js"));
app.use("/api", BannerRoutes);
app.use("/data", router);
app.use("/api", InvoiceRoutes);
app.use("/api", wallet);

// Updated admin login route to use db + bcrypt
app.post("/api/admin/check", async (req, res) => {
  const { userid, password } = req.body || {};

  if (!userid || !password) {
    return res.status(400).json({ ok: false, message: 'userid and password are required' });
  }

  try {
    const user = await EmployeesAcc.findOne({ employeeid: userid });
    if (!user) {
      return res.status(401).json({ ok: false, message: "Invalid credentials" });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (ok) {
      return res.status(200).json({ ok: true, message: "Admin authenticated" });
    } else {
      return res.status(401).json({ ok: false, message: "Invalid credentials" });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});


app.listen(port, () => {
  console.log("Connected Express");
});
