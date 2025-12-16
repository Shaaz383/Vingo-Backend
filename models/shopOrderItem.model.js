import mongoose from "mongoose";

const shopOrderItemSchema = new mongoose.Schema(
  {
    shopOrder: { type: mongoose.Schema.Types.ObjectId, ref: "ShopOrder", required: true, index: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    itemName: { type: String, required: true, trim: true },
    priceAtPurchase: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    total: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

// Removed duplicate index; 'shopOrder' already has index: true on the field

const ShopOrderItem = mongoose.model("ShopOrderItem", shopOrderItemSchema);
export default ShopOrderItem;