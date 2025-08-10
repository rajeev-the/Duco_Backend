// placeQlinkOrder.js
const axios = require('axios');

const QIKINK_TOKEN_URL = 'https://sandbox.qikink.com/api/token';
const QIKINK_ORDER_URL = 'https://sandbox.qikink.com/api/order';
const CLIENT_ID = process.env.QIKINK_CLIENT_ID;
const CLIENT_SECRET = process.env.QIKINK_CLIENT_SECRET;

// Tiny helper: pick any plausible token key from a response
const extractToken = (data) => {
  if (!data) return null;
  // try common shapes
  return (
    data.access_token ||
    data.accessToken ||
    data.token ||
    data?.data?.access_token ||
    data?.data?.accessToken ||
    data?.data?.token ||
    null
  );
};

const getQikinkAccessToken = async () => {
  // 1) Try form-encoded with various field name casings
  const variants = [
    { ClientId: CLIENT_ID, client_secret: CLIENT_SECRET },
    { client_id: CLIENT_ID, client_secret: CLIENT_SECRET },
    { ClientID: CLIENT_ID, ClientSecret: CLIENT_SECRET },
    { ClientId: CLIENT_ID, ClientSecret: CLIENT_SECRET },
  ];

  // 2) Also try JSON in case their endpoint wants JSON
  const attempts = [
    async () => {
      const body = new URLSearchParams(variants[0]);
      return axios.post(QIKINK_TOKEN_URL, body, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }});
    },
    async () => {
      const body = new URLSearchParams(variants[1]);
      return axios.post(QIKINK_TOKEN_URL, body, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }});
    },
    async () => {
      const body = new URLSearchParams(variants[2]);
      return axios.post(QIKINK_TOKEN_URL, body, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }});
    },
    async () => {
      const body = new URLSearchParams(variants[3]);
      return axios.post(QIKINK_TOKEN_URL, body, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }});
    },
    async () => {
      return axios.post(QIKINK_TOKEN_URL, variants[0], { headers: { 'Content-Type': 'application/json' }});
    },
  ];

  for (let i = 0; i < attempts.length; i++) {
    try {
      const resp = await attempts[i]();
      const token = extractToken(resp.data) || extractToken(resp.headers);
      if (token) {
        console.log('✅ Qikink AccessToken received (attempt', i + 1, ')');
        return token;
      }
      // Log raw (once) to see their shape in your logs
      console.error('⚠️ Qikink token shape unexpected:', JSON.stringify(resp.data));
    } catch (e) {
      // show brief error code/status to logs to compare attempts
      const status = e.response?.status;
      const body = e.response?.data;
      console.error(`❌ Token attempt ${i + 1} failed`, status || '', body || e.message);
    }
  }

  return null;
};

const placeQlinkOrder = async (orderData) => {
  try {
    const accessToken = await getQikinkAccessToken();
    if (!accessToken) throw new Error('Access token missing');

    const line_items = (orderData?.items || []).map((item) => {
      const designs = (item?.design || []).map((d) => ({
        design_code: orderData?._id || '',
        placement: d?.view || '',
        design_url: d?.uploadedImage ? d.uploadedImage : (d?.url || ''),
        mockup_url: d?.url || null,
      }));

      const sku = require('./getsku').getSKU(
        item?.products_name || '',
        item?.colortext || '',
        item?.size || '',
        item?.gender || ''
      );

      return {
        sku,
        quantity: String(item?.quantity ?? 1),
        price: String(item?.price ?? 0),
        designs,
      };
    });

    const payload = {
      shipping: {
        first_name: orderData?.address?.fullName || '',
        phone: orderData?.address?.mobileNumber || '',
        city: orderData?.address?.city || '',
        zip: orderData?.address?.pincode || '',
        province: orderData?.address?.state || '',
        country_code: 'IN',
        email: orderData?.user?.email || '',
        address1: [orderData?.address?.houseNumber, orderData?.address?.street, orderData?.address?.landmark].filter(Boolean).join(', ')
      },
      payment_type: 'Prepaid',
      shipping_type: 'Qikink Domestic Shipping',
      total_order_value: String(orderData?.totalPay ?? 0),
      line_items,
    };

    // Send token in both common styles (one will be ignored if not needed)
    const response = await axios.post(QIKINK_ORDER_URL, payload, {
      headers: {
        ClientId: process.env.QIKINK_CLIENT_ID,
        Accesstoken: accessToken,                   // some APIs expect this
        AccessToken: accessToken,                   // some expect this casing
        Authorization: `Bearer ${accessToken}`,     // OAuth common pattern
        'Content-Type': 'application/json',
      },
    });

    if (response.data?.order_id) {
      console.log('✅ Qikink order placed:', response.data.order_id);
      return { orderId: response.data.order_id };
    }
    console.error('❌ Invalid response from Qikink:', response.data);
    return null;
  } catch (error) {
    console.error('💥 Qikink order failed:', error.response?.data || error.message);
    return null;
  }
};

module.exports = placeQlinkOrder;
