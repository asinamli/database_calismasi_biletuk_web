const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const paymentController = require('../controllers/payment.controller');

console.log("Payment controller yüklendi:", Object.keys(paymentController));

// Açık şekilde tanımlanmış route handler fonksiyonları
const initiatePaymentHandler = (req, res) => {
  return paymentController.initiatePayment(req, res);
};

const verifyPaymentHandler = (req, res) => {
  return paymentController.verifyPayment(req, res);
};

const manualCheckoutHandler = (req, res) => {
  return paymentController.manualCheckout(req, res);
};

// Rotaları açıkça tanımlanmış handler fonksiyonlarına bağla
router.post('/initiate', protect, initiatePaymentHandler);
router.post('/verify', protect, verifyPaymentHandler);
router.post('/manual-checkout', protect, manualCheckoutHandler);

module.exports = router;
