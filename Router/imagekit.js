// backend/routes/imagekit.js
const express = require('express');
const router = express.Router();
const ImageKit = require('imagekit');
require('dotenv').config();


const privateofkey = process.env.privateKeyimage

const imagekit = new ImageKit({
  publicKey: "public_pxbUbZQmz2LGTkhrvGgUMelJZbg=",
  privateKey:privateofkey,
  urlEndpoint: "https://ik.imagekit.io/adcig5jqr"
});

router.get('/auth', (req, res) => {
  const authParams = imagekit.getAuthenticationParameters();
  res.json(authParams);
});

module.exports = router;
