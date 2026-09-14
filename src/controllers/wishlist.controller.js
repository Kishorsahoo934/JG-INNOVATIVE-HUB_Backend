import User from '../models/User.model.js';
import Product from '../models/Product.model.js';

// Get user's wishlist
export const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');
    res.json({ success: true, data: user.wishlist || [], message: '' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching wishlist' });
  }
};

// Add product to wishlist
export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ success: false, message: 'productId is required' });
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    const user = await User.findById(req.user._id);
    if (!user.wishlist.includes(productId)) {
      user.wishlist.push(productId);
      await user.save();
    }
    const populated = await User.findById(req.user._id).populate('wishlist');
    res.json({ success: true, data: populated.wishlist || [], message: '' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error adding to wishlist' });
  }
};

// Remove product from wishlist
export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!productId) return res.status(400).json({ success: false, message: 'productId is required' });
    const user = await User.findById(req.user._id);
    user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
    await user.save();
    const populated = await User.findById(req.user._id).populate('wishlist');
    res.json({ success: true, data: populated.wishlist || [], message: '' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error removing from wishlist' });
  }
};