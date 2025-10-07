// routes/printroveRoutes.js
const express = require("express");
const router = express.Router();
const { syncPrintroveCatalog } = require("../Controller/printroveSyncController");

router.get("/sync", syncPrintroveCatalog);

module.exports = router;
