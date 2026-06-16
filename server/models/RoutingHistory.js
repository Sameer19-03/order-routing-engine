const mongoose = require('mongoose');

const routingHistorySchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  routingScore: { type: Number },
  routingReason: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RoutingHistory', routingHistorySchema);
