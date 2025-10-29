import mongoose from "mongoose";

const shopOrderSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    deliveryBoy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "preparing",
        "ready_for_pickup",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0, default: 0 },
    deliveryFee: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: "ShopOrderItem" }],
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

shopOrderSchema.index({ shop: 1, status: 1 });
shopOrderSchema.index({ deliveryBoy: 1, status: 1 });

const ShopOrder = mongoose.model("ShopOrder", shopOrderSchema);
export default ShopOrder;