import Gallery from '../models/Gallery.model.js';

const dummyGalleryItems = [
  {
    title: 'Robotics Workshop',
    category: 'workshops',
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80',
    description: 'Students building and programming autonomous mobile robots during our weekend bootcamp.'
  },
  {
    title: 'IoT Circuit Bench',
    category: 'lab',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    description: 'Testing sensor integration and wireless telemetry modules on custom PCB designs.'
  },
  {
    title: 'Embedded Firmware Coding',
    category: 'projects',
    image: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=800&q=80',
    description: 'Debugging driver code for microcontrollers and real-time operating systems.'
  },
  {
    title: 'Student Innovation Summit',
    category: 'events',
    image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
    description: 'Makers demonstrating their prototypes to industry experts and judges.'
  },
  {
    title: 'Drone Assembly and Calibration',
    category: 'projects',
    image: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=800&q=80',
    description: 'Hands-on training session on quadcopter frame assembly and PID tuning.'
  },
  {
    title: '3D Prototyping Station',
    category: 'lab',
    image: 'https://images.unsplash.com/photo-1615840287214-7fe58a8f3685?auto=format&fit=crop&w=800&q=80',
    description: 'Additive manufacturing workshop creating custom brackets for robotic arms.'
  },
  {
    title: 'Arduino Basics Lab',
    category: 'workshops',
    image: 'https://images.unsplash.com/photo-1553406830-ef251367749c?auto=format&fit=crop&w=800&q=80',
    description: 'High school students learning digital inputs, PWM, and motor driver fundamentals.'
  },
  {
    title: 'Hardware Hackathon',
    category: 'events',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
    description: '24-hour non-stop building, testing, and pitching smart IoT appliances.'
  }
];

export const getGalleryItems = async (req, res, next) => {
  try {
    let items = await Gallery.find().sort({ createdAt: -1 });
    
    // Auto-seed if database is empty
    if (items.length === 0) {
      await Gallery.insertMany(dummyGalleryItems);
      items = await Gallery.find().sort({ createdAt: -1 });
    }
    
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

export const createGalleryItem = async (req, res, next) => {
  try {
    const { title, description, category, image } = req.body;
    
    if (!title || !description || !category || !image) {
      return res.status(400).json({
        success: false,
        message: 'All fields (title, description, category, image) are required'
      });
    }
    
    if (!['workshops', 'projects', 'lab', 'events'].includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category. Must be one of workshops, projects, lab, events.'
      });
    }
    
    const item = await Gallery.create({
      title,
      description,
      category,
      image
    });
    
    res.status(201).json({
      success: true,
      message: 'Gallery item added successfully',
      data: item
    });
  } catch (error) {
    next(error);
  }
};

export const deleteGalleryItem = async (req, res, next) => {
  try {
    const item = await Gallery.findByIdAndDelete(req.params.id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Gallery item not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Gallery item deleted successfully',
      data: item
    });
  } catch (error) {
    next(error);
  }
};
