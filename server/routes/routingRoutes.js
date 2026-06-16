const express = require('express');
const router = express.Router();
const routingController = require('../controllers/routingController');

router.post('/route-order', routingController.routeOrder);
router.get('/routing-history', routingController.getRoutingHistory);

module.exports = router;
