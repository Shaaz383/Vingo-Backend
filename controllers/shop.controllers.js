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

