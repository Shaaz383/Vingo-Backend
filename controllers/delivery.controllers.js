import ShopOrder from "../models/shopOrder.model.js";
import { socketIO, onlineUsers } from '../index.js'; // Ensure socketIO and onlineUsers are imported

/**
 * Get all orders assigned to the current delivery boy
 * @route GET /api/delivery/my-orders
 * @access Private
 */
export const getMyAssignedOrders = async (req, res) => {
  try {
    // Orders assigned to the current DB OR orders ready for DB assignment pool (status 'preparing' and not yet assigned)
    const orders = await ShopOrder.find({ 
        $or: [
            { 
                deliveryBoy: req.userId,
                // Assigned orders
                status: { $in: ['accepted', 'preparing', 'ready_for_pickup', 'out_for_delivery'] }
            },
            {
                // New requests for DB pool: Owner accepted (status is 'preparing') and no DB is assigned
                deliveryBoy: null,
                status: 'preparing' // <---- CRITICAL CHANGE: Only expose orders the owner has accepted
            }
        ]
    })
      .sort({ createdAt: -1 })
      .populate("order")
      .populate({
          path: "shop",
          select: "name address owner" 
      })
      .populate('deliveryBoy', 'fullName mobile profilePicture'); 

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
        .populate('deliveryBoy', 'fullName mobile profilePicture')
        .populate('shop'); // Populate shop to send comprehensive updates

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found or you are not assigned to it" });
    }

    // Add logic here to ensure valid status transitions (basic validation)
    const newStatus = status.toLowerCase();
    const validStatuses = ['ready_for_pickup', 'out_for_delivery', 'delivered'];
    
    if (!validStatuses.includes(newStatus)) {
        return res.status(400).json({ success: false, message: "Invalid status update for Delivery Boy" });
    }
    
    order.status = newStatus;
    await order.save();

    // Emit socket event to notify all relevant parties (User and Owner/Shop)
    socketIO.emit('orderStatusUpdated', {
        orderId: order.order?._id,
        shopOrderId: order._id,
        status: order.status,
        shopId: order.shop,
        deliveryBoy: order.deliveryBoy, 
        userId: order.order.user // Include user ID for potential future direct targeting
    });

    res.status(200).json({ success: true, message: "Order status updated successfully", order });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * Delivery boy accepts an order
 * @route PATCH /api/delivery/accept-order/:shopOrderId
 * @access Private (Delivery Boy)
 */
export const acceptOrder = async (req, res) => {
  try {
    const { shopOrderId } = req.params;
    const deliveryBoyId = req.userId;

    // Find and populate shop (including owner ID) and order (including user ID)
    let shopOrder = await ShopOrder.findById(shopOrderId)
        .populate({ path: 'shop', select: 'name owner' }) 
        .populate('order');

    if (!shopOrder) {
      return res.status(404).json({ success: false, message: "Shop order not found" });
    }

    // Check if the order is already assigned to a delivery boy OR is not in the pool state
    if (shopOrder.deliveryBoy) {
      return res.status(409).json({ success: false, message: "Order already accepted by another delivery boy" });
    }
    // CRITICAL CHANGE: Check if status is 'preparing' (the pool state set by the Owner)
    if (shopOrder.status !== 'preparing') {
        return res.status(400).json({ success: false, message: `Order status is '${shopOrder.status}'. Only orders in the 'preparing' status can be accepted by a Delivery Boy.` });
    }

    // Assign the current delivery boy and update status
    shopOrder.deliveryBoy = deliveryBoyId;
    shopOrder.status = 'accepted'; // Status changes from 'preparing' to 'accepted'
    await shopOrder.save();

    // Populate deliveryBoy for response and socket emission
    shopOrder = await shopOrder
      .populate('deliveryBoy', 'fullName mobile profilePicture');
      
    // 1. Notify the shop owner that the order has been accepted by a delivery boy
    const shopOwnerId = shopOrder.shop.owner.toString();
    const shopOwnerSocketId = onlineUsers.get(shopOwnerId);
    if (shopOwnerSocketId) {
      socketIO.to(shopOwnerSocketId).emit('orderAcceptedByDeliveryBoy', {
        shopOrderId: shopOrder._id,
        orderId: shopOrder.order._id,
        deliveryBoy: shopOrder.deliveryBoy,
        shopName: shopOrder.shop.name,
        status: shopOrder.status,
      });
      console.log(`Emitted 'orderAcceptedByDeliveryBoy' for shopOrder ${shopOrder._id} to shop owner ${shopOwnerId}`);
    } 
    
    // 2. Emit a general status update to notify the user (customer) and all others interested.
    socketIO.emit('orderStatusUpdated', {
        orderId: shopOrder.order?._id,
        shopOrderId: shopOrder._id,
        status: shopOrder.status,
        shopId: shopOrder.shop,
        deliveryBoy: shopOrder.deliveryBoy,
        userId: shopOrder.order.user
    });

    // 3. Emit an event to all delivery boys (or a specific room) to remove this order request
    socketIO.emit('orderRequestAccepted', { shopOrderId: shopOrder._id, acceptedBy: deliveryBoyId });


    res.status(200).json({ success: true, message: "Order accepted successfully", shopOrder });
  } catch (error) {
    console.error("Error accepting order:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};