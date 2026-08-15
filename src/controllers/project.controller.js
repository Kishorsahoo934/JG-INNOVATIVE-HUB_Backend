import Product from '../models/Product.model.js';
import mongoose from 'mongoose';

// GET ALL PROJECTS with search and filtering
export const getAllProjects = async (req, res, next) => {
  try {
    const { search, projectType, difficulty, components, minPrice, maxPrice, sort } = req.query;

    const query = { isProject: true, status: 'active' };

    // Search by name, description, or components
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { shortDescription: searchRegex },
        { longDescription: searchRegex },
        { components: { $in: [searchRegex] } }
      ];
    }

    // Filter by project type (combo_components or ready_made)
    if (projectType) {
      query.projectType = projectType;
    }

    // Filter by difficulty
    if (difficulty) {
      query.difficulty = difficulty;
    }

    // Filter by components (comma separated values, e.g. "Arduino Uno,Servo")
    if (components) {
      const componentList = components.split(',').map(c => c.trim()).filter(Boolean);
      if (componentList.length > 0) {
        // Match projects containing any of the filtered components
        query.components = { $in: componentList.map(c => new RegExp(c, 'i')) };
      }
    }

    // Filter by price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.sellingPrice = {};
      if (minPrice !== undefined) query.sellingPrice.$gte = Number(minPrice);
      if (maxPrice !== undefined) query.sellingPrice.$lte = Number(maxPrice);
    }

    // Sorting
    let sortOption = { createdAt: -1 };
    if (sort === 'price-low') sortOption = { sellingPrice: 1 };
    else if (sort === 'price-high') sortOption = { sellingPrice: -1 };
    else if (sort === 'name') sortOption = { name: 1 };

    const projects = await Product.find(query).sort(sortOption).lean();

    res.status(200).json({
      success: true,
      data: projects
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL UNIQUE COMPONENTS across all active projects
export const getProjectComponents = async (req, res, next) => {
  try {
    const components = await Product.distinct('components', { isProject: true, status: 'active' });
    const sortedComponents = components.filter(Boolean).sort();
    res.status(200).json({
      success: true,
      data: sortedComponents
    });
  } catch (error) {
    next(error);
  }
};

// GET SINGLE PROJECT BY ID
export const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { _id: id, isProject: true } : { sku: id.toUpperCase(), isProject: true };

    const project = await Product.findOne(query);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    res.status(200).json({
      success: true,
      data: project
    });
  } catch (error) {
    next(error);
  }
};

// ADMIN: GET ALL PROJECTS (without active status restriction)
export const getAdminProjects = async (req, res, next) => {
  try {
    const projects = await Product.find({ isProject: true }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: projects
    });
  } catch (error) {
    next(error);
  }
};

// Normalize media array (images or videos): URLs or { url, publicId }
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

// ADMIN: CREATE PROJECT
export const createProject = async (req, res, next) => {
  try {
    const {
      name,
      sku,
      shortDescription,
      longDescription,
      mrp,
      sellingPrice,
      gstMode,
      gstPercentage,
      stockQuantity,
      images,
      videos,
      projectType,
      components,
      difficulty,
      estimatedBuildTime,
      documentation,
      status
    } = req.body;

    if (!name || !sku || !shortDescription || mrp === undefined || sellingPrice === undefined || !projectType) {
      return res.status(400).json({
        success: false,
        message: 'Name, SKU, Short Description, MRP, Selling Price, and Project Type are required'
      });
    }

    // Process components list if it is sent as string/comma-separated
    let parsedComponents = [];
    if (Array.isArray(components)) {
      parsedComponents = components;
    } else if (typeof components === 'string') {
      parsedComponents = components.split(',').map(c => c.trim()).filter(Boolean);
    }

    const project = await Product.create({
      name,
      sku: sku.toUpperCase(),
      shortDescription,
      longDescription,
      mrp,
      sellingPrice,
      gstMode: gstMode || 'including',
      gstPercentage: gstPercentage || 18,
      stockQuantity: stockQuantity || 0,
      images: normalizeMedia(images),
      videos: normalizeMedia(videos),
      isProject: true,
      projectType,
      components: parsedComponents,
      difficulty: difficulty || 'beginner',
      estimatedBuildTime: estimatedBuildTime || '',
      documentation: documentation || '',
      status: status || 'active'
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project
    });
  } catch (error) {
    next(error);
  }
};

// ADMIN: UPDATE PROJECT
export const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await Product.findOne({ _id: id, isProject: true });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const updates = { ...req.body };
    
    if (updates.sku) {
      updates.sku = updates.sku.toUpperCase();
    }

    if (updates.components) {
      if (typeof updates.components === 'string') {
        updates.components = updates.components.split(',').map(c => c.trim()).filter(Boolean);
      }
    }

    if (updates.images !== undefined) {
      updates.images = normalizeMedia(updates.images);
    }
    if (updates.videos !== undefined) {
      updates.videos = normalizeMedia(updates.videos);
    }

    const updatedProject = await Product.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: updatedProject
    });
  } catch (error) {
    next(error);
  }
};

// ADMIN: DELETE PROJECT
export const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await Product.findOne({ _id: id, isProject: true });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    await Product.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

const dummyProjects = [
  {
    name: 'Obstacle Avoiding Robotic Car Kit',
    sku: 'PR-OBST-AVOID-01',
    shortDescription: 'Build an autonomous 2-wheel drive robot car that detects and avoids obstacles using ultrasonic sensors.',
    longDescription: `<h3>Unleash your inner roboticist with this beginner-friendly kit!</h3><p>The Obstacle Avoiding Robot Car is a classic project for students and hobbyists getting started with Arduino, sensors, and motor control. The robot uses an ultrasonic sensor mounted on a servo motor to "look around" for obstacles, calculates distance, and autonomously decides whether to move forward, reverse, or turn.</p><p>This kit includes all the components, wires, chassis plates, and motors required to build a fully functional autonomous car from scratch. No advanced soldering is required, making it perfect for kids and classroom setups.</p>`,
    mrp: 1999,
    sellingPrice: 1299,
    gstMode: 'including',
    gstPercentage: 18,
    stockQuantity: 15,
    images: [
      { url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=600' }
    ],
    isProject: true,
    projectType: 'combo_components',
    components: [
      'Arduino Uno R3 Compatible Board',
      'HC-SR04 Ultrasonic Sensor Module',
      'SG90 Micro Servo Motor',
      'L298N Double H-Bridge Motor Driver',
      '2WD Acrylic Smart Car Chassis Plate',
      'High-Speed BO Motors (x2)',
      'High-Grip Rubber Wheels (x2)',
      'Caster Wheel',
      '4xAA Battery Holder',
      'HC-SR04 Servo Mount Bracket',
      'Solderless Jumper Wires (M-M, M-F, F-F)'
    ],
    difficulty: 'beginner',
    estimatedBuildTime: '3 hours',
    documentation: `<h3>Step-by-Step Assembly Guide</h3><ol><li><strong>Chassis Assembly:</strong> Peel off the protective film from the acrylic plates. Mount the BO motors using the provided long screws and brackets. Attach the caster wheel to the front.</li><li><strong>Mounting Hardware:</strong> Secure the Arduino Uno R3 board and the L298N motor driver module onto the top chassis plate.</li><li><strong>Wiring:</strong> Connect the motors to L298N outputs. Wire L298N inputs to Arduino pins 5, 6, 9, and 10. Wire the HC-SR04 ultrasonic sensor to Trigger pin 11 and Echo pin 12.</li><li><strong>Power Setup:</strong> Connect the battery holder positive wire to the L298N 12V terminal, and the negative wire to GND. Bridge GND from L298N to Arduino GND. Output 5V from L298N to Arduino Vin.</li><li><strong>Calibrating code:</strong> Open Arduino IDE, load the custom sketch, calibrate the servo center, and upload.</li></ol><h3>Sample Arduino Source Code</h3><pre><code>#include &lt;Servo.h&gt;\nconst int trigPin = 11;\nconst int echoPin = 12;\n// Add your full motor steering function...\n</code></pre>`
  },
  {
    name: 'Smart Home Automation Kit (IoT)',
    sku: 'PR-IOT-HOME-02',
    shortDescription: 'Control lights, fans, and monitor temperature over WiFi with Blynk and ESP32 microcontroller.',
    longDescription: `<h3>Step into the world of Smart Living and IoT!</h3><p>This DIY Smart Home Kit teaches you how to connect everyday household appliances to the cloud. Powered by the ESP32 NodeMCU microcontroller, you will build an internet-connected relay board to control virtual appliances, monitor ambient temperature/humidity, and activate warning buzzers.</p><p>Learn to integrate microcontrollers with IoT dashboards like Blynk IoT, Adafruit IO, or Node-RED, and write custom firmware blocks to automate your home based on sensory feedback (e.g. automatically turn on a cooling fan if temperature exceeds 30°C).</p>`,
    mrp: 2499,
    sellingPrice: 1899,
    gstMode: 'including',
    gstPercentage: 18,
    stockQuantity: 20,
    images: [
      { url: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&q=80&w=600' }
    ],
    isProject: true,
    projectType: 'combo_components',
    components: [
      'ESP32 NodeMCU WiFi + Bluetooth Board',
      'DHT11 Temperature & Humidity Sensor Module',
      '4-Channel 5V Relay Shield Module',
      'LDR Light Dependent Resistor Module',
      'Active Piezo Warning Buzzer',
      '5V DC Mini Cooling Fan',
      'Full-Size 830-Point Solderless Breadboard',
      'Premium Hook-up Wire Bundle',
      'USB Data Cable'
    ],
    difficulty: 'intermediate',
    estimatedBuildTime: '5 hours',
    documentation: `<h3>IoT Dashboard Setup & Coding Guide</h3><p>Follow these quick configurations to get your cloud connected relay working:</p><ol><li><strong>Cloud Config:</strong> Create an account on Blynk.cloud. Setup a new Template named "Smart Home" and add datastreams for V1 (Relay 1), V2 (Relay 2), and V3 (Temperature).</li><li><strong>Wiring:</strong> Pin ESP32 GPIO 23 to Relay 1 IN, GPIO 22 to Relay 2 IN. Connect DHT11 Out to GPIO 4. Connect LDR Analog output to Pin VP (GPIO 36).</li><li><strong>Library installation:</strong> Install Blynk, DHT, and Adafruit Unified Sensor libraries in Arduino IDE.</li><li><strong>Compile and flash:</strong> Fill in your Wi-Fi SSID, password, and Blynk Auth Token into the code and compile.</li></ol><h3>Sample Blynk ESP32 Sketch</h3><pre><code>#define BLYNK_TEMPLATE_ID "TMPLxxxx"\n#define BLYNK_DEVICE_NAME "Smart Home"\n#include &lt;WiFi.h&gt;\n#include &lt;BlynkSimpleEsp32.h&gt;\n</code></pre>`
  },
  {
    name: 'Bluetooth RC Robotic Arm (Pre-Assembled)',
    sku: 'PR-BT-ARM-03',
    shortDescription: 'A fully assembled, pre-programmed 4-degree-of-freedom robotic arm controlled wirelessly from your mobile phone.',
    longDescription: `<h3>Take direct control over mechanical motion!</h3><p>Skip the tedious hardware assembly and dive straight into kinematics, control loops, and wireless apps. The Bluetooth RC Robotic Arm comes fully pre-assembled, structured in premium laser-cut acrylic plates, and pre-programmed on an Arduino board.</p><p>Simply download our custom Android remote controller app, pair your smartphone to the HC-05 Bluetooth module, and control base rotation, shoulder joint height, elbow joint reach, and mechanical gripper claws in real-time. Excellent for exhibition displays and wireless control demonstrations.</p>`,
    mrp: 6999,
    sellingPrice: 4999,
    gstMode: 'including',
    gstPercentage: 18,
    stockQuantity: 8,
    images: [
      { url: 'https://images.unsplash.com/photo-1617791160505-6f006e121980?auto=format&fit=crop&q=80&w=600' }
    ],
    isProject: true,
    projectType: 'ready_made',
    components: [
      'Pre-Assembled Acrylic Robotic Arm Frame',
      'Arduino Uno R3 Microcontroller Board',
      'TowerPro SG90 9g Metal Gear Servos (x4)',
      'HC-05 Bluetooth serial transceiver',
      'Sensor Shield V5.0 Expansion Board',
      '5V 2A Regulated DC Power Adapter',
      'Laser-cut Claws with high-friction silicone pads'
    ],
    difficulty: 'intermediate',
    estimatedBuildTime: '1 hour',
    documentation: `<h3>App Setup & Operation Guide</h3><ol><li><strong>Power Supply:</strong> Connect the provided 5V 2A power adapter into the black barrel jack of the Arduino Sensor Shield. DO NOT power servos using USB only as it will crash.</li><li><strong>App installation:</strong> Download the "Innovative Arm Controller" APK from our portal, install on an Android device, and grant Bluetooth location permissions.</li><li><strong>Pairing:</strong> Turn on Bluetooth, scan for new devices, pair to \'HC-05\' using pin <code>1234</code>.</li><li><strong>Operation:</strong> Open the app, click connect, select HC-05, and use sliders to manipulate servo angles. Use claws to pick up lightweight paper cups or objects.</li></ol>`
  },
  {
    name: 'Autonomous GPRS GPS Tracker Node',
    sku: 'PR-GPS-TRACK-04',
    shortDescription: 'An assembled, weather-resistant IoT tracking node that posts live coordinates to dynamic maps over 2G/GPRS cellular network.',
    longDescription: `<h3>Track anything, anywhere, in real-time!</h3><p>The Autonomous GPS Tracker Node is a complete, rugged, field-testable tracking unit built for outdoor asset location monitoring. The unit is housed in a durable IP65-rated ABS enclosure and is powered by rechargeable Li-ion batteries.</p><p>The system works by reading NMEA sentences from the NEO-6M GPS satellite receiver, decoding the latitude/longitude, and using the SIM800L cellular GSM modem to POST coordinate payloads to cloud map APIs over cellular GPRS networks. A 0.96-inch OLED screen provides visual status checks on GSM signal quality and battery charge level.</p>`,
    mrp: 4499,
    sellingPrice: 3499,
    gstMode: 'including',
    gstPercentage: 18,
    stockQuantity: 10,
    images: [
      { url: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&q=80&w=600' }
    ],
    isProject: true,
    projectType: 'ready_made',
    components: [
      'Pre-Assembled GPS Tracker Node PCB Board',
      'NEO-6M GPS Module with ceramic patch antenna',
      'SIM800L GPRS/GSM Modem Module with spiral antenna',
      'Arduino Nano Microcontroller Core',
      '0.96" SSD1306 I2C OLED display screen',
      '3.7V 18650 Li-ion batteries (x2) with charging board',
      'IP65 ABS Weatherproof enclosure housing'
    ],
    difficulty: 'advanced',
    estimatedBuildTime: '2 hours',
    documentation: `<h3>Field Operation Instructions</h3><ol><li><strong>SIM Card Insertion:</strong> Open the ABS enclosure. Insert a 2G-enabled Micro SIM card (ensure PIN lock is disabled and has GPRS data package active).</li><li><strong>Powering:</strong> Flip the toggle switch to \'ON\'. The red LED on SIM800L will blink rapidly. Wait for it to blink once every 3 seconds, which indicates successful cellular registration.</li><li><strong>Satellite lock:</strong> Take the node outdoors with a clear view of the sky. The OLED screen will show "Acquiring Satellites...". The GPS module LED will start blinking once satellite lock is acquired (takes 30s - 2min).</li><li><strong>Cloud viewing:</strong> Log into our tracking dashboard at map.innovativehub.com, enter the SIM mobile number as Node ID, and view real-time location markers updated every 10 seconds.</li></ol>`
  }
];

export const seedProjects = async (req, res, next) => {
  try {
    const skus = dummyProjects.map((p) => p.sku);
    await Product.deleteMany({ sku: { $in: skus } });
    const inserted = await Product.create(dummyProjects);
    res.status(200).json({
      success: true,
      message: `Seeded ${inserted.length} projects successfully`,
      data: inserted
    });
  } catch (error) {
    next(error);
  }
};
