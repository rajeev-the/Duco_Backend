// placeQlinkOrder.js
const axios = require('axios');
const { getSKU } = require('./getsku');

const QIKINK_TOKEN_URL = 'https://sandbox.qikink.com/api/token';
const QIKINK_ORDER_URL = 'https://sandbox.qikink.com/api/order';
const CLIENT_ID = process.env.QIKINK_CLIENT_ID;
const CLIENT_SECRET = process.env.QIKINK_CLIENT_SECRET;

const getQikinkAccessToken = async () => {
  const body = new URLSearchParams({ ClientId: CLIENT_ID, client_secret: CLIENT_SECRET });

  const resp = await axios.post(QIKINK_TOKEN_URL, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  // ✅ Qikink returns { ClientId, Accesstoken, expires_in }
  const token = resp.data?.Accesstoken;
  if (!token) throw new Error('No Accesstoken in response');

  return token;
};



const placeQlinkOrder = async (orderData) => {
  try {
    const accessToken = await getQikinkAccessToken();

    const line_items = (orderData?.items || []).map((item) => {
      const designs = (item?.design || []).map((d) => ({
        design_code: orderData?._id || '',
        placement: d?.view || '',
        design_url: d?.uploadedImage ? d.uploadedImage : (d?.url || ''),
        mockup_url: d?.url || null,
      }));

      return {
        sku: getSKU(item?.products_name || '', item?.colortext || '', item?.size || '', item?.gender || ''),
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
        address1: [orderData?.address?.houseNumber, orderData?.address?.street, orderData?.address?.landmark]
          .filter(Boolean).join(', '),
      },
      payment_type: 'Prepaid',
      shipping_type: 'Qikink Domestic Shipping',
      total_order_value: String(orderData?.totalPay ?? 0),
      line_items,
    };

    const response = await axios.post(QIKINK_ORDER_URL, payload, {
      headers: {
        // ✅ These two headers are what Qikink expects
        ClientId: CLIENT_ID,
        Accesstoken: accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (response.data?.order_id) {
      return { orderId: response.data.order_id };
    }
    throw new Error('Invalid response from Qikink');
  } catch (e) {
    console.error('❌ Qikink order failed:', e.response?.data || e.message);
    return null;
  }
};

module.exports = { placeQlinkOrder};
