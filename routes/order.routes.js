import express from "express";
import { placeOrder, getMyOrders, getOrderById } from "../controllers/order.controllers.js";
import isAuth from "../middlewares/isAuth.js";

const router = express.Router();

// Place a new order
router.post("/", isAuth, placeOrder);

// Get all orders for the current user
router.get("/", isAuth, getMyOrders);

// Get order by ID
router.get("/:id", isAuth, getOrderById);

export default router;