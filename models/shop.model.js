import mongoose from "mongoose";

const shopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Shop name is required"],
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to User model
      required: [true, "Owner reference is required"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    
    },
    state:{
        type: String,
        required: [true, "State is required"],
        trim: true,
    },
    address:{
        type: String,
        required: [true, "Address is required"],
        trim: true,
    },
    pincode:{
        type: String,
        required: [true, "Pincode is required"],
        trim: true,
    },
    image: {
      type: String,
      trim: true,
    },
    items:{
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Item",
      required: [true, "Items are required"],
      trim: true,
    }, 
  },
  {
    timestamps: true,
  }
);

// Create model
const Shop = mongoose.model("Shop", shopSchema);

export default Shop;
