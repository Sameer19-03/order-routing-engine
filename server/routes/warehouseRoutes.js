const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouseController');

router.post('/', warehouseController.createWarehouse);
router.get('/', warehouseController.getWarehouses);
router.get('/:id', warehouseController.getWarehouseById);
router.put('/:id', warehouseController.updateWarehouse);

module.exports = router;
