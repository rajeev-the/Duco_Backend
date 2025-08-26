router.post("/banners", async (req, res) => {
  try {
    const { link } = req.body;
    if (!link || typeof link !== "string") {
      return res.status(400).json({ error: "Field 'link' is required and must be a string" });
    }

    const banner = await Banner.create({ link });
    return res.status(201).json({ success: true, banner });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 📌 READ all banners
// GET /api/banners
router.get("/banners", async (req, res) => {
  try {
    const banners = await Banner.find();
    return res.json({ success: true, banners });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 📌 UPDATE a banner by ID
// PUT /api/banners/:id   { link: "new-link.png" }
router.put("/banners/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { link } = req.body;

    if (!link || typeof link !== "string") {
      return res.status(400).json({ error: "Field 'link' is required and must be a string" });
    }

    const banner = await Banner.findByIdAndUpdate(
      id,
      { link },
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
