import Order from "../models/order.model.js";
import ShopOrder from "../models/shopOrder.model.js";
import ShopOrderItem from "../models/shopOrderItem.model.js";
import Item from "../models/item.modal.js";
import Shop from "../models/shop.model.js";
import mongoose from "mongoose";

/**
 * Place a new order
 * @route POST /api/orders
 * @access Private
 */
export const placeOrder = async (req, res) => {
  try {
    const { items, deliveryAddress, payment, notes } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items are required" });
    }

    if (!deliveryAddress) {
      return res.status(400).json({ message: "Delivery address is required" });
    }

    // Get all item IDs from the request
    const itemIds = items.map(item => item.itemId);
    
    // Fetch all items from database in one query
    const itemsFromDB = await Item.find({ _id: { $in: itemIds } }).populate('shop');
    
    if (itemsFromDB.length !== itemIds.length) {
      return res.status(404).json({ message: "Some items not found" });
    }

    // Group items by shop
    const itemsByShop = {};
    
    itemsFromDB.forEach(item => {
      const shopId = item.shop._id.toString();
      
      if (!itemsByShop[shopId]) {
        itemsByShop[shopId] = {
          shop: item.shop,
          items: []
        };
      }
      
      // Find the quantity from the request
      const requestItem = items.find(reqItem => reqItem.itemId === item._id.toString());
      const quantity = requestItem ? requestItem.quantity : 0;
      
      if (quantity <= 0) {
        return res.status(400).json({ message: `Invalid quantity for item ${item.name}` });
      }
      
      // For testing purposes, temporarily disable stock validation
      // if (quantity > item.quantity) {
      //   return res.status(400).json({ message: `Not enough stock for item ${item.name}` });
      // }
      
      itemsByShop[shopId].items.push({
        item: item,
        quantity: quantity,
        priceAtPurchase: item.price,
        total: item.price * quantity
      });
    });

    // Calculate order totals
    let totalAmount = 0;
    let totalQuantity = 0;
    
    // Create the main order
    const order = new Order({
      user: req.userId, // Using userId from middleware
      deliveryAddress,
      payment: payment || { method: "COD", status: "pending" },
      notes,
      totalAmount: 0, // Will update after creating shop orders
      totalQuantity: 0, // Will update after creating shop orders
      shopOrders: []
    });
    
    // Create shop orders
    const shopOrderPromises = Object.values(itemsByShop).map(async (shopData) => {
      const { shop, items } = shopData;
      
      let subtotal = 0;
      let shopTotalQuantity = 0;
      
      items.forEach(item => {
        subtotal += item.total;
        shopTotalQuantity += item.quantity;
      });
      
      // Calculate tax and delivery fee (can be customized based on business logic)
      const tax = subtotal * 0.05; // 5% tax
      const deliveryFee = 40; // Fixed delivery fee
      const total = subtotal + tax + deliveryFee;
      
      // Update order totals
      totalAmount += total;
      totalQuantity += shopTotalQuantity;
      
      // Create shop order
      const shopOrder = new ShopOrder({
        order: order._id,
        shop: shop._id,
        subtotal,
        tax,
        deliveryFee,
        total,
        items: [] // Will be populated after creating shop order items
      });
      
      // Create shop order items
      const shopOrderItems = await Promise.all(items.map(async (item) => {
        const shopOrderItem = new ShopOrderItem({
          shopOrder: shopOrder._id,
          item: item.item._id,
          itemName: item.item.name,
          priceAtPurchase: item.priceAtPurchase,
          quantity: item.quantity,
          total: item.total
        });
        
        await shopOrderItem.save();
        return shopOrderItem;
      }));
      
      // Update shop order with items
      shopOrder.items = shopOrderItems.map(item => item._id);
      await shopOrder.save();
      
      // Update item quantities
      await Promise.all(items.map(async (item) => {
        await Item.findByIdAndUpdate(
          item.item._id,
          { $inc: { quantity: -item.quantity } }
        );
      }));
      
      return shopOrder;
    });
    
    const shopOrders = await Promise.all(shopOrderPromises);
    
    // Update the main order with totals and shop orders
    order.totalAmount = totalAmount;
    order.totalQuantity = totalQuantity;
    order.shopOrders = shopOrders.map(shopOrder => shopOrder._id);
    
    await order.save();
    
    // Fetch the complete order with populated data
    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: 'shopOrders',
        populate: {
          path: 'items',
          model: 'ShopOrderItem'
        }
      })
      .populate('user', 'name email');
    
    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: populatedOrder
    });
    
  } catch (error) {
    
    console.error("Error placing order:", error);
    return res.status(500).json({
      message: "Failed to place order",
      error: error.message
    });
  }
};

/**
 * Get all orders for the current user
 * @route GET /api/orders
 * @access Private
 */
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .populate({
        path: 'shopOrders',
        populate: [
          {
            path: 'shop',
            select: 'name image address'
          },
          {
            path: 'items',
            select: 'item itemName priceAtPurchase quantity total',
            populate: {
              path: 'item',
              select: 'name image price'
            }
          }
        ]
      })
      .populate('user', 'name email');
    
    return res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json({
      message: "Failed to fetch orders",
      error: error.message
    });
  }
};

/**
 * Get order by ID
 * @route GET /api/orders/:id
 * @access Private
 */
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate({
        path: 'shopOrders',
        populate: [
          {
            path: 'shop',
            select: 'name image address'
          },
          {
            path: 'items',
            populate: {
              path: 'item',
              select: 'name image'
            }
          }
        ]
      })
      .populate('user', 'name email');
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Check if the order belongs to the current user
    if (order.user.toString() !== req.userId) {
      return res.status(403).json({ message: "Not authorized to access this order" });
    }
    
    return res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    return res.status(500).json({
      message: "Failed to fetch order",
      error: error.message
    });
  }
};

/**
 * Get all orders for the shop owner
 * @route GET /api/orders/shop
 * @access Private (Shop Owner)
 */
export const getShopOrders = async (req, res) => {
  try {
    // Find shop owned by current user
    const shop = await Shop.findOne({ owner: req.userId });
    
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }
    
    // Find all shop orders for this shop
    const shopOrders = await ShopOrder.find({ shop: shop._id })
      .sort({ createdAt: -1 })
      .populate({
        path: 'order',
        populate: {
          path: 'user',
          select: 'fullName email phone'
        }
      })
      .populate('items')
      .populate({
        path: 'items',
        populate: {
          path: 'item',
          select: 'name image'
        }
      });
    
    return res.status(200).json({
      success: true,
      shopOrders
    });
  } catch (error) {
    console.error("Error fetching shop orders:", error);
    return res.status(500).json({
      message: "Failed to fetch shop orders",
      error: error.message
    });
  }
};

/**
 * Update shop order status
 * @route PATCH /api/orders/shop/:id/status
 * @access Private (Shop Owner)
 */
import { socketIO } from '../index.js';

export const updateShopOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }
    
    // Validate status
    const validStatuses = ['pending', 'accepted', 'rejected', 'preparing', 'out for delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ message: "Invalid status" });
    }
    
    // Find shop owned by current user
    const shop = await Shop.findOne({ owner: req.userId });
    
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }
    
    // Find the shop order and ensure it belongs to this shop
    const shopOrder = await ShopOrder.findById(req.params.id).populate('order');
    
    if (!shopOrder) {
      return res.status(404).json({ message: "Shop order not found" });
    }
    
    if (shopOrder.shop.toString() !== shop._id.toString()) {
      return res.status(403).json({ message: "Not authorized to update this order" });
    }
    
    // Update the status
    shopOrder.status = status.toLowerCase();
    await shopOrder.save();
    
    // Emit socket event for real-time updates
    socketIO.emit('orderStatusUpdated', {
      orderId: shopOrder.order?._id,
      shopOrderId: shopOrder._id,
      status: shopOrder.status,
      shopId: shopOrder.shop
    });
    
    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      shopOrder
    });
  } catch (error) {
    console.error("Error updating shop order status:", error);
    return res.status(500).json({
      message: "Failed to update order status",
      error: error.message
    });
  }
};