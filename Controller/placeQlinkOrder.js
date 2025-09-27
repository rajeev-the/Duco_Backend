const axios = require("axios");
const { getSKU } = require("./getsku");
const { getAccessToken } = require("./qikinkHelper");

const QIKINK_ORDER_URL = "https://sandbox.qikink.com/api/order/create";

// Map your view -> Qikink placement_sku
const VIEW_TO_PLACEMENT = {
  front: "fr",
  back: "bk",
  left: "lf",
  right: "rt",
};

module.exports = async function placeQikinkOrder(orderData) {
  // 🔑 Step 1: Get token
  const accessToken = await getAccessToken();

  // 🔧 Step 2: Build line items
  const lineItems = (orderData.items || []).map((item, idx) => {
    const sku =
      item.sku ||
      getSKU(
        item.products_name || "",
        item.colortext || "",
        item.size || "",
        item.gender || ""
      );

    const designs = (item.designs || item.design || []).map((d) => ({
      design_code: orderData._id || "design-" + idx,
      width_inches: String(d.width_inches ?? 12),
      height_inches: String(d.height_inches ?? 12),
      placement_sku: VIEW_TO_PLACEMENT[(d.view || "").toLowerCase()] || "fr",
      design_link: d.uploadedImage || d.url || "",
      mockup_link: d.mockupUrl || d.url || "",
    }));

    return {
      search_from_my_products: 0,
      quantity: Number(item.quantity ?? 1),
      print_type_id: 1, // ✅ abhi static rakha, baad me API se fetch kar sakte
      price: String(item.price ?? 0),
      sku: String(sku),
      designs,
    };
  });

  // 🏠 Step 3: Shipping address
  const shipping_address = {
    first_name: (orderData.address?.fullName || "").split(" ")[0] || "Customer",
    last_name:
      (orderData.address?.fullName || "").split(" ").slice(1).join(" ") || "",
    address1: [
      orderData.address?.houseNumber,
      orderData.address?.street,
      orderData.address?.landmark,
    ]
      .filter(Boolean)
      .join(", "),
    phone: orderData.address?.mobileNumber || "",
    email: orderData.user?.email || orderData.address?.email || "",
    city: orderData.address?.city || "",
    zip: orderData.address?.pincode || "",
    province: orderData.address?.state || "",
    country_code: "IN",
  };

  // 🔢 Step 4: Unique Order Number
  const part1 = String(orderData.items?.[0]?.id || "").slice(0, 5);
  const part2 = String(orderData.user?._id || "").slice(0, 5);
  const shortOrderNo = (part1 + part2).replace(/[^A-Za-z0-9]/g, "");

  // 💳 Step 5: Payment mode
  const paymentMode = orderData.gateway === "COD" ? "COD" : "Prepaid"; // ✅ simple toggle

  // 📦 Step 6: Final payload
  const payload = {
    order_number: shortOrderNo.slice(0, 15),
    qikink_shipping: String(orderData.qikink_shipping ?? 1),
    gateway: paymentMode,
    total_order_value: String(
      orderData.totalPay ?? orderData.total_order_value ?? 0
    ),
    line_items: lineItems,
    shipping_address,
  };

  console.log("📦 Sending payload:", payload);

  // 🚀 Step 7: Send to Qikink
  try {
    const response = await axios.post(QIKINK_ORDER_URL, payload, {
      headers: {
        ClientId: accessToken.ClientId,
        Accesstoken: accessToken.Accesstoken,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Qikink Order Response:", response.data);
    return response.data;
  } catch (err) {
    console.error(
      "❌ Qikink order failed:",
      err.response?.status,
      err.response?.data || err.message
    );
    throw err;
  }
};
