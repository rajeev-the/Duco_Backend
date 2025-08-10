// Controller/placeQlinkOrder.js
const axios = require('axios');
const { getSKU } = require('./getsku');

const QIKINK_TOKEN_URL = 'https://sandbox.qikink.com/api/token';
const QIKINK_ORDER_URL = 'https://sandbox.qikink.com/api/order/create';

const CLIENT_ID = process.env.QIKINK_CLIENT_ID;
const CLIENT_SECRET = process.env.QIKINK_CLIENT_SECRET;

// Map your view -> Qikink placement_sku
const VIEW_TO_PLACEMENT = {
  front: 'fr',
  back: 'bk',
  left: 'lf',
  right: 'rt',
};

async function getQikinkAccessToken() {
  // Qikink commonly accepts form-encoded ClientId + ClientSecret
  const body = new URLSearchParams({
    ClientId: CLIENT_ID,
    ClientSecret: CLIENT_SECRET, // If docs say client_secret, switch this key to 'client_secret'
  });

  const resp = await axios.post(QIKINK_TOKEN_URL, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15000,
  });

  const token = resp.data?.Accesstoken;
  if (!token) {
    throw new Error(`No Accesstoken in token response: ${JSON.stringify(resp.data)}`);
  }
  return token;
}

module.exports = async function placeQlinkOrder(orderData = {}) {
  const accessToken = await getQikinkAccessToken();

  // Build line_items exactly as per Qikink cURL
  const line_items = (orderData.items || []).map((item, idx) => {
    const sku =
      item.sku ||
      getSKU(item.products_name || '', item.colortext || '', item.size || '', item.gender || '');

    const designs = (item.designs || item.design || []).map((d) => ({
      design_code: orderData._id || 'design-' + idx,
      width_inches: String(d.width_inches ?? 20),
      height_inches: String(d.height_inches ?? 20),
      placement_sku: VIEW_TO_PLACEMENT[(d.view || '').toLowerCase()] || 'fr',
      design_link: d.uploadedImage || d.url || '',
      mockup_link: d.mockupUrl || d.url || '',
    }));

    return {
      search_from_my_products: 0,
      quantity: String(item.quantity ?? 1),
      print_type_id: Number(item.print_type_id ?? 1),
      price: String(item.price ?? 0),
      sku,
      designs,
    };
  });

  // Shipping address per cURL
  const shipping_address = {
    first_name: (orderData.address?.fullName || '').split(' ')[0] || 'Customer',
    last_name: (orderData.address?.fullName || '').split(' ').slice(1).join(' ') || '',
    address1: [orderData.address?.houseNumber, orderData.address?.street, orderData.address?.landmark]
      .filter(Boolean)
      .join(', '),
    phone: orderData.address?.mobileNumber || '',
    email: orderData.user?.email || orderData.address?.email || '',
    city: orderData.address?.city || '',
    zip: orderData.address?.pincode || '',
    province: orderData.address?.state || '',
    country_code: 'IN',
  };

  // Optional add-ons (set your own flags)
  const add_ons = [
    {
      box_packing: Number(orderData.addons?.box_packing ?? 0),
      gift_wrap: Number(orderData.addons?.gift_wrap ?? 0),
      rush_order: Number(orderData.addons?.rush_order ?? 0),
      custom_letter: orderData.addons?.custom_letter || '',
    },
  ];

  const payload = {
    order_number: orderData.order_number || `api-${Date.now()}`,
    qikink_shipping: String(orderData.qikink_shipping ?? 1), // "1" per cURL
    gateway: orderData.gateway === 'COD' ? 'COD' : 'Prepaid', // match cURL ("COD" example)
    total_order_value: String(orderData.totalPay ?? orderData.total_order_value ?? 0),
    line_items,
    add_ons,
    shipping_address,
  };

  // Debug what we’re sending (no secrets)
  console.log('[QIKINK] POST', QIKINK_ORDER_URL);
  console.log('[QIKINK] Headers: ClientId present?', !!CLIENT_ID, 'Accesstoken present?', !!accessToken);
  console.log('[QIKINK] Payload keys:', Object.keys(payload));
  console.log('[QIKINK] line_items count:', line_items.length);

  try {
    const response = await axios.post(QIKINK_ORDER_URL, payload, {
      headers: {
        ClientId: CLIENT_ID,
        Accesstoken: accessToken,
        'Content-Type': 'application/json',
      },
      timeout: 20000,
    });

    // On success Qikink usually returns an order id or object
    return response.data;
  } catch (err) {
    const status = err.response?.status;
    const body = err.response?.data;
    console.error('❌ Qikink order failed:', status, body || err.message);
    // Re-throw to let the controller turn this into a 4xx/5xx JSON (not masked 500)
    const e = new Error(`[Qikink] ${status}: ${JSON.stringify(body || { message: err.message })}`);
    e.status = status || 502;
    throw e;
  }
};
