// helpers/qikinkHelper.js
const axios = require("axios");
const qs = require("qs");

// Use sandbox or live based on .env
const QIKINK_ENV = process.env.QIKINK_ENV || "sandbox";

const BASE_URLS = {
  sandbox: "https://sandbox.qikink.com/api",
  live: "https://qikink.com/api",
};

const QIKINK_TOKEN_URL = `${BASE_URLS[QIKINK_ENV]}/token`;
const QIKINK_ORDER_URL = `${BASE_URLS[QIKINK_ENV]}/order/create`;

async function getAccessToken() {
  try {
    const res = await axios.post(
      QIKINK_TOKEN_URL,
      qs.stringify({
        ClientId: process.env.QIKINK_CLIENT_ID,
        client_secret: process.env.QIKINK_CLIENT_SECRET,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return {
      ClientId: process.env.QIKINK_CLIENT_ID,
      Accesstoken: res.data.Accesstoken || res.data.access_token,
    };
  } catch (err) {
    console.error("Qikink Auth Error:", err.response?.data || err.message);
    throw new Error("Failed to fetch Qikink access token");
  }
}

// Build & send order payload to Qikink
async function createQikinkOrder(order, items) {
  const token = await getAccessToken();

  console.log("Qikink Access Token:", token);

  const payload = {
    order_number: String(order._id).slice(0, 15),
    qikink_shipping: "1",
    gateway: order.paymentmode,
    total_order_value: String(order.price),
    line_items: items.map((p) => ({
      search_from_my_products: 0,
      quantity: p.quantity,
      print_type_id: 1,
      price: String(p.price),
      sku: String(p.sku),
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

module.exports = { getAccessToken, createQikinkOrder };
