import mongoose from 'mongoose';
import Cart from '../models/Cart.model.js';
import Product from '../models/Product.model.js';

const getStock = (product) => {
  const val = Number(product?.stockQuantity ?? product?.stock);
  return isNaN(val) || val <= 0 ? 100 : val;
};

const isMatchingProduct = (item, targetIdOrSku) => {
  if (!item || !item.product || !targetIdOrSku) return false;
  const pObj = item.product;
  const pId = (pObj._id || pObj.id || pObj).toString();
  const pSku = (pObj.sku || '').toString();
  const pSlug = (pObj.slug || '').toString();
  const target = targetIdOrSku.toString();
  return pId === target || (pSku && pSku.toUpperCase() === target.toUpperCase()) || (pSlug && pSlug === target);
};

// Get user's cart
export const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate('products.product');
    res.json({ success: true, data: cart || { products: [] }, message: '' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching cart' });
  }
};

// Add item to cart
export const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    const product = mongoose.Types.ObjectId.isValid(productId)
      ? await Product.findById(productId)
      : await Product.findOne({ $or: [{ sku: productId }, { slug: productId }] });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    const stock = getStock(product);
    if (stock <= 0) {
      return res.status(400).json({ success: false, message: 'Product is out of stock' });
    }

    const realIdStr = product._id.toString();
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) cart = new Cart({ user: req.user._id, products: [] });

    const itemIndex = cart.products.findIndex(
      (i) => i.product && i.product.toString() === realIdStr
    );

    if (itemIndex > -1) {
      const next = cart.products[itemIndex].quantity + qty;
      cart.products[itemIndex].quantity = Math.min(next, stock);
      cart.products[itemIndex].priceSnapshot = product.sellingPrice;
    } else {
      const initial = Math.min(qty, stock);
      cart.products.push({
        product: product._id,
        priceSnapshot: product.sellingPrice,
        quantity: initial,
      });
    }
    await cart.save();
    const populated = await cart.populate('products.product');
    res.json({ success: true, data: populated, message: '' });
  } catch (err) {
    console.error('Error adding to cart:', err);
    res.status(500).json({ success: false, message: 'Error adding to cart' });
  }
};

// Set line quantity
export const updateCartItemQuantity = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, message: 'productId is required' });
    }
    const q = Math.floor(Number(quantity));
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    let targetIdStr = productId.toString();
    const productDoc = mongoose.Types.ObjectId.isValid(productId)
      ? await Product.findById(productId)
      : await Product.findOne({ $or: [{ sku: productId }, { slug: productId }] });
    if (productDoc) {
      targetIdStr = productDoc._id.toString();
    }

    const itemIndex = cart.products.findIndex(
      (i) => i.product && i.product.toString() === targetIdStr
    );

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Item not in cart' });
    }

    if (q < 1) {
      cart.products = cart.products.filter(
        (i) => i.product && i.product.toString() !== targetIdStr
      );
    } else {
      const stock = productDoc ? getStock(productDoc) : 100;
      const clamped = Math.min(q, stock);
      cart.products[itemIndex].quantity = clamped;
    }
    await cart.save();
    const populated = await cart.populate('products.product');
    res.json({ success: true, data: populated, message: '' });
  } catch (err) {
    console.error('Error updating cart:', err);
    res.status(500).json({ success: false, message: 'Error updating cart' });
  }
};

// Remove item from cart
export const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ success: false, message: 'productId is required' });
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    let targetIdStr = productId.toString();
    const targetProduct = mongoose.Types.ObjectId.isValid(productId)
      ? null
      : await Product.findOne({ $or: [{ sku: productId }, { slug: productId }] });
    if (targetProduct) {
      targetIdStr = targetProduct._id.toString();
    }

    cart.products = cart.products.filter(
      (i) => i.product && i.product.toString() !== targetIdStr
    );
    await cart.save();
    const populated = await cart.populate('products.product');
    res.json({ success: true, data: populated, message: '' });
  } catch (err) {
    console.error('Error removing from cart:', err);
    res.status(500).json({ success: false, message: 'Error removing from cart' });
  }
};

// Clear cart
export const clearCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
    cart.products = [];
    await cart.save();
    const populated = await cart.populate('products.product');
    res.json({ success: true, data: populated, message: '' });
  } catch (err) {
    console.error('Error clearing cart:', err);
    res.status(500).json({ success: false, message: 'Error clearing cart' });
  }
};
