import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { createRazorpayOrder, verifyRazorpayPaymentAndCreateOrder } from "../controllers/payment.controllers.js";

const router = express.Router();

router.post("/create-order", isAuth, createRazorpayOrder);
router.post("/verify", isAuth, verifyRazorpayPaymentAndCreateOrder);

export default router;