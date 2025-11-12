import ShopOrder from "../models/shopOrder.model.js";
import { socketIO } from '../index.js'; // Ensure socketIO is imported

/**
 * Get all orders assigned to the current delivery boy
 * @route GET /api/delivery/my-orders
 * @access Private
 */
export const getMyAssignedOrders = async (req, res) => {
  try {
    // Only fetch orders that are 'pending' or 'accepted' so the delivery boy can interact
    const orders = await ShopOrder.find({ 
        deliveryBoy: req.userId,
        status: { $in: ['pending', 'accepted', 'preparing', 'ready_for_pickup', 'out_for_delivery'] }
    })
      .sort({ createdAt: -1 })
      .populate("order")
      .populate("shop")
      .populate('deliveryBoy', 'fullName mobile profilePicture'); // Include DB details

    res.status(200).json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * Update the status of an order
 * @route PATCH /api/delivery/:orderId/status
 * @access Private
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { orderId } = req.params;

    // Find the shop order and populate order/deliveryBoy details
    const order = await ShopOrder.findOne({ _id: orderId, deliveryBoy: req.userId })
        .populate('order')
        .populate('deliveryBoy', 'fullName mobile profilePicture');

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found or you are not assigned to it" });
    }

    // Add logic here to ensure valid status transitions
    order.status = status;
    await order.save();

    // Emit socket event to notify all relevant parties (User and Owner/Shop)
    socketIO.emit('orderStatusUpdated', {
        orderId: order.order?._id,
        shopOrderId: order._id,
        status: order.status,
        shopId: order.shop,
        deliveryBoy: order.deliveryBoy, // Include DB details
        userId: order.order.user // Include user ID for potential future direct targeting
    });

    res.status(200).json({ success: true, message: "Order status updated successfully", order });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};