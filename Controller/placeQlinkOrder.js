// Controller/placeQlinkOrder.js
const axios = require('axios');
const { getSKU } = require('./getsku');
const qs =require("qs");

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

async function getAccessToken() {
  try {
    const data = qs.stringify({
      ClientId:  process.env.QIKINK_CLIENT_ID, // replace with your real clientId
      client_secret: process.env.QIKINK_CLIENT_SECRET // replace with your real client_secret
    });

    const response = await axios.post(
      "https://sandbox.qikink.com/api/token",
      data,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );
      console.log(response)
   return response.data

  } catch (error) {
    console.error("Error getting token:", error.response ? error.response.data : error.message);
  }
}



// (async () => {
//   const token = 
//   console.log('token len:', token.length);

//   const clientId =CLIENT_ID
//   console.log('clientId env:', clientId);

//   const resp = await axios.post(
//     'https://sandbox.qikink.com/api/order/create',
//     {
//       order_number: 'api1',
//       qikink_shipping: '1',
//       gateway: 'COD',
//       total_order_value: '1',
//       line_items: [{
//         search_from_my_products: 0,
//         quantity: '1',
//         print_type_id: 1,
//         price: '1',
//         sku: 'MVnHs-Wh-S',
//         designs: [{
//           design_code: 'iPhoneXR',
//           width_inches: '14',
//           height_inches: '13',
//           placement_sku: 'fr',
//           design_link: 'https://www.sample_design.com/sample_image.png',
//           mockup_link: 'https://www.sample_mockup.com/sample_image.png'
//         }]
//       }],
//       shipping_address: {
//         first_name: 'first_name',
//         last_name: 'last_name',
//         address1: 'addr...',
//         phone: '9876543210',
//         email: 'sample@gmail.com',
//         city: 'coimbatore',
//         zip: '641004',
//         province: 'ABC',
//         country_code: 'IN'
//       }
//     },
//     {
//       headers: {
//         ClientId: clientId,           // MUST be 447778 in your case
//         Accesstoken: token,           // MUST be the token from /api/token
//         'Content-Type': 'application/json'
//       },
//       timeout: 20000
//     }
//   );

//   console.log('order OK:', resp.data);
// })().catch(e => {
//   console.error('order FAIL:', e.response?.status, e.response?.data || e.message);
// });



module.exports = async function placeQlinkOrder(orderData) {
  const accessToken = await getAccessToken();

  console.log(accessToken.ClientId)
  console.log(accessToken.Accesstoken)

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
      quantity:(item.quantity ?? 1),
      print_type_id: Number(item.print_type_id ?? 1),
      price: String(item.price ?? 0),
      sku:String(sku),
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
const part1 = String(orderData.items?.[0]?.id || '').slice(0, 5);
const part2 = String(orderData.user?._id || '').slice(0, 5);
const shortOrderNo = (part1 + part2).replace(/[^A-Za-z0-9]/g, '');


  const payload = {
    order_number:shortOrderNo.slice(0, 15),
    qikink_shipping: String(orderData.qikink_shipping ?? 1), // "1" per cURL
    gateway: orderData.gateway === 'COD' ? 'COD' : 'Prepaid', // match cURL ("COD" example)
    total_order_value: String(orderData.totalPay ?? orderData.total_order_value ?? 0),
    line_items,
    shipping_address,
  };



  try {
    const response = await axios.post(QIKINK_ORDER_URL, payload, {
      headers: {
        ClientId: accessToken?.ClientId,
        Accesstoken: accessToken?.Accesstoken,
        'Content-Type': 'application/json',
      },
      
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
