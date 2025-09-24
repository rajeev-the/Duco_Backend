// helpers/qikinkHelper.js
const axios = require("axios");
const qs = require("qs");

const QIKINK_TOKEN_URL = "https://sandbox.qikink.com/api/token";
const QIKINK_ORDER_URL = "https://sandbox.qikink.com/api/order/create";

async function getAccessToken() {
  const res = await axios.post(
    QIKINK_TOKEN_URL,
    qs.stringify({
      client_id: process.env.QIKINK_CLIENT_ID,
      client_secret: process.env.QIKINK_CLIENT_SECRET,
    }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  return {
    ClientId: process.env.QIKINK_CLIENT_ID,
    Accesstoken: res.data.Accesstoken || res.data.access_token,
  };
}

async function createQikinkOrder(order, items) {
  const token = await getAccessToken();

  const payload = {
    order_number: String(order._id).slice(0, 15),
    qikink_shipping: "1",
    gateway: order.paymentmode === "Bank Transfer" ? "COD" : "Prepaid",
    total_order_value: String(order.price),
    line_items: items.map((p) => ({
      search_from_my_products: 0,
      quantity: p.quantity,
      print_type_id: 1,
      price: String(p.price),
      sku: String(p.sku),
      designs: (p.designs || []).map((d, i) => ({
        design_code: `${order._id}-${i}`,
        width_inches: String(d.width_inches ?? 12),
        height_inches: String(d.height_inches ?? 12),
        placement_sku: d.view === "back" ? "bk" : "fr",
        design_link: d.uploadedImage || "",
        mockup_link: d.mockupUrl || "",
      })),
    })),
    shipping_address: {
      first_name: (order.address.fullName || "").split(" ")[0] || "Customer",
      last_name:
        (order.address.fullName || "").split(" ").slice(1).join(" ") || "",
      address1: `${order.address.houseNumber}, ${order.address.street}`,
      phone: order.address.mobileNumber,
      email: order.address.email,
      city: order.address.city,
      zip: order.address.pincode,
      province: order.address.state,
      country_code: "IN",
    },
  };

  const res = await axios.post(QIKINK_ORDER_URL, payload, {
    headers: {
      ClientId: token.ClientId,
      Accesstoken: token.Accesstoken,
      "Content-Type": "application/json",
    },
  });

  return res.data;
}

module.exports = { createQikinkOrder };
