import ShopOrder from "../models/shopOrder.model.js";

/**
 * Get all orders assigned to the current delivery boy
 * @route GET /api/delivery/my-orders
 * @access Private
 */
export const getMyAssignedOrders = async (req, res) => {
  try {
    const orders = await ShopOrder.find({ deliveryBoy: req.userId })
      .sort({ createdAt: -1 })
      .populate("order")
      .populate("shop");

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

    const order = await ShopOrder.findOne({ _id: orderId, deliveryBoy: req.userId });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found or you are not assigned to it" });
    }

    // Add logic here to ensure valid status transitions
    order.status = status;
    await order.save();

    res.status(200).json({ success: true, message: "Order status updated successfully", order });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};