import express from "express";
import { getMyOrders, getOrderById, getShopOrders, placeOrder, updateShopOrderStatus } from "../controllers/order.controllers.js";
import isAuth from "../middlewares/isAuth.js";

const router = express.Router();

// Place a new order
router.post("/", isAuth, placeOrder);

// Get all orders for the current user
router.get("/", isAuth, getMyOrders);

// Get all orders for the shop owner
router.get("/shop", isAuth, getShopOrders);

// Update shop order status
router.patch("/shop/:id/status", isAuth, updateShopOrderStatus);

// Get order by ID
router.get("/:id", isAuth, getOrderById);

export default router;