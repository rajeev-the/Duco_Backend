const rawStore = require('../Data/data');

// kebab-case helper




const slugify = (str = '') =>
  str.toString().toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');

const resolveStore = (store) => store?.default ?? store?.data ?? store;

const getSKU = (product_type, color, size, gender) => {
  const store = resolveStore(rawStore);
  const typeKey = slugify(product_type);

  const productList = store?.[typeKey] ?? store?.[product_type];
  if (!Array.isArray(productList)) return null;

  const targetColor  = slugify(color);
  const targetGender = slugify(gender);
  const targetSize   = String(size || '').trim().toUpperCase();

  const result = productList.find((item) => {
    const itemColor  = slugify(item?.color ?? '');
    const itemGender = slugify(item?.gender ?? '');
    const parts = String(item?.sku ?? '').split('-');
    const itemSize = (parts[parts.length - 1] || '').trim().toUpperCase(); // handles S/M/L/XL/XXL/38 etc.

    return (
      itemColor === targetColor &&
      itemGender === targetGender &&
      itemSize === targetSize
    );
  });

  return result ? { sku: result.sku, description: result.product_description } : null;
};

module.exports = { getSKU };