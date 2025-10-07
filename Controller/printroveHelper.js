// controllers/printroveHelper.js
const axios = require("axios");
const { getPrintroveToken } = require("./printroveAuth");
require("dotenv").config();

const printrove = axios.create({
  baseURL: process.env.PRINTROVE_BASE_URL || "https://api.printrove.com/api",
  headers: { "Content-Type": "application/json" },
});

/* ---------------------- 🟢 CREATE ORDER ---------------------- */
async function createPrintroveOrder(order) {
  const token = await getPrintroveToken();

  const payload = {
    reference_number: order.razorpayPaymentId || order.orderId,
    external_order_id: order.orderId,
    retail_price: Number(order.price) || 0,
    cod: order.paymentmode?.toLowerCase() === "cod",
    customer: {
      name: order.address?.fullName?.slice(0, 50) || "Duco Customer",
      email: order.address?.email || "noemail@duco.com",
      number: parseInt(order.address?.mobileNumber || "9999999999"),
      address1: order.address?.houseNumber?.slice(0, 50) || "Address Line 1",
      address2: order.address?.street?.slice(0, 50) || "Address Line 2",
      address3: order.address?.landmark?.slice(0, 50) || "",
      city: order.address?.city || "New Delhi",
      state: order.address?.state || "Delhi",
      country: order.address?.country || "India",
      pincode: order.address?.pincode || "110019",
    },
    order_products: (order.products || []).map((p) => ({
      product_id: Number(p.printroveProductId),
      variant_id: Number(p.printroveVariantId),
      quantity:
        typeof p.quantity === "object"
          ? Object.values(p.quantity || {})[0] || 1
          : p.quantity || 1,
      is_plain: false,
      design: {
        front: {
          url: p.design?.frontImage || "",
          dimensions: { width: 10, height: 10, top: 5, left: 5 },
        },
        back: {
          url: p.design?.backImage || "",
          dimensions: { width: 10, height: 10, top: 5, left: 5 },
        },
      },
    })),
    payment_status: "paid",
    shipping_method: "standard",
  };

  console.log(
    "🟡 Sending Printrove order payload:",
    JSON.stringify(payload, null, 2)
  );

  try {
    const res = await printrove.post("/external/orders", payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("✅ Printrove Order Created:", res.data);
    return res.data;
  } catch (err) {
    console.error(
      "❌ Error creating Printrove order:",
      err.response?.data || err.message
    );
    throw new Error("Printrove order creation failed");
  }
}

/* ---------------------- 🟣 FETCH ALL PRODUCTS ---------------------- */
async function listPrintroveProducts() {
  const token = await getPrintroveToken();
  try {
    const res = await printrove.get("/external/products", {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(
      "✅ Printrove Products fetched:",
      res.data?.products?.length || 0
    );
    return res.data;
  } catch (err) {
    console.error(
      "❌ Failed to fetch Printrove products:",
      err.response?.data || err.message
    );
    throw new Error("Failed to fetch Printrove products");
  }
}

/* ---------------------- 🟤 FETCH SINGLE PRODUCT (variants) ---------------------- */
async function getPrintroveProduct(productId) {
  const token = await getPrintroveToken();
  try {
    const res = await printrove.get(`/external/products/${productId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`✅ Printrove Product (${productId}) fetched successfully.`);
    return res.data;
  } catch (err) {
    console.error(
      "❌ Failed to fetch Printrove product:",
      err.response?.data || err.message
    );
    throw new Error("Failed to fetch Printrove product");
  }
}

/* ---------------------- 🟠 COMBINED: PRODUCT + VARIANTS ---------------------- */
async function listPrintroveProductsWithVariants() {
  const baseList = await listPrintroveProducts();
  const products = baseList?.products || [];

  const detailed = [];
  for (const p of products) {
    try {
      const detail = await getPrintroveProduct(p.id);
      detailed.push({
        id: p.id,
        name: p.name,
        variants:
          detail?.product?.variants?.map((v) => ({
            id: v.id,
            color: v.color,
            size: v.size,
          })) || [],
      });
    } catch (err) {
      console.warn(`⚠️ Could not fetch variants for product ${p.id}`);
      detailed.push({ id: p.id, name: p.name, variants: [] });
    }
  }

  return detailed;
}

module.exports = {
  createPrintroveOrder,
  listPrintroveProducts,
  getPrintroveProduct,
  listPrintroveProductsWithVariants,
};
