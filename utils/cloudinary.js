import { v2 as cloudinary } from 'cloudinary'
import fs from "fs"

// Configure Cloudinary once at module load
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (filePath)=>{
    if(!filePath){
        return null
    }
    try {
        const result = await cloudinary.uploader.upload(filePath)
        return result.secure_url
    } catch (error) {
        console.log(error)
        throw error
    } finally {
        try { fs.unlinkSync(filePath) } catch (_) {}
    }
}

export default uploadOnCloudinary