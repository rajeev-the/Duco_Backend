// controllers/printroveAuth.js
const axios = require('axios');
require('dotenv').config();

let cachedToken = process.env.PRINTROVE_ACCESS_TOKEN || null;
let tokenExpiry = null;

/**
 * Generate a fresh Printrove access token using merchant email & password.
 */
async function generatePrintroveToken() {
  try {
    const response = await axios.post(
      'https://api.printrove.com/api/external/token', // ✅ Use full URL as per API docs
      {
        email: process.env.PRINTROVE_EMAIL,
        password: process.env.PRINTROVE_PASSWORD,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    const { access_token, expires_at } = response.data || {};

    if (!access_token)
      throw new Error('Missing access_token from Printrove response');

    cachedToken = access_token;
    tokenExpiry = new Date(expires_at);

    console.log('✅ New Printrove token generated, expires:', tokenExpiry);
    return cachedToken;
  } catch (err) {
    console.error(
      '❌ Printrove token generation failed:',
      err.response?.data || err.message
    );
    throw new Error('Failed to generate Printrove token');
  }
}

/**
 * Return cached token if still valid, otherwise regenerate.
 */
async function getPrintroveToken() {
  if (cachedToken && tokenExpiry && new Date() < tokenExpiry) {
    return cachedToken;
  }
  return await generatePrintroveToken();
}

module.exports = {
  getPrintroveToken,
  generatePrintroveToken,
};
