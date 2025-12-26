import Razorpay from "razorpay";
import crypto from "crypto";
import Order from "../models/order.model.js";
import ShopOrder from "../models/shopOrder.model.js";
import ShopOrderItem from "../models/shopOrderItem.model.js";
import Item from "../models/item.modal.js";
import { socketIO, onlineUsers } from "../index.js";

const TAX_RATE = 0.05;
const FIXED_DELIVERY_FEE = 40;

const computeCartSummary = async (items) => {
  const itemIds = items.map((i) => i.itemId);
  const itemsFromDB = await Item.find({ _id: { $in: itemIds } }).populate("shop");
  if (itemsFromDB.length !== itemIds.length) {
    throw new Error("Some items not found");
  }

  const itemsByShop = {};
  itemsFromDB.forEach((dbItem) => {
    const shopId = dbItem.shop._id.toString();
    if (!itemsByShop[shopId]) {
      itemsByShop[shopId] = { shop: dbItem.shop, items: [] };
    }
    const reqItem = items.find((ri) => ri.itemId === dbItem._id.toString());
    const quantity = reqItem ? reqItem.quantity : 0;
    if (quantity <= 0) {
      throw new Error(`Invalid quantity for item ${dbItem.name}`);
    }
    itemsByShop[shopId].items.push({
      item: dbItem,
      quantity,
      priceAtPurchase: dbItem.price,
      total: dbItem.price * quantity,
    });
  });

  let totalAmount = 0;
  let totalQuantity = 0;
  const perShopTotals = {};

  Object.values(itemsByShop).forEach(({ shop, items }) => {
    let subtotal = 0;
    let shopQty = 0;
    items.forEach((it) => {
      subtotal += it.total;
      shopQty += it.quantity;
    });
    const tax = Math.round(subtotal * TAX_RATE);
    const deliveryFee = FIXED_DELIVERY_FEE;
    const total = subtotal + tax + deliveryFee;
    totalAmount += total;
    totalQuantity += shopQty;
    perShopTotals[shop._id.toString()] = { subtotal, tax, deliveryFee, total, items, shop };
  });

  return { itemsByShop, totalAmount, totalQuantity, perShopTotals };
};

export const createRazorpayOrder = async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Items are required" });
    }

    const { totalAmount } = await computeCartSummary(items);

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
      return res.status(500).json({ success: false, message: "Razorpay keys not configured" });
    }

    const razorpay = new Razorpay({ key_id, key_secret });
    const rpOrder = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: { userId: req.userId },
    });

    return res.status(200).json({
      success: true,
      orderId: rpOrder.id,
      amount: rpOrder.amount,
      currency: rpOrder.currency,
      keyId: key_id,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const verifyRazorpayPaymentAndCreateOrder = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing Razorpay payment details" });
    }
    if (!orderData || !orderData.items || !orderData.deliveryAddress) {
      return res.status(400).json({ success: false, message: "Missing order data" });
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    const expectedSignature = crypto
      .createHmac("sha256", key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    const { perShopTotals, totalAmount, totalQuantity } = await computeCartSummary(orderData.items);

    const order = new Order({
      user: req.userId,
      deliveryAddress: orderData.deliveryAddress,
      payment: { method: "RAZORPAY", status: "paid", transactionId: razorpay_payment_id },
      notes: orderData.notes,
      totalAmount: 0,
      totalQuantity: 0,
      shopOrders: [],
    });

    const shopOrderIds = [];
    for (const shopId of Object.keys(perShopTotals)) {
      const { subtotal, tax, deliveryFee, total, items, shop } = perShopTotals[shopId];
      const shopOrder = new ShopOrder({
        order: order._id,
        shop: shop._id,
        subtotal,
        tax,
        deliveryFee,
        total,
        items: [],
        status: "pending",
      });

      const createdItems = [];
      for (const it of items) {
        const soi = new ShopOrderItem({
          shopOrder: shopOrder._id,
          item: it.item._id,
          itemName: it.item.name,
          priceAtPurchase: it.priceAtPurchase,
          quantity: it.quantity,
          total: it.total,
        });
        await soi.save();
        createdItems.push(soi._id);
      }
      shopOrder.items = createdItems;
      await shopOrder.save();

      shopOrderIds.push(shopOrder._id);

      await Promise.all(
        items.map((it) => Item.findByIdAndUpdate(it.item._id, { $inc: { quantity: -it.quantity } }))
      );

      const shopOwnerSocketId = onlineUsers.get(shop.owner.toString());
      if (shopOwnerSocketId) {
        socketIO.to(shopOwnerSocketId).emit("newShopOrder", {
          shopOrderId: shopOrder._id,
          orderId: order._id.toString(),
          total: shopOrder.total,
          status: shopOrder.status,
        });
      }
    }

    order.totalAmount = totalAmount;
    order.totalQuantity = totalQuantity;
    order.shopOrders = shopOrderIds;
    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: "shopOrders",
        populate: [
          { path: "items", model: "ShopOrderItem" },
          { path: "deliveryBoy", model: "User", select: "fullName mobile profilePicture" },
          { path: "shop", model: "Shop", select: "name" },
        ],
      })
      .populate("user", "name email");

    return res.status(201).json({ success: true, order: populatedOrder });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};