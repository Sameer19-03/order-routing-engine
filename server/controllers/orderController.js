const Order = require('../models/Order');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const RoutingHistory = require('../models/RoutingHistory');
const routingEngine = require('../services/routingEngine');
const aiExplanation = require('../services/aiExplanation');
const { generateRandomOrder } = require('../services/orderGenerator');

exports.createOrder = async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();
    res.status(201).json({ success: true, data: order, message: 'Order created' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate('productId').populate('assignedWarehouseId');
    res.status(200).json({ success: true, data: orders, message: 'Orders fetched' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('productId').populate('assignedWarehouseId');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.status(200).json({ success: true, data: order, message: 'Order fetched' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.status(200).json({ success: true, data: order, message: 'Order updated' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.generateRandomOrderRoute = async (req, res) => {
  try {
    const { customerName, customerLatitude, customerLongitude, productId, quantity } = await generateRandomOrder();

    const inventories = await Inventory.find({ productId }).populate('warehouseId');
    
    const { selectedWarehouse, finalScore, allScores, eliminatedWarehouses, selectedInventory } = routingEngine.selectBestWarehouse(
      inventories,
      quantity,
      customerLatitude,
      customerLongitude
    );

    if (!selectedWarehouse) {
      return res.status(400).json({ 
        success: false, 
        message: 'No eligible warehouses with sufficient stock found for random order',
        data: { eliminatedWarehouses }
      });
    }

    selectedInventory.availableQuantity -= quantity;
    selectedInventory.reservedQuantity += quantity;
    await selectedInventory.save();

    const newOrder = new Order({
      customerName,
      customerLatitude,
      customerLongitude,
      productId,
      quantity,
      assignedWarehouseId: selectedWarehouse._id,
      status: 'assigned'
    });
    await newOrder.save();

    const product = await Product.findById(productId);
    const selectedScoreData = allScores.find(s => s.warehouseName === selectedWarehouse.warehouseName);
    const rejectedScores = allScores.filter(s => s.warehouseName !== selectedWarehouse.warehouseName);

    const aiExplanationText = await aiExplanation.generateExplanation({
      productName: product ? product.productName : 'Product',
      selectedWarehouse: selectedWarehouse.warehouseName,
      distance: selectedScoreData.distance_km,
      inventory: selectedScoreData.inventory,
      deliveryDays: selectedScoreData.delivery_days,
      cost: selectedScoreData.cost,
      finalScore,
      rejectedWarehouses: rejectedScores
    });

    const routingHistory = new RoutingHistory({
      orderId: newOrder._id,
      warehouseId: selectedWarehouse._id,
      routingScore: finalScore,
      routingReason: aiExplanationText
    });
    await routingHistory.save();

    res.status(200).json({
      success: true,
      data: {
        order: newOrder,
        selectedWarehouse,
        routingScore: finalScore,
        routingReason: aiExplanationText,
        allScores,
        eliminatedWarehouses
      },
      message: 'Random order generated and routed successfully'
    });

  } catch (error) {
    console.error('Random Order Route error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
