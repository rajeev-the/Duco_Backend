const express = require('express');
const Banner = require("../DataBase/Models/BannerModel");

const router = express.Router();

// 📌 CREATE a new banner
router.post("/banners", async (req, res) => {
  try {
    const { link, link2 } = req.body;

    if (!link || typeof link !== "string" || !link2 || typeof link2 !== "string") {
      return res.status(400).json({ 
        error: "Fields 'link' and 'link2' are required and must be strings" 
      });
    }

    const banner = await Banner.create({ link, link2 });
    return res.status(201).json({ success: true, banner });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 📌 READ all banners
router.get("/banners", async (req, res) => {
  try {
    const banners = await Banner.find();
    return res.json({ success: true, banners });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 📌 UPDATE a banner by ID
router.put("/banners/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { link, link2 } = req.body;

    if (!link || typeof link !== "string" || !link2 || typeof link2 !== "string") {
      return res.status(400).json({ 
        error: "Fields 'link' and 'link2' are required and must be strings" 
      });
    }

    const banner = await Banner.findByIdAndUpdate(
      id,
      { link, link2 },
      { new: true, runValidators: true }
    );

    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    return res.json({ success: true, banner });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
