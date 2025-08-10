// Controller/placeQlinkOrder.js
const axios = require('axios');
const { getSKU } = require('./getsku');

const QIKINK_TOKEN_URL = 'https://sandbox.qikink.com/api/token';
const QIKINK_ORDER_URL = 'https://sandbox.qikink.com/api/order/create';

const CLIENT_ID = process.env.QIKINK_CLIENT_ID;
const CLIENT_SECRET = process.env.QIKINK_CLIENT_SECRET;

const VIEW_TO_PLACEMENT = { front: 'fr', back: 'bk', left: 'lf', right: 'rt' };

let envWarned = false;
function warnEnv() {
  if (envWarned) return;
  ['QIKINK_CLIENT_ID','QIKINK_CLIENT_SECRET'].forEach(k=>{
    if (!process.env[k]) console.warn(`[QIKINK] ⚠ Missing ENV ${k}`);
  });
  envWarned = true;
}

// Try both param casings for token endpoint
async function getQikinkAccessToken() {
  warnEnv();

  const tryOnce = async (paramsObj) => {
    const body = new URLSearchParams(paramsObj);
    const resp = await axios.post(QIKINK_TOKEN_URL, body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
    });
    const token = resp.data?.Accesstoken;
    if (!token) throw new Error(`No Accesstoken in token response: ${JSON.stringify(resp.data)}`);
    return token;
  };

  try {
    // Camel-case first (your current)
    return await tryOnce({ ClientId: CLIENT_ID, ClientSecret: CLIENT_SECRET });
  } catch (e1) {
    // Fallback to snake-case commonly seen in some docs
    try {
      return await tryOnce({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET });
    } catch (e2) {
      const err = new Error(`[QIKINK] Token fetch failed. primary=${e1.response?.status} secondary=${e2.response?.status}`);
      err.status = e2.response?.status || e1.response?.status || 502;
      throw err;
    }
  }
}

module.exports = async function placeQlinkOrder(orderData = {}) {
  // Basic guards to avoid 500s later
  if (!orderData.items || !orderData.items.length) {
    const e = new Error('orderData.items is required');
    e.status = 400;
    throw e;
  }
  if (!orderData.address || !orderData.address?.fullName || !orderData.address?.mobileNumber) {
    const e = new Error('address.fullName and address.mobileNumber are required');
    e.status = 400;
    throw e;
  }

  const accessToken = await getQikinkAccessToken();

  const line_items = (orderData.items || []).map((item, idx) => {
    const sku =
      item.sku ||
      getSKU(item.products_name || '', item.colortext || '', item.size || '', item.gender || '');

    const designsSrc = item.designs || item.design || [];
    const designs = designsSrc.map((d) => ({
      design_code: orderData._id || `design-${idx}`,
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

  const shipping_address = {
    first_name: (orderData.address?.fullName || '').split(' ')[0] || 'Customer',
    last_name: (orderData.address?.fullName || '').split(' ').slice(1).join(' ') || '',
    address1: [orderData.address?.houseNumber, orderData.address?.street, orderData.address?.landmark]
      .filter(Boolean).join(', '),
    phone: orderData.address?.mobileNumber || '',
    email: orderData.user?.email || orderData.address?.email || '',
    city: orderData.address?.city || '',
    zip: orderData.address?.pincode || '',
    province: orderData.address?.state || '',
    country_code: 'IN',
  };

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
    qikink_shipping: String(orderData.qikink_shipping ?? 1),
    gateway: orderData.gateway === 'COD' ? 'COD' : 'Prepaid',
    total_order_value: String(orderData.totalPay ?? orderData.total_order_value ?? 0),
    line_items,
    add_ons,
    shipping_address,
  };

  console.log('[QIKINK] POST', QIKINK_ORDER_URL);
  console.log('[QIKINK] Headers -> ClientId?', !!CLIENT_ID, 'Accesstoken?', !!accessToken);
  console.log('[QIKINK] Items:', line_items.length, 'Gateway:', payload.gateway);

  try {
    const response = await axios.post(QIKINK_ORDER_URL, payload, {
      headers: {
        ClientId: CLIENT_ID,
        Accesstoken: accessToken,
        'Content-Type': 'application/json',
      },
      timeout: 20000,
    });

    // Validate success shape
    const data = response.data || {};
    if (data.status === true || data.order_id || data.orderId) {
      return data;
    }
    const e = new Error(`[Qikink] Unexpected success payload: ${JSON.stringify(data)}`);
    e.status = 502;
    throw e;
  } catch (err) {
    const status = err.response?.status;
    const body = err.response?.data;
    console.error('❌ Qikink order failed:', status, body || err.message);
    const e = new Error(`[Qikink] ${status || 500}: ${JSON.stringify(body || { message: err.message })}`);
    e.status = status || 502;
    throw e;
  }
};
