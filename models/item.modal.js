import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },
  description: {
    type: String,
    required: [true, "Description is required"],
    trim: true,
  },
  price: {
    type: Number,
    default: 0,
    min: 0,

    required: [true, "Price is required"],
  },
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
  },
  image: {
    type: String,
    required: [true, "Image is required"],
    trim: true,
  },
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: [true, "Shop is required"],
  },
  category: {
    type: String,
    required: [true, "Category is required"],
    trim: true,
    enum: [
      "Snacks",
      "Main Course",
      "Dessert",
      "Drink",
      "Pizza",
      "Burger",
      "Sandwich",
      "South Indian",
      "North Indian",
      "Chinese",
      "Biryani",
      "Rolls",
      "Pasta",
      "Salad",
      "Soup",
      "Dosa",
      "Idli",
      "other",
    ],
  },
  foodType:{
    type: String,
    required: [true, "Food type is required"],
    trim: true,
    enum: ["Veg", "Non-Veg", "Vegan"],
  },


}, { timestamps: true });

const Item = mongoose.model("Item", itemSchema);
export default Item
