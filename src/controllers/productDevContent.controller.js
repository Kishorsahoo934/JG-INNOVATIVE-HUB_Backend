import ProductDevContent from '../models/ProductDevContent.model.js';

export const getAllContent = async (req, res, next) => {
  try {
    const { type } = req.query;
    const query = { isActive: true };
    if (type) query.type = type;

    const content = await ProductDevContent.find(query).sort({ order: 1, createdAt: 1 }).lean();

    res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    next(error);
  }
};

export const seedContent = async (req, res, next) => {
  try {
    await ProductDevContent.deleteMany({});

    const seedData = [
      // PROCESS STEPS
      { type: 'process', stepNumber: '01', title: 'Share Your Idea', description: 'Tell us about your project idea, problem statement, or product vision.', order: 1 },
      { type: 'process', stepNumber: '02', title: 'Requirement Discussion', description: 'Our engineers discuss feasibility, technology, timeline, and cost.', order: 2 },
      { type: 'process', stepNumber: '03', title: 'Project Confirmation', description: 'Our team reviews your request. Once approved, we contact you for complete project planning.', order: 3 },
      { type: 'process', stepNumber: '04', title: 'Design & Development', description: 'PCB Design · Embedded Firmware · Mechanical Design · Prototype Development', order: 4 },
      { type: 'process', stepNumber: '05', title: 'Testing & Delivery', description: 'Product Testing · Documentation · Manufacturing Support · Delivery', order: 5 },
      
      // SERVICES
      { type: 'service', title: 'Hardware Product Design', description: 'End-to-end design ownership from spec to shipping-grade product.', icon: 'Wrench', order: 1 },
      { type: 'service', title: 'Custom PCB Design', description: 'Multi-layer PCBs with SI/PI analysis, manufacturing-ready gerbers.', icon: 'CircuitBoard', order: 2 },
      { type: 'service', title: 'Embedded Systems Development', description: 'Bare-metal, RTOS, Linux — firmware written for reliability.', icon: 'Cpu', order: 3 },
      { type: 'service', title: 'IoT Product Development', description: 'Wi-Fi, BLE, LoRa, cellular. Edge + cloud in one stack.', icon: 'Wifi', order: 4 },
      { type: 'service', title: 'Rapid Prototyping', description: 'First working prototype in 2-4 weeks. Iterate fast, learn faster.', icon: 'Zap', order: 5 },
      { type: 'service', title: 'Mechanical Enclosure Design', description: 'CAD, 3D print, CNC and injection-mould ready enclosures.', icon: 'Box', order: 6 },
      { type: 'service', title: 'Robotics Development', description: 'Mobile robots, robotic arms, autonomous platforms.', icon: 'Bot', order: 7 },
      { type: 'service', title: 'Industrial Automation', description: 'PLC, HMI, SCADA and custom controller integration.', icon: 'Factory', order: 8 },
      { type: 'service', title: 'Reverse Engineering', description: 'Recreate, improve or replace legacy hardware safely.', icon: 'RefreshCcw', order: 9 },
      { type: 'service', title: 'Prototype Testing', description: 'EMI/EMC pre-compliance, environmental, functional, life-cycle.', icon: 'ShieldCheck', order: 10 },
      { type: 'service', title: 'Manufacturing Support', description: 'BOM sourcing, DFM, pilot runs, contract manufacturer coordination.', icon: 'Package', order: 11 },
      { type: 'service', title: 'Technical Consultation', description: 'Feasibility studies, tech selection, IP-friendly deep dives.', icon: 'Users', order: 12 },

      // FAQS
      { type: 'faq', title: 'How long does it take to build a prototype?', description: 'Typically, a first working prototype takes 2 to 4 weeks depending on the complexity of the PCB and firmware. We work in sprints to ensure you see progress quickly.', order: 1 },
      { type: 'faq', title: 'Do you sign Non-Disclosure Agreements (NDAs)?', description: 'Yes, absolutely. We respect your intellectual property and are happy to sign an NDA before you share any confidential details about your idea.', order: 2 },
      { type: 'faq', title: 'Who owns the Intellectual Property (IP) for the product?', description: 'You do. Once the project is paid for in full, all schematics, PCB design files, source code, and mechanical CAD files are transferred to you with full ownership.', order: 3 },
      { type: 'faq', title: 'Do you help with mass manufacturing?', description: 'Yes, we handle everything from Design for Manufacturing (DFM) to coordinating with assembly houses (PCBA) for small batch to mass production runs.', order: 4 },
    ];

    await ProductDevContent.insertMany(seedData);

    res.status(200).json({
      success: true,
      message: 'Demo content seeded successfully!',
      count: seedData.length
    });
  } catch (error) {
    next(error);
  }
};

