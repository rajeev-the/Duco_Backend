const express = require('express');
const router = express.Router();
const data = require('../Data/data');

// Helper to slugify strings (kebab-case, lowercase)
const slugify = (str = '') =>
  str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')          // Replace spaces with -
    .replace(/[^\w\-]+/g, '')      // Remove all non-word chars
    .replace(/\-\-+/g, '-');       // Replace multiple - with single -

// GET /api/sku?product_type=classic_crew_t_Shirt&color=White&size=M&gender=Male
router.get('/', (req, res) => {
  const { product_type, color, size, gender } = req.query; // ✅ Use query for GET method

  if (!product_type || !data[product_type]) {
    return res.status(400).json({ error: 'Invalid or missing product_type' });
  }

  const productList = data[product_type];
  const sizeRegex = new RegExp(`-${size}$`, 'i');

  const targetColor = slugify(color);
  const targetGender = slugify(gender);

  const result = productList.find((item) => {
    return (
      slugify(item.color) === targetColor &&
      slugify(item.gender) === targetGender &&
      sizeRegex.test(item.sku)
    );
  });

  if (!result) {
    return res.status(404).json({ error: 'SKU not found for the given parameters' });
  }

  res.json({ sku: result.sku, description: result.product_description });
});

module.exports = router;
