require('dotenv').config();
const mongoose = require('mongoose');
const Warehouse = require('./models/Warehouse');
const Product = require('./models/Product');
const Inventory = require('./models/Inventory');
const Order = require('./models/Order');
const RoutingHistory = require('./models/RoutingHistory');
const User = require('./models/User');
const RoutingConfig = require('./models/RoutingConfig');

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  tls: true,
  tlsAllowInvalidCertificates: true
})
  .then(() => console.log('Connected to MongoDB for seeding'))
  .catch(err => console.error(err));

const seedData = async () => {
  try {
    // Clear existing
    await Warehouse.deleteMany({});
    await Product.deleteMany({});
    await Inventory.deleteMany({});
    await Order.deleteMany({});
    await RoutingHistory.deleteMany({});
    await User.deleteMany({});
    await RoutingConfig.deleteMany({});

    // Users
    const adminUser = new User({ username: 'admin', password: 'admin123', role: 'admin' });
    const managerUser = new User({ username: 'manager', password: 'manager123', role: 'manager' });
    await adminUser.save();
    await managerUser.save();

    // Routing Config
    const defaultConfig = new RoutingConfig({
      distanceWeight: 35,
      inventoryWeight: 35,
      deliveryWeight: 20,
      costWeight: 10,
      updatedBy: adminUser._id
    });
    await defaultConfig.save();

    // Warehouses in Indian Cities
    const warehousesData = [
      { warehouseName: 'Mumbai Central Hub', city: 'Mumbai', latitude: 19.0760, longitude: 72.8777, capacity: 10000, activeStatus: true },
      { warehouseName: 'Delhi NCR Depot', city: 'Delhi', latitude: 28.7041, longitude: 77.1025, capacity: 15000, activeStatus: true },
      { warehouseName: 'Bangalore Tech Park Storage', city: 'Bangalore', latitude: 12.9716, longitude: 77.5946, capacity: 12000, activeStatus: true },
      { warehouseName: 'Chennai Coastal Warehouse', city: 'Chennai', latitude: 13.0827, longitude: 80.2707, capacity: 8000, activeStatus: true },
      { warehouseName: 'Hyderabad Logistics Center', city: 'Hyderabad', latitude: 17.3850, longitude: 78.4867, capacity: 9000, activeStatus: true },
    ];
    
    const warehouses = await Warehouse.insertMany(warehousesData);

    // Products
    const productsData = [
      { productName: 'Laptop', category: 'Electronics', sku: 'ELEC-LAP-001' },
      { productName: 'Smartphone', category: 'Electronics', sku: 'ELEC-PHO-002' },
      { productName: 'Headphones', category: 'Electronics', sku: 'ELEC-HDP-003' }
    ];

    const products = await Product.insertMany(productsData);

    // Inventory
    const inventoryData = [];
    for (const w of warehouses) {
      for (const p of products) {
        // Random available quantity between 5 and 50
        const randomQty = Math.floor(Math.random() * 46) + 5;
        inventoryData.push({
          warehouseId: w._id,
          productId: p._id,
          availableQuantity: randomQty,
          reservedQuantity: 0
        });
      }
    }

    // Explicitly make some low stock (< 10) to test the badge
    inventoryData[0].availableQuantity = 5;
    inventoryData[1].availableQuantity = 2;
    inventoryData[5].availableQuantity = 8; // some other warehouse

    await Inventory.insertMany(inventoryData);

    console.log('Database seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedData();
