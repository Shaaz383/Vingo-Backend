import Shop from "../models/shop.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";


export const createEditShop = async (req , res)=>{
    try {
        const {name, city , state , address, pincode} = req.body
        let image;
        if(req.file){
            image = await uploadOnCloudinary(req.file.path)
        }
        let shop = await Shop.findOne({owner:req.userId})
        if(!shop){
            shop = await Shop.create({
                name, city, state, address, pincode, image, items: [], owner:req.userId
            })
        }
        else{
            const update = { name, city, state, address, pincode, owner:req.userId };
            if (image) update.image = image;
            shop = await Shop.findByIdAndUpdate(shop._id, update, { new: true })
        }
        await shop.populate("owner")
        return res.status(201).json(shop)
    } catch (error) {
        return res.status(500).json({message : `create shop error ${error}`})
    }
}

export const getMyShop = async  (req , res)=>{
    try{
        const shop = await Shop.findOne({owner:req.userId}).populate("owner")
        if(!shop){
            return res.status(404).json({message:"Shop not found"})
        }
        return res.status(200).json(shop)
    }
    catch(error){
            return res.status(500).json({message:`get my shop error ${error}`})
    }
}

// List shops by city (case-insensitive)
export const getShopsByCity = async (req, res) => {
    try {
        const { city } = req.query;
        if (!city) {
            return res.status(400).json({ message: "City query parameter is required" });
        }

        // Case-insensitive match; trim spaces
        const cityRegex = new RegExp(`^${String(city).trim()}$`, 'i');
        const shops = await Shop.find({ city: cityRegex }).select('name city state address image');

        return res.status(200).json({ success: true, count: shops.length, shops });
    } catch (error) {
        return res.status(500).json({ message: `get shops by city error ${error?.message || error}` });
    }
}

