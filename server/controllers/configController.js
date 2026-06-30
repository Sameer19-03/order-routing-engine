const RoutingConfig = require('../models/RoutingConfig');

exports.getConfig = async (req, res) => {
  try {
    const config = await RoutingConfig.findOne();
    if (config) {
      return res.status(200).json({ success: true, data: config });
    }
    
    // Default config if none exists
    const defaultConfig = {
      distanceWeight: 35,
      inventoryWeight: 35,
      deliveryWeight: 20,
      costWeight: 10
    };
    return res.status(200).json({ success: true, data: defaultConfig });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateConfig = async (req, res) => {
  try {
    const { distanceWeight, inventoryWeight, deliveryWeight, costWeight } = req.body;
    
    // Validate inputs
    if (
      distanceWeight === undefined || 
      inventoryWeight === undefined || 
      deliveryWeight === undefined || 
      costWeight === undefined
    ) {
      return res.status(400).json({ success: false, message: 'All 4 weights must be provided.' });
    }

    const sum = Number(distanceWeight) + Number(inventoryWeight) + Number(deliveryWeight) + Number(costWeight);
    
    if (Math.abs(sum - 100) > 0.01) {
      return res.status(400).json({ 
        success: false, 
        message: `Weights must sum to exactly 100. Current sum is ${sum}.` 
      });
    }

    // Upsert the singleton config
    let config = await RoutingConfig.findOne();
    if (!config) {
      config = new RoutingConfig();
    }

    config.distanceWeight = distanceWeight;
    config.inventoryWeight = inventoryWeight;
    config.deliveryWeight = deliveryWeight;
    config.costWeight = costWeight;
    config.updatedBy = req.user.id; // user id injected by verifyToken middleware
    config.updatedAt = Date.now();

    await config.save();
    
    // Return the updated config with user populated
    const populatedConfig = await RoutingConfig.findById(config._id).populate('updatedBy', 'username');

    res.status(200).json({ success: true, data: populatedConfig, message: 'Configuration updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
