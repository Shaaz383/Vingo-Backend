import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
    },
    mobile: {
        type: String,
        unique: true,
        sparse: true // Allows null values but ensures uniqueness when present
    },
    role: {
        type: String,
        enum: ["owner", "user", "deliveryBoy"],
        required: true,
        default: "user"
    },
    // Google OAuth fields
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    profilePicture: {
        type: String
    },
    isGoogleUser: {
        type: Boolean,
        default: false
    },
    resetOtp:{
        type:String,
    },
    isOtpVerified:{
        type:Boolean,
        default:false
    },
    otpExpires:{
        type:Date,
    }
}, { timestamps: true })

const User = mongoose.model("User", userSchema);

export default User;