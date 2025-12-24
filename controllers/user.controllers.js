import User from "../models/user.model.js"
import uploadOnCloudinary from "../utils/cloudinary.js";
import { sendOtpMail } from "../utils/mail.js";

export const getCurrentUser = async (req, res) => {
    try{
        const userId = req.userId
        if(!userId){
            return res.status(401).json({message:"Unauthorized"})
        }
        const user = await User.findById(userId)
        if(!user){
            return res.status(404).json({message:"User not found"})
        }
        res.status(200).json({user})
    } catch (error) {
        res.status(500).json({message:error.message})
    }
}

export const updateCurrentUser = async (req, res) => {
    try {
        const userId = req.userId;
        const { fullName, mobile } = req.body;
        const update = {};
        if (fullName) update.fullName = fullName;
        if (mobile) {
            if (mobile.length !== 10) {
                return res.status(400).json({ message: "Mobile number must be 10 digits" });
            }
            update.mobile = mobile;
            update.isMobileVerified = false;
        }
        const user = await User.findByIdAndUpdate(userId, update, { new: true });
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const updateProfilePicture = async (req, res) => {
    try {
        const userId = req.userId;
        let image;
        if (req.file) {
            image = await uploadOnCloudinary(req.file.path);
        }
        if (!image) return res.status(400).json({ message: "Image is required" });
        const user = await User.findByIdAndUpdate(userId, { profilePicture: image }, { new: true });
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const sendEmailVerificationOtp = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
        user.emailOtp = otp;
        user.emailOtpExpires = otpExpires;
        await user.save();
        try {
            await sendOtpMail(user.email, otp);
        } catch (_) {
            if (process.env.ALLOW_OTP_FALLBACK === "true") {
            } else {
                return res.status(500).json({ message: "Failed to send OTP email" });
            }
        }
        const includeOtp = process.env.ALLOW_OTP_FALLBACK === "true";
        res.status(200).json({ message: "OTP sent", ...(includeOtp ? { otp } : {}) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const verifyEmailOtp = async (req, res) => {
    try {
        const userId = req.userId;
        const { otp } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });
        if (!user.emailOtp || !user.emailOtpExpires) {
            return res.status(400).json({ message: "No OTP request found" });
        }
        if (user.emailOtpExpires < new Date()) {
            return res.status(400).json({ message: "OTP has expired" });
        }
        if (user.emailOtp !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }
        user.isEmailVerified = true;
        user.emailOtp = undefined;
        user.emailOtpExpires = undefined;
        await user.save();
        res.status(200).json({ message: "Email verified" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const sendMobileVerificationOtp = async (req, res) => {
    try {
        const userId = req.userId;
        const { mobile } = req.body;
        if (!mobile || mobile.length !== 10) {
            return res.status(400).json({ message: "Mobile number must be 10 digits" });
        }
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });
        user.mobile = mobile;
        user.isMobileVerified = false;
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
        user.mobileOtp = otp;
        user.mobileOtpExpires = otpExpires;
        await user.save();
        try {
            await sendOtpMail(user.email, otp);
        } catch (_) {
            if (process.env.ALLOW_OTP_FALLBACK === "true") {
            } else {
                return res.status(500).json({ message: "Failed to send OTP" });
            }
        }
        const includeOtp = process.env.ALLOW_OTP_FALLBACK === "true";
        res.status(200).json({ message: "OTP sent", ...(includeOtp ? { otp } : {}) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const verifyMobileOtp = async (req, res) => {
    try {
        const userId = req.userId;
        const { otp } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });
        if (!user.mobileOtp || !user.mobileOtpExpires) {
            return res.status(400).json({ message: "No OTP request found" });
        }
        if (user.mobileOtpExpires < new Date()) {
            return res.status(400).json({ message: "OTP has expired" });
        }
        if (user.mobileOtp !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }
        user.isMobileVerified = true;
        user.mobileOtp = undefined;
        user.mobileOtpExpires = undefined;
        await user.save();
        res.status(200).json({ message: "Mobile verified" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}