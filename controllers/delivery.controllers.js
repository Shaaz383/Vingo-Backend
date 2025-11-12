import ShopOrder from "../models/shopOrder.model.js";
import { socketIO, onlineUsers } from '../index.js'; // Ensure socketIO and onlineUsers are imported

/**
 * Get all orders assigned to the current delivery boy
 * @route GET /api/delivery/my-orders
 * @access Private
 */
export const getMyAssignedOrders = async (req, res) => {
  try {
    const orders = await ShopOrder.find({ 
        $or: [
            { 
                deliveryBoy: req.userId,
                status: { $in: ['accepted', 'preparing', 'ready_for_pickup', 'out_for_delivery'] }
            },
            {
                deliveryBoy: null,
                status: 'pending'
            }
        ]
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

/**
 * Delivery boy accepts an order
 * @route PATCH /api/delivery/accept-order/:shopOrderId
 * @access Private (Delivery Boy)
 */
export const acceptOrder = async (req, res) => {
  try {
    const { shopOrderId } = req.params;
    const deliveryBoyId = req.userId;

    let shopOrder = await ShopOrder.findById(shopOrderId).populate('shop');

    if (!shopOrder) {
      return res.status(404).json({ success: false, message: "Shop order not found" });
    }

    // Check if the order is already assigned to a delivery boy
    if (shopOrder.deliveryBoy) {
      return res.status(409).json({ success: false, message: "Order already accepted by another delivery boy" });
    }

    // Assign the current delivery boy and update status
    shopOrder.deliveryBoy = deliveryBoyId;
    shopOrder.status = 'accepted'; // Or a new status like 'delivery_accepted'
    await shopOrder.save();

    // Populate for response and socket emission
    shopOrder = await shopOrder
      .populate('order')
      .populate('deliveryBoy', 'fullName mobile profilePicture');

    // Notify the shop owner that the order has been accepted by a delivery boy
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
    } else {
      console.log(`Shop owner ${shopOwnerId} is offline. Cannot send orderAcceptedByDeliveryBoy notification.`);
    }

    // Emit a general event to all delivery boys (or a specific room) to remove this order request
    // This can be handled on the frontend by filtering out accepted orders
    socketIO.emit('orderRequestAccepted', { shopOrderId: shopOrder._id, acceptedBy: deliveryBoyId });

    res.status(200).json({ success: true, message: "Order accepted successfully", shopOrder });
  } catch (error) {
    console.error("Error accepting order:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};