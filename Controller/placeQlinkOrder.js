const axios = require('axios');


const QIKINK_TOKEN_URL = 'https://sandbox.qikink.com/api/token';
const QIKINK_ORDER_URL = 'https://sandbox.qikink.com/api/order';
const CLIENT_ID = process.env.QIKINK_CLIENT_ID;
const CLIENT_SECRET = process.env.QIKINK_CLIENT_SECRET;

/**
 * Fetches AccessToken from Qikink using ClientId and client_secret
 */
const getQikinkAccessToken = async () => {
  try {
    const formData = new URLSearchParams();
    formData.append('ClientId', CLIENT_ID);
    formData.append('client_secret', CLIENT_SECRET);

    const response = await axios.post(QIKINK_TOKEN_URL, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const accessToken = response.data?.access_token;

    if (!accessToken) {
      throw new Error('No access_token returned from Qikink');
    }

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

    const payload = {
      shipping: {
        first_name: orderData.shippingAddress.name,
        phone: orderData.shippingAddress.phone,
        city: orderData.shippingAddress.city,
        zip: orderData.shippingAddress.pincode,
        province: orderData.shippingAddress.state || '',
        country_code: 'IN',
        email: orderData.shippingAddress.email || '',
      },
      payment_type: 'Prepaid',
      shipping_type: 'Qikink Domestic Shipping',
      total_order_value: orderData.totalAmount.toString(),
      line_items: orderData.items.map(item => ({
        sku: item.sku,
        quantity: item.qty.toString(),
        price: item.price.toString(),
        designs: item.designs.map(design => ({
          design_code: design.code,
          placement: design.placement,
        //   height_inches: design.height,
        //   width_inches: design.width,
          design_url: design.design_url,
          mockup_url: design.mockup_url || null,
        }))
      }))
    };

    const response = await axios.post(QIKINK_ORDER_URL, payload, {
      headers: {
        ClientId: CLIENT_ID,
        Accesstoken: accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (response.data?.order_id) {
      console.log('✅ Qikink order placed:', response.data.order_id);
      return { orderId: response.data.order_id };
    } else {
      throw new Error("Invalid response from Qikink");
    }

  } catch (error) {
    console.error('❌ Qikink order failed:', error.response?.data || error.message);
    return null;
  }
};

module.exports = placeQlinkOrder;
