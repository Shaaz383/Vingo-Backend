import express from "express";
import { getMyAssignedOrders, updateOrderStatus, acceptOrder } from "../controllers/delivery.controllers.js";
import isAuth from "../middlewares/isAuth.js";

const router = express.Router();

// Get all orders assigned to the current delivery boy
router.get("/my-orders", isAuth, getMyAssignedOrders);

// Update the status of an order
router.patch("/:orderId/status", isAuth, updateOrderStatus);

// New: Delivery boy accepts an order
router.patch("/accept-order/:shopOrderId", isAuth, acceptOrder);

export default router;