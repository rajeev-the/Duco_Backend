// controllers/printroveHelper.js
const axios = require("axios");
const { getPrintroveToken } = require("./printroveAuth");
require("dotenv").config();

// ✅ Initialize Axios instance
const printrove = axios.create({
  baseURL: process.env.PRINTROVE_BASE_URL || "https://api.printrove.com/api",
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
    shipping_method: "standard",
    payment_status: "paid",
    order_to: {
      name: o.address?.fullName || o.address?.name || "Duco Customer",
      email: o.address?.email || "noemail@duco.com",
      address: `${o.address?.houseNumber || ""}, ${o.address?.street || ""}`,
      city: o.address?.city || "New Delhi",
      state: o.address?.state || "Delhi",
      pincode: o.address?.pincode || o.address?.postalCode || "110019",
      phone: o.address?.mobileNumber || o.address?.phone || "9999999999",
    },
    order_products: (o.products || []).map((p) => {
      const qty =
        typeof p.quantity === "object"
          ? Object.values(p.quantity || {}).reduce(
              (a, b) => a + Number(b || 0),
              0
            )
          : Number(p.quantity) || 1;

      // ✅ Correct design object per Printrove docs
      const designs = [];
      if (p.design?.frontImage) {
        designs.push({
          print_file: p.design.frontImage,
          print_area: "front",
        });
      }
      if (p.design?.backImage) {
        designs.push({
          print_file: p.design.backImage,
          print_area: "back",
        });
      }
      console.log(`this is the payload: ${payload}`)
      return {
        product_id: Number(p.printroveProductId),
        variant_id: Number(p.printroveVariantId),
        quantity: qty,
        design: designs,
      };
    }),
  };

  console.log("📦 Sending payload to Printrove:", JSON.stringify(payload, null, 2));

  try {
    const res = await axios.post("https://api.printrove.com/api/external/orders", payload, {
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
