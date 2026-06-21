const Order = require('../models/Order');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const RoutingHistory = require('../models/RoutingHistory');
const routingEngine = require('./routingEngine');
const aiExplanation = require('./aiExplanation');

const names = [
  "Rahul Sharma", "Priya Patel", "Amit Kumar", 
  "Sneha Reddy", "Vikram Singh", "Anjali Gupta", 
  "Rohan Mehta", "Kavya Nair"
];

const generateRandomOrder = async () => {
  // Random name + 3-digit number
  const baseName = names[Math.floor(Math.random() * names.length)];
  const randomNum = Math.floor(100 + Math.random() * 900);
  const customerName = `${baseName} ${randomNum}`;

  // Random Lat/Lng
  const customerLatitude = 8.4 + Math.random() * (37.6 - 8.4);
  const customerLongitude = 68.7 + Math.random() * (97.25 - 68.7);

  // Random product
  const products = await Product.find({}, '_id');
  if (!products.length) throw new Error('No products found in DB');
  const productId = products[Math.floor(Math.random() * products.length)]._id;

  // Random quantity 1-5
  const quantity = Math.floor(Math.random() * 5) + 1;

  return { customerName, customerLatitude, customerLongitude, productId, quantity };
};

const runAutoOrder = async () => {
  try {
    const { customerName, customerLatitude, customerLongitude, productId, quantity } = await generateRandomOrder();

    // Query inventory
    const inventories = await Inventory.find({ productId }).populate('warehouseId');
    
    // Call routing engine
    const { selectedWarehouse, finalScore, allScores, eliminatedWarehouses, selectedInventory } = routingEngine.selectBestWarehouse(
      inventories,
      quantity,
      customerLatitude,
      customerLongitude
    );

    if (!selectedWarehouse) {
      console.log(`[CRON] Auto-order failed: No eligible warehouse for ${customerName}`);
      return;
    }

    // Reserve inventory
    selectedInventory.availableQuantity -= quantity;
    selectedInventory.reservedQuantity += quantity;
    await selectedInventory.save();

    // Create Order
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

    // Call AI Explanation
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

    // Save to Routing History
    const routingHistory = new RoutingHistory({
      orderId: newOrder._id,
      warehouseId: selectedWarehouse._id,
      routingScore: finalScore,
      routingReason: aiExplanationText
    });
    await routingHistory.save();

    console.log(`[CRON] Auto-order created: ${customerName} \u2192 ${selectedWarehouse.warehouseName} (score: ${finalScore.toFixed(4)})`);
  } catch (error) {
    console.error('[CRON] Auto-order error:', error);
  }
};

module.exports = {
  generateRandomOrder,
  runAutoOrder
};
