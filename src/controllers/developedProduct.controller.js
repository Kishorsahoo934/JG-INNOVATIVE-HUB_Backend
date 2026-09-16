import DevelopedProduct from '../models/DevelopedProduct.model.js';
import mongoose from 'mongoose';

// GET ALL DEVELOPED PRODUCTS
export const getAllDevelopedProducts = async (req, res, next) => {
  try {
    const { category, search, status, limit, skip } = req.query;
    
    const query = req.query.admin === 'true' ? {} : { isActive: true };

    if (category) query.category = category;
    if (status) query.status = status;

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { tag: searchRegex },
        { features: { $in: [searchRegex] } }
      ];
    }

    let queryBuilder = DevelopedProduct.find(query).sort({ createdAt: -1 });

    if (skip) queryBuilder = queryBuilder.skip(Number(skip));
    if (limit) queryBuilder = queryBuilder.limit(Number(limit));

    const products = await queryBuilder.lean();
    const total = await DevelopedProduct.countDocuments(query);

    res.status(200).json({
      success: true,
      data: products,
      total
    });
  } catch (error) {
    next(error);
  }
};

// GET DEVELOPED PRODUCT BY ID
export const getDevelopedProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID format' });
    }

    const product = await DevelopedProduct.findOne({ _id: id, isActive: true });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product Development item not found' });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// SEED DEMO DATA
export const seedDevelopedProducts = async (req, res, next) => {
  try {
    // Clear existing
    await DevelopedProduct.deleteMany({});

    const demoData = [
      {
        name: 'Industrial IoT Telemetry Node',
        description: 'Custom ESP32 & SIM7600 based multi-sensor loggers configured for real-time remote environmental data logging with cloud dashboard.',
        longDescription: `<h3>Overview</h3>
<p>The Industrial IoT Telemetry Node is a robust data logging solution built around the powerful ESP32 microcontroller and SIM7600 LTE module. It is engineered to perform reliably in harsh environmental conditions, making it the ideal choice for remote monitoring applications.</p>
<h3>Technical Specifications</h3>
<ul>
<li><strong>Microcontroller:</strong> ESP32 Dual-Core @ 240MHz</li>
<li><strong>Connectivity:</strong> 4G LTE (SIM7600), Wi-Fi, Bluetooth BLE</li>
<li><strong>Power:</strong> 12V-24V DC input with Solar Charge Controller support</li>
<li><strong>Sensors Supported:</strong> Modbus RS485, I2C, SPI, Analog 4-20mA</li>
</ul>
<h3>Use Cases</h3>
<p>Widely deployed in smart agriculture for soil moisture tracking, pipeline pressure monitoring, and remote weather stations. The integrated cloud dashboard allows real-time data visualization and SMS alerting.</p>`,
        tag: 'IoT Gateway',
        category: 'iot',
        images: [{ url: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=800&q=80' }],
        features: ['ESP32 + SIM7600', 'Multi-sensor', 'Cloud Dashboard', 'Real-time Logging'],
        status: 'Available'
      },
      {
        name: 'Heavy-Duty 4WD Robot Rover Chassis',
        description: 'Anodized aluminum structural plates with shock absorbers, customized for autonomous robotics navigation stacks and terrain mapping.',
        longDescription: `<h3>Overview</h3>
<p>Designed for academic research and industrial prototyping, this 4-Wheel Drive robot chassis provides a rugged platform for autonomous navigation. It supports heavy payloads such as LiDARs, depth cameras, and robotic arms.</p>
<h3>Mechanical Design</h3>
<p>Constructed from 4mm 6061-T6 anodized aluminum, the chassis features independent suspension on all four wheels. Each wheel is driven by a high-torque 12V DC motor equipped with high-resolution magnetic encoders for precise odometry.</p>
<h3>ROS Integration</h3>
<p>The rover is fully compatible with ROS1 and ROS2 (Robot Operating System). We provide base URDF models and serial bridging firmware to connect the low-level motor controllers to higher-level navigation stacks (like Navigation2) running on a Jetson Nano or Raspberry Pi.</p>`,
        tag: 'Robotics Hardware',
        category: 'robotics',
        images: [{ url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80' }],
        features: ['4WD Drive', 'Shock Absorbers', 'Aluminum Frame', 'Autonomous Ready'],
        status: 'Available'
      },
      {
        name: 'Custom STM32 Development Board',
        description: 'Bespoke PCB designs containing low-noise analog rails, integrated battery management, UART modules, and debugging interfaces.',
        longDescription: `<h3>Overview</h3>
<p>Our custom STM32 development board is engineered for advanced embedded systems that require strict noise isolation and reliable power management. It serves as an excellent foundation for custom wearables, medical devices, and high-frequency data acquisition systems.</p>
<h3>Power Management</h3>
<p>Features an onboard TI BQ25895 battery management IC, supporting 3A fast charging for single-cell Li-Po batteries. The analog sensors are powered by dedicated ultra-low noise LDOs (Low Dropout Regulators) to ensure clean ADC readings.</p>
<h3>Debugging & Interfaces</h3>
<p>Includes an onboard ST-LINK V2.1 clone for seamless drag-and-drop programming and SWD debugging. Breakout pins expose multiple UART, SPI, and I2C buses with level shifters for easy integration with 3.3V and 5V peripherals.</p>`,
        tag: 'Custom PCB',
        category: 'pcb',
        images: [{ url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80' }],
        features: ['STM32 MCU', 'Low-noise Rails', 'Battery Management', 'UART Debug'],
        status: 'Available'
      },
      {
        name: 'STEM Interactive Robotics Kit',
        description: 'Educational microcontroller combo packages designed for high schools to teach embedded firmware programming with hands-on projects.',
        longDescription: `<h3>Overview</h3>
<p>The STEM Interactive Robotics Kit bridges the gap between theoretical computer science and practical hardware engineering. It provides educators with a complete curriculum-in-a-box solution for high school and early college classrooms.</p>
<h3>What's Inside</h3>
<p>The kit includes an Arduino-compatible master board, a variety of sensors (ultrasonic, line-tracking, light, temperature), servo motors, and mechanical building blocks. Everything snaps together seamlessly without the need for soldering.</p>
<h3>Curriculum Integration</h3>
<p>Comes with a 12-week lesson plan covering everything from basic blinking LEDs and sensor reading, to PID line following and Bluetooth remote control. Programming can be done via drag-and-drop block interfaces or standard C++.</p>`,
        tag: 'STEM Education',
        category: 'education',
        images: [{ url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80' }],
        features: ['Arduino Based', 'Lesson Plans', 'Beginner Friendly', 'Hands-on Labs'],
        status: 'Available'
      },
      {
        name: 'Smart Agriculture Monitoring System',
        description: 'Solar-powered IoT solution with soil moisture, temperature, and humidity sensors for precision farming with mobile app alerts.',
        longDescription: `<h3>Overview</h3>
<p>Precision farming requires precise data. This Smart Agriculture Monitoring System is a standalone, solar-powered node that continuously logs critical soil and atmospheric metrics to help farmers optimize irrigation and increase crop yields.</p>
<h3>Sensor Suite</h3>
<ul>
<li><strong>Capacitive Soil Moisture:</strong> Corrosion-resistant sensors for accurate volumetric water content (VWC).</li>
<li><strong>Atmospheric:</strong> SHT31 sensor for highly accurate ambient temperature and relative humidity.</li>
<li><strong>Light:</strong> PAR (Photosynthetically Active Radiation) sensor to monitor crop light exposure.</li>
</ul>
<h3>Power & Connectivity</h3>
<p>Powered by a 5W monocrystalline solar panel and a 3.7V 10,000mAh Li-ion battery, ensuring indefinite operation in the field. Data is transmitted via LoRaWAN up to 10km to a central gateway, keeping cellular data costs at zero.</p>`,
        tag: 'AgriTech',
        category: 'iot',
        images: [{ url: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=800&q=80' }],
        features: ['Solar Powered', 'Soil Sensors', 'Mobile Alerts', 'Weather Proof'],
        status: 'Coming Soon'
      },
      {
        name: 'Custom Drone Flight Controller',
        description: 'In-house designed flight controller PCB with IMU, GPS, barometer, and ESC interfaces for custom drone builds and aerial robotics.',
        longDescription: `<h3>Overview</h3>
<p>Our Custom Drone Flight Controller is a high-performance brain for custom multirotors and fixed-wing UAVs. Designed for researchers who need direct access to low-level flight dynamics without dealing with closed-source commercial systems.</p>
<h3>Avionics Architecture</h3>
<p>Built around an STM32F4 series MCU running at 168MHz. It integrates dual redundant ICM-20602 IMUs, a high-precision MS5611 barometer, and dedicated hardware filtering for vibration rejection.</p>
<h3>Firmware Compatibility</h3>
<p>Fully compatible with Betaflight, INAV, and ArduPilot. The board exposes 8 motor/servo PWM outputs, 6 UARTs, and an I2C bus for external compasses and GPS modules (u-blox M8N/M10 supported natively).</p>`,
        tag: 'Drone Tech',
        category: 'robotics',
        images: [{ url: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=800&q=80' }],
        features: ['IMU + GPS', 'Barometer', 'ESC Interface', 'PID Tuning'],
        status: 'Available'
      }
    ];

    await DevelopedProduct.insertMany(demoData);

    res.status(200).json({
      success: true,
      message: 'Demo data seeded successfully!',
      count: demoData.length
    });
  } catch (error) {
    next(error);
  }
};

const normalizeMedia = (list) => {
  if (!list) return [];
  const arr = Array.isArray(list) ? list : [list];
  return arr
    .map((item) => {
      if (!item) return null;
      if (typeof item === 'string') {
        const url = item.trim();
        return url ? { url, publicId: '' } : null;
      }
      if (typeof item === 'object') {
        const url = (item.url || item.secure_url || '').toString().trim();
        if (!url) return null;
        const publicId = (item.publicId || item.public_id || '').toString();
        return { url, publicId };
      }
      return null;
    })
    .filter(Boolean);
};

// ADMIN: CREATE DEVELOPED PRODUCT
export const createDevelopedProduct = async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (body.images) body.images = normalizeMedia(body.images);
    const product = new DevelopedProduct(body);
    await product.save();
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// ADMIN: UPDATE DEVELOPED PRODUCT
export const updateDevelopedProduct = async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (body.images) body.images = normalizeMedia(body.images);
    const product = await DevelopedProduct.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// ADMIN: DELETE DEVELOPED PRODUCT
export const deleteDevelopedProduct = async (req, res, next) => {
  try {
    const product = await DevelopedProduct.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (error) {
    next(error);
  }
};



