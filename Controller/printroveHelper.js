// controllers/printroveHelper.js
const axios = require("axios");
const { getPrintroveToken } = require("./printroveAuth");
require("dotenv").config();

// ✅ Initialize Axios instance
const printrove = axios.create({
  baseURL: process.env.PRINTROVE_BASE_URL || "https://api.printrove.com/v1", // ✅ updated base URL
  headers: { "Content-Type": "application/json" },
});

/* -------------------------------------------------------------------------- */
/* 🟢 CREATE ORDER (Corrected Format for Printrove API v1)                    */
/* -------------------------------------------------------------------------- */
async function createPrintroveOrder(order) {
  const token = await getPrintroveToken();
  const o = order.toObject ? order.toObject() : order;

  // ✅ Build Printrove-compliant payload
  const payload = {
    reference_number: o.razorpayPaymentId || o.orderId || `ORD-${Date.now()}`, // Ensure reference_number is added
    cod: false, // ✅ added - default false since prepaid unless COD enabled
    courier_id: 1, // ✅ added - default courier
    shipping_method: "standard",
    payment_status: "paid",
    retail_price: Number(o.price) || 0, // ✅ added - overall order retail price

    // ✅ corrected customer structure (was order_to)
    customer: {
      name: o.address?.fullName || o.address?.name || "Duco Customer",
      email: o.address?.email || "noemail@duco.com",
      phone: o.address?.mobileNumber || o.address?.phone || "9999999999",
      address_line_1: `${o.address?.houseNumber || ""}, ${o.address?.street || ""}, ${o.address?.landmark || ""}`.trim(),
      city: o.address?.city || "New Delhi",
      state: o.address?.state || "Delhi",
      pincode: o.address?.pincode || o.address?.postalCode || "110019",
    },

    // ✅ renamed from order_products to order_items per Printrove docs
    order_items: (o.products || []).map((p) => {
      const qty =
        typeof p.quantity === "object"
          ? Object.values(p.quantity || {}).reduce(
              (a, b) => a + Number(b || 0),
              0
            )
          : Number(p.quantity) || 1;

      // ✅ Corrected design object structure per Printrove requirements
      const designObj = {
        front: p.design?.frontImage
          ? { print_file: p.design.frontImage }
          : undefined,
        back: p.design?.backImage
          ? { print_file: p.design.backImage }
          : undefined,
      };

      return {
        product_id: Number(p.printroveProductId),
        variant_id: Number(p.printroveVariantId),
        quantity: qty,
        retail_price: Number(p.price) || 0, // ✅ added - required by Printrove
        design: designObj, // ✅ new correct format instead of array
      };
    }),
  };

  // ✅ Updated log for clarity
  console.log("📦 Final Printrove Payload:", JSON.stringify(payload, null, 2));

  try {
    // ✅ using the configured printrove axios instance and correct /external/orders endpoint
    const res = await printrove.post("/external/orders", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Printrove order created successfully:", res.data);
    return res.data;
  } catch (err) {
    console.error("❌ Error creating Printrove order:", err.response?.data || err.message);
    throw new Error("Printrove order creation failed");
  }
}

/* -------------------------------------------------------------------------- */
/* 🟣 FETCH ALL PRINTROVE PRODUCTS                                            */
/* -------------------------------------------------------------------------- */
async function listPrintroveProducts() {
  const token = await getPrintroveToken();
  try {
    const res = await printrove.get("/external/products", {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("✅ Printrove Products fetched:", res.data?.products?.length || 0);
    return res.data;
  } catch (err) {
    console.error(
      "❌ Failed to fetch Printrove products:",
      err.response?.data || err.message
    );
    throw new Error("Failed to fetch Printrove products");
  }
}

/* -------------------------------------------------------------------------- */
/* 🟤 FETCH SINGLE PRODUCT (variants)                                         */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/* 🟠 COMBINED: PRODUCT + VARIANTS                                            */
/* -------------------------------------------------------------------------- */
async function listPrintroveProductsWithVariants() {
  const baseList = await listPrintroveProducts();
  const products = baseList?.products || [];
  const detailed = [];

  for (const p of products) {
    try {
      const detail = await getPrintroveProduct(p.id);

      console.log(
        `🧩 Printrove Product ${p.id} example variant:`,
        detail?.product?.variants?.[0]
      );

      detailed.push({
        id: p.id,
        name: p.name,
        variants:
          detail?.product?.variants?.map((v) => ({
            id: v.id,
            color:
              v.color ||
              v.product?.color ||
              v.attributes?.color ||
              (v.sku && v.sku.split(" ")[1]) ||
              "",
            size:
              v.size ||
              v.product?.size ||
              v.attributes?.size ||
              (v.sku && v.sku.split(" ")[2]) ||
              "",
            mockup_front: v.mockup?.front_mockup || "",
            mockup_back: v.mockup?.back_mockup || "",
          })) || [],
      });
    } catch (err) {
      console.warn(`⚠️ Could not fetch variants for product ${p.id}`);
      detailed.push({ id: p.id, name: p.name, variants: [] });
    }
  }

  return detailed;
}

/* -------------------------------------------------------------------------- */
/* ✅ EXPORT MODULES                                                          */
/* -------------------------------------------------------------------------- */
module.exports = {
  createPrintroveOrder,
  listPrintroveProducts,
  getPrintroveProduct,
  listPrintroveProductsWithVariants,
};
