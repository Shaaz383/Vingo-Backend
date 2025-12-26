import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    addressLine: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    mobileNumber: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    method: { type: String, enum: ["COD", "CARD", "UPI", "RAZORPAY"], default: "COD" },
    status: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
    transactionId: { type: String, trim: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: [
        "created",
        "confirmed",
        "processing",
        "completed",
        "cancelled",
      ],
      default: "created",
      index: true,
    },
    totalAmount: { type: Number, required: true, min: 0 },
    totalQuantity: { type: Number, required: true, min: 1 },
    deliveryAddress: { type: addressSchema, required: true },
    payment: { type: paymentSchema, default: () => ({}) },
    shopOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: "ShopOrder", index: true }],
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);
export default Order;