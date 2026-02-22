const express = require('express');
const router = express.Router();
const paypalController = require('../controllers/paypalController');

router.post('/webhook', paypalController.handleWebhook);

module.exports = router;
