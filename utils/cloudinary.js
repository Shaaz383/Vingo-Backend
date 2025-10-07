// const cloudinary = require('cloudinary');
import { v2 as cloudinary } from 'cloudinary'

const uploadOnCloudinary = async (file)=>{
    cloudinary.config({ 
        cloud_name: 'my_cloud_name', 
        api_key: 'my_key', 
        api_secret: 'my_secret'
      });
    try {
        
    } catch (error) {
        
    }
}
