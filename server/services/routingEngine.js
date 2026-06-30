const RoutingConfig = require('../models/RoutingConfig');

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

exports.selectBestWarehouse = async (inventories, quantity, customerLat, customerLng) => {
  let bestScore = -1;
  let selectedWarehouse = null;
  let selectedInventory = null;
  const allScores = [];
  const eliminatedWarehouses = [];

  let config = await RoutingConfig.findOne();
  if (!config) {
    config = new RoutingConfig();
  }

  const wDist = config.distanceWeight / 100;
  const wInv = config.inventoryWeight / 100;
  const wDel = config.deliveryWeight / 100;
  const wCost = config.costWeight / 100;

  const eligibleInventories = [];

  for (const inv of inventories) {
    const warehouse = inv.warehouseId;
    if (!warehouse) continue;

    if (warehouse.activeStatus !== true || inv.availableQuantity < quantity) {
      eliminatedWarehouses.push({
        warehouseName: warehouse.warehouseName,
        availableQuantity: inv.availableQuantity,
        reason: warehouse.activeStatus !== true ? 'Inactive' : 'Insufficient stock'
      });
      continue;
    }
    
    eligibleInventories.push(inv);
  }

  for (const inv of eligibleInventories) {
    const warehouse = inv.warehouseId;
    const distance_km = getDistanceFromLatLonInKm(customerLat, customerLng, warehouse.latitude, warehouse.longitude);
    
    // Distance Score
    const distScore = 1 / (1 + distance_km);
    
    // Inventory Score
    const totalInventory = inv.availableQuantity + inv.reservedQuantity;
    const invScore = totalInventory > 0 ? (inv.availableQuantity / totalInventory) : 0;
    
    // Delivery Score
    let delivery_days = Math.ceil(distance_km / 200);
    if (delivery_days === 0) delivery_days = 1;
    const delScore = 1 / delivery_days;
    
    // Cost Score
    const costScore = 1 / (1 + (distance_km * 5));
    
    // Final Score
    const finalScore = (wDist * distScore) + (wInv * invScore) + (wDel * delScore) + (wCost * costScore);
    
    allScores.push({
      warehouseName: warehouse.warehouseName,
      distance_km,
      delivery_days,
      cost: distance_km * 5,
      distScore,
      invScore,
      delScore,
      costScore,
      distWeighted: wDist * distScore,
      invWeighted: wInv * invScore,
      delWeighted: wDel * delScore,
      costWeighted: wCost * costScore,
      finalScore,
      inventory: inv.availableQuantity
    });

    if (finalScore > bestScore) {
      bestScore = finalScore;
      selectedWarehouse = warehouse;
      selectedInventory = inv;
    }
  }

  return { 
    selectedWarehouse, 
    finalScore: bestScore, 
    allScores, 
    eliminatedWarehouses, 
    selectedInventory,
    weights: {
      distanceWeight: config.distanceWeight,
      inventoryWeight: config.inventoryWeight,
      deliveryWeight: config.deliveryWeight,
      costWeight: config.costWeight
    }
  };
};
