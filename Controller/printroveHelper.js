// controllers/printroveHelper.js
const axios = require("axios");
const { getPrintroveToken } = require("./printroveAuth");
require("dotenv").config();

/**
 * Axios instance for Printrove API with base URL.
 * It will automatically inject Authorization header when used inside functions below.
 */
const printrove = axios.create({
  baseURL: process.env.PRINTROVE_BASE_URL || "https://api.printrove.com/api",
  headers: { "Content-Type": "application/json" },
});

/**
 * ===============================================================
 * 🟢 CREATE ORDER ON PRINTROVE
 * Called automatically after /completeOrder
 * ===============================================================
 */
async function createPrintroveOrder(order) {
  const token = await getPrintroveToken();

  // --- Build the Printrove payload (per API documentation) ---
  const payload = {
    reference_number: order.razorpayPaymentId || order.orderId, // Unique order reference
    external_order_id: order.orderId, // Your internal order ID
    retail_price: Number(order.price) || 0, // Required
    cod: order.paymentmode?.toLowerCase() === "cod" ? true : false, // Prepaid / COD

    // ✅ Customer details
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

    // ✅ Product details
    order_products: (order.products || []).map((p) => ({
      product_id: Number(p.printroveProductId) || undefined, // Printrove Product ID
      variant_id: Number(p.printroveVariantId) || undefined, // Variant ID
      quantity:
        typeof p.quantity === "object"
          ? Object.values(p.quantity || {})[0] || 1
          : p.quantity || 1,
      is_plain: false, // Printed garment

      // ✅ Using URLs for now (you can replace with design IDs once uploaded)
      design: {
        front: {
          url: p.design?.frontImage || "",
          dimensions: {
            width: 10,
            height: 10,
            top: 5,
            left: 5,
          },
        },
        back: {
          url: p.design?.backImage || "",
          dimensions: {
            width: 10,
            height: 10,
            top: 5,
            left: 5,
          },
        },
      },
    })),

    payment_status: "paid",
    shipping_method: "standard",

    // ✅ Optional fields (leave blank for auto selection)
    courier_id: undefined,
    invoice_url: "",
  };

  console.log("🟡 Sending Printrove order payload:", JSON.stringify(payload, null, 2));

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

    if (err.response?.data?.errors) {
      console.error("🔍 Validation errors:", err.response.data.errors);
    }

    throw new Error("Printrove order creation failed");
  }
}

/**
 * ===============================================================
 * 🟣 FETCH ALL PRODUCTS FROM PRINTROVE CATALOG
 * ===============================================================
 */
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

/**
 * ===============================================================
 * 🟤 FETCH SINGLE PRODUCT DETAILS BY ID
 * ===============================================================
 */
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

module.exports = {
  createPrintroveOrder,
  listPrintroveProducts,
  getPrintroveProduct,
};
