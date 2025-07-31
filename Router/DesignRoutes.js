// routes/designRoutes.js
const express = require('express');
const router = express.Router();
const { createDesign, deleteDesign,getDesignsByUser } = require('../Controller/DesignController');


router.post('/designs', createDesign);
router.get('/designs/user/:userId', getDesignsByUser);

router.delete('/designs/:id', deleteDesign);

module.exports = router;
