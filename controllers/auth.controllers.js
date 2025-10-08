import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import genToken from "../utils/token.js";
import { sendOtpMail } from "../utils/mail.js";

export const signUp = async (req, res) => {
    try {
        const { fullName, email, password, mobile, role } = req.body;
        let user = await User.findOne({ email });

        if (user) {
            return res.status(400).json({ message: "User already exists" });
        }
        if(password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long" });
        }
        if(mobile.length !== 10) {
            return res.status(400).json({ message: "Mobile number must be 10 digits" });
        }
       
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({ fullName, email, password: hashedPassword, mobile, role });
        const token = await genToken(newUser._id);
        res.cookie("token", token, { httpOnly: true, secure: false, sameSite: "strict", maxAge: 24 * 60 * 60 * 1000 });
        res.status(201).json({ user: newUser, token });
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const signIn = async (req, res) => {
    try {
        const { email, password } = req.body;
        let user = await User.findOne({ email });
        if(!user) {
            return res.status(400).json({ message: "User not found" });
        }
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if(!isPasswordCorrect) {
            return res.status(400).json({ message: "Invalid password" });
        }
        const token = await genToken(user._id);
        res.cookie("token", token, { httpOnly: true, secure: false, sameSite: "strict", maxAge: 24 * 60 * 60 * 1000 });
        res.status(200).json({ user, token }); 
    
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const signOut=async(req,res)=>{
    try {
        res.clearCookie("token");
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }

}



export const sendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        console.log("Send OTP request for email:", email);
        
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            console.log("User not found for email:", email);
            return res.status(404).json({ message: "User not found" });
        }

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log("Generated OTP for", email, ":", otp);

        // Set OTP expiry (e.g., 5 minutes from now)
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

        user.resetOtp = otp;
        user.otpExpires = otpExpires;
        user.isOtpVerified = false;
        await user.save();
        console.log("OTP saved to database for", email);

        try {
            await sendOtpMail(email, otp);
            console.log("OTP email sent successfully to", email);
        } catch (mailError) {
            console.error("Failed to send OTP email:", mailError);
            if (process.env.ALLOW_OTP_FALLBACK === "true") {
                console.log("[DEV] ALLOW_OTP_FALLBACK=true, proceeding without email.");
            } else {
                return res.status(500).json({ message: "Failed to send OTP email. Please check your email configuration." });
            }
        }

        const includeOtpInResponse = process.env.ALLOW_OTP_FALLBACK === "true";
        res.status(200).json({ message: "OTP sent to email", ...(includeOtpInResponse ? { otp } : {}) });
    } catch (error) {
        console.error("Error in sendOtp:", error);
        res.status(500).json({ message: error.message });
    }
};


export const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user.resetOtp || !user.otpExpires) {
            return res.status(400).json({ message: "No OTP request found" });
        }

        if (user.otpExpires < new Date()) {
            return res.status(400).json({ message: "OTP has expired" });
        }

        if (user.resetOtp !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        user.isOtpVerified = true;
        user.resetOtp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.status(200).json({ message: "OTP verified successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


export const resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        if (!email || !newPassword) {
            return res.status(400).json({ message: "Email and new password are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user.isOtpVerified) {
            return res.status(400).json({ message: "OTP verification required before resetting password" });
        }

        // Hash the new password before saving
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        user.isOtpVerified = false; // Reset OTP verification status after password change
        await user.save();

        res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Google OAuth authentication
export const googleAuth = async (req, res) => {
    try {
        const { googleId, email, fullName, profilePicture } = req.body;

        if (!googleId || !email || !fullName) {
            return res.status(400).json({ message: "Google ID, email, and full name are required" });
        }

        // Check if user already exists with this Google ID
        let user = await User.findOne({ googleId });

        if (user) {
            // User exists, generate token and sign them in
            const token = await genToken(user._id);
            res.cookie("token", token, { 
                httpOnly: true, 
                secure: false, 
                sameSite: "strict", 
                maxAge: 24 * 60 * 60 * 1000 
            });
            return res.status(200).json({ user, token });
        }

        // Check if user exists with this email but different auth method
        user = await User.findOne({ email });
        if (user) {
            // Link Google account to existing user
            user.googleId = googleId;
            user.isGoogleUser = true;
            user.profilePicture = profilePicture;
            await user.save();

            const token = await genToken(user._id);
            res.cookie("token", token, { 
                httpOnly: true, 
                secure: false, 
                sameSite: "strict", 
                maxAge: 24 * 60 * 60 * 1000 
            });
            return res.status(200).json({ user, token });
        }

        // Create new user with Google authentication
        const newUser = await User.create({
            googleId,
            email,
            fullName,
            profilePicture,
            isGoogleUser: true,
            role: "user" // Default role for Google users
        });

        const token = await genToken(newUser._id);
        res.cookie("token", token, { 
            httpOnly: true, 
            secure: false, 
            sameSite: "strict", 
            maxAge: 24 * 60 * 60 * 1000 
        });

        res.status(201).json({ user: newUser, token });
    } catch (error) {
        console.error("Google auth error:", error);
        res.status(500).json({ message: error.message });
    }
};


