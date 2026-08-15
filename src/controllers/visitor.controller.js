import Visitor from '../models/Visitor.model.js';

// GET CURRENT VISITOR COUNT
export const getVisitorCount = async (req, res, next) => {
  try {
    let visitor = await Visitor.findOne({ name: 'visitors' });
    if (!visitor) {
      visitor = await Visitor.create({ name: 'visitors', count: 153245 });
    }
    res.status(200).json({
      success: true,
      count: visitor.count
    });
  } catch (error) {
    next(error);
  }
};

// INCREMENT VISITOR COUNT
export const incrementVisitorCount = async (req, res, next) => {
  try {
    const visitor = await Visitor.findOneAndUpdate(
      { name: 'visitors' },
      { $inc: { count: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({
      success: true,
      count: visitor.count
    });
  } catch (error) {
    next(error);
  }
};
