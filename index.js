// server.js (or app.js)
const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
require('dotenv').config();

//this is for fast loading of backend files...
const compression = require('compression');

const EmployeesAcc = require('./DataBase/Models/EmployessAcc');
const conntectDb = require('./DataBase/DBConnection');

// Routers
const UserRoute = require('./Router/userRoute.js');
const ProdcutsRoute = require('./Router/ProdcutsRoute');
const SubCategoryRoute = require('./Router/SubcatogryRoutes.js');
const CategoryRoute = require('./Router/CategoryRoute.js');
const MoneyRoute = require('./Router/MoneyRoute.js');
const ImageKitRoute = require('./Router/imagekit.js');
const DesignRoute = require('./Router/DesignRoutes.js');
const paymentRoute = require('./Router/paymentRoutes.js');
const completedorderRoutes = require('./Router/CompletedOrderRoutes.js');
const orderRoutes = require('./Router/orderRoutes.js');
const analyticsRouter = require('./Router/analytics'); // exposes GET /sales
const { router: dataRouter } = require('./Router/DataRoutes.js');
const InvoiceRoutes = require('./Router/InvoiceRoutes.js');
const BannerRoutes = require('./Router/BannerRoutes.js');
const walletRoutes = require('./Router/walletRoutes.js');
const printroveRoutes = require('./Router/printroveRoutes.js');
const printroveMappingRoutes = require('./Router/printroveMappingRoutes.js');

// App + config
const app = express();
const port = process.env.PORT || 3000;

// If deploying behind a proxy (e.g., Render/Heroku), keep real IPs for rate/logging if you add later
app.set('trust proxy', 1);

app.use(compression()); //this is for compression

// Core middleware
app.use(cors()); // Allow all origins by default (tighten if needed)
app.use(express.json({ limit: '50mb' })); // Increased limit for design images
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Support URL-encoded data

// DB connect
conntectDb();

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'connected',
        printrove: 'unknown', // Will be updated by actual API call if needed
      },
    };

    // Check database connection
    try {
      const mongoose = require('mongoose');
      health.services.database =
        mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    } catch (error) {
      health.services.database = 'error';
    }

    // Check Printrove API (optional - only if needed)
    if (req.query.checkPrintrove === 'true') {
      try {
        const {
          testPrintroveConnection,
        } = require('./Controller/printroveHelper');
        const printroveStatus = await testPrintroveConnection();
        health.services.printrove = printroveStatus.success
          ? 'connected'
          : 'error';
        health.services.printroveDetails = printroveStatus;
      } catch (error) {
        health.services.printrove = 'error';
        health.services.printroveError = error.message;
      }
    }

    const statusCode = health.services.database === 'connected' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Root
app.get('/', (_req, res) => {
  res.send('hello');
});

// ======= Routes =======
app.use('/user', UserRoute);
app.use('/products', ProdcutsRoute);
app.use('/subcategory', SubCategoryRoute);
app.use('/category', CategoryRoute);
app.use('/money', MoneyRoute);

app.use('/api/imagekit', ImageKitRoute);
app.use('/api', DesignRoute);
app.use('/api/payment', paymentRoute);
app.use('/api', completedorderRoutes);
app.use('/api', orderRoutes);
app.use('/api/printrove', printroveRoutes);
app.use('/api/printrove-mapping', printroveMappingRoutes);

// 🔹 Analytics mounted on BOTH paths so both endpoints work:
//    - /api/analytics/sales
//    - /api/sales
app.use('/api/analytics', analyticsRouter);
app.use('/api', analyticsRouter);

app.use('/api', require('./Router/LogisticsRoutes'));
app.use('/api', require('./Router/chargePlanRoutes'));
app.use('/api', require('./Router/bankDetails'));
app.use('/api', require('./Router/employeesRoutes.js'));
app.use('/api', BannerRoutes);
app.use('/data', dataRouter);
app.use('/api', InvoiceRoutes);
app.use('/api', walletRoutes);

// ======= Admin login (bcrypt + DB) =======
app.post('/api/admin/check', async (req, res) => {
  const { userid, password } = req.body || {};

  if (!userid || !password) {
    return res
      .status(400)
      .json({ ok: false, message: 'userid and password are required' });
  }

  try {
    const user = await EmployeesAcc.findOne({ employeeid: userid });
    if (!user) {
      return res
        .status(401)
        .json({ ok: false, message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (ok) {
      return res.status(200).json({ ok: true, message: 'Admin authenticated' });
    }
    return res.status(401).json({ ok: false, message: 'Invalid credentials' });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// ======= 404 fallback (keep after all routes) =======
app.use((req, res, _next) => {
  res.status(404).json({ ok: false, message: 'Route not found' });
});

// ======= Minimal error handler =======
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res
    .status(err.status || 500)
    .json({ ok: false, message: err.message || 'Server error' });
});

// Start
app.listen(port, () => {
  console.log(`Connected Express on port ${port}`);
});
