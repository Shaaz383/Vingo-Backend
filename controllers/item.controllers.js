import Shop from "../models/shop.model.js";
import Item from "../models/item.modal.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

// ======================= ADD ITEM =======================
export const addItem = async (req, res) => {
  try {
    const { name, category, foodType, price, description, quantity } = req.body;
    let image;

    // upload image if provided
    if (req.file) {
      image = await uploadOnCloudinary(req.file.path);
    }

    // find shop by owner (current user)
    const shop = await Shop.findOne({ owner: req.userId });
    if (!shop) {
      return res.status(400).json({ message: "Shop not found" });
    }

    // create new item
    const newItem = await Item.create({
      name,
      category,
      foodType,
      price,
      description,
      quantity,
      image,
      shop: shop._id,
    });

    // link item to shop (for item count/relations)
    await Shop.findByIdAndUpdate(shop._id, { $push: { items: newItem._id } });

    return res.status(201).json({
      success: true,
      message: "Item added successfully",
      item: newItem,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: `Add item error: ${error.message}` });
  }
};

// ======================= GET SHOP ITEMS =======================
export const getShopItems = async (req, res) => {
  try {
    // find shop by owner (current user)
    const shop = await Shop.findOne({ owner: req.userId });
    if (!shop) {
      return res.status(400).json({ message: "Shop not found" });
    }

    // get all items for this shop
    const items = await Item.find({ shop: shop._id });

    return res.status(200).json({
      success: true,
      items,
      count: items.length,
    });
  } catch (error) {
    return res.status(500).json({ message: `Get shop items error: ${error.message}` });
  }
};

// ======================= EDIT ITEM =======================
export const editItem = async (req, res) => {
  try {
    const { itemId } = req.params; // item id from URL
    const { name, category, foodType, price } = req.body;
    let image;

    if(req.file){
        image = await uploadOnCloudinary(req.file.path)
    }
    const item = await Item.findByIdAndUpdate(itemId , {
        name , category , foodType , price , image 
    }, {new : true})

    if(!item){
        return res.status(400).json({message : "Item not found"})
    }
    return res.status(200).json(item)
  } catch (error) {
        return res.status(500).json({message : `edit item error `})
  }
};
