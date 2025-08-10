const axios = require('axios');
const { getSKU } = require("./getsku");

const QIKINK_TOKEN_URL = 'https://sandbox.qikink.com/api/token';
const QIKINK_ORDER_URL = 'https://sandbox.qikink.com/api/order';
const CLIENT_ID = process.env.QIKINK_CLIENT_ID;
const CLIENT_SECRET = process.env.QIKINK_CLIENT_SECRET;

const getQikinkAccessToken = async () => {
  try {
    const formData = new URLSearchParams();
    // ⚠️ Check the exact field names required by Qikink docs. If they expect lowercase `client_id`,
    // update accordingly. Your current code sends `ClientId` + `client_secret`.
    formData.append('ClientId', CLIENT_ID);
    formData.append('client_secret', CLIENT_SECRET);

    const response = await axios.post(QIKINK_TOKEN_URL, formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const accessToken = response.data?.access_token;
    if (!accessToken) throw new Error('No access_token returned from Qikink');

    console.log('✅ AccessToken received from Qikink');
    return accessToken;
  } catch (error) {
    console.error('❌ Failed to fetch Qikink AccessToken:', error.response?.data || error.message);
    return null;
  }
};

/**
 * Places a Qikink order using dynamic token
 * @param {Object} orderData - formatted data from frontend
 */
const placeQlinkOrder = async (orderData) => {
  try {
    const accessToken = await getQikinkAccessToken();
    if (!accessToken) throw new Error('Access token missing');

    const addr = orderData?.address || {};
    const user = orderData?.user || {};

    // Build lean line items
    const line_items = (orderData?.items || []).map((item) => {
      const name = item?.products_name || '';
      const colortext = item?.colortext || '';
      const size = item?.size || '';
      const gender = item?.gender || '';

      const sku = getSKU(name, colortext, size, gender);

      // pick first image if present
      const image =
        Array.isArray(item?.image_url) &&
        item.image_url[0]?.url &&
        Array.isArray(item.image_url[0].url) &&
        item.image_url[0].url[0]
          ? item.image_url[0].url[0]
          : null;

      // ✅ Use `design` (singular). Be defensive.
      const designs = (item?.design || []).map((d) => ({
        design_code: orderData?._id || '',     // optional; use your own code if needed
        placement: d?.view || '',
        design_url: d?.uploadedImage ? d.uploadedImage : (d?.url || ''),
        mockup_url: d?.url || image,          // fallback to product image
      }));

      return {
        sku,
        quantity: String(item?.quantity ?? 1),
        price: String(item?.price ?? 0),
        designs,
      };
    });

    const payload = {
      shipping: {
        first_name: addr.fullName || '',
        phone: addr.mobileNumber || '',
        city: addr.city || '',
        zip: addr.pincode || '',
        province: addr.state || '',
        country_code: 'IN',
        email: user.email || '',
        address1: [addr.houseNumber, addr.street, addr.landmark].filter(Boolean).join(', '),
      },
      payment_type: 'Prepaid',
      shipping_type: 'Qikink Domestic Shipping',
      total_order_value: String(orderData?.totalPay ?? 0),
      line_items,
    };

    // ⚠️ Header keys must match Qikink spec exactly. If they require `AccessToken` (camel) vs `Accesstoken`, fix it.
    const response = await axios.post(QIKINK_ORDER_URL, payload, {
      headers: {
        ClientId: CLIENT_ID,
        Accesstoken: accessToken,          // verify exact casing in docs
        'Content-Type': 'application/json',
      },
      // timeout: 15000,
    });

    if (response.data?.order_id) {
      console.log('✅ Qikink order placed:', response.data.order_id);
      return { orderId: response.data.order_id };
    } else {
      console.error('❌ Invalid response from Qikink:', response.data);
      throw new Error("Invalid response from Qikink");
    }

  } catch (error) {
    console.error('❌ Qikink order failed:', error.response?.data || error.message);
    return null;
  }
};

module.exports = placeQlinkOrder;
