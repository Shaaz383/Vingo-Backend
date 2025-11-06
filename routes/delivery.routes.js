import express from "express";
import { getMyAssignedOrders, updateOrderStatus } from "../controllers/delivery.controllers.js";
import isAuth from "../middlewares/isAuth.js";

const router = express.Router();

// Get all orders assigned to the current delivery boy
router.get("/my-orders", isAuth, getMyAssignedOrders);

// Update the status of an order
router.patch("/:orderId/status", isAuth, updateOrderStatus);

export default router;