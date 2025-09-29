import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import genToken from "../utils/token.js";

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
        res.status(201).json({ user: newUser, token });
        res.cookie("token", token, { httpOnly: true, secure: false,sameSite: "strict",   maxAge: 24 * 60 * 60 * 1000 });
        
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
        res.cookie("token", token, { httpOnly: true, secure: false,sameSite: "strict",   maxAge: 24 * 60 * 60 * 1000 });
        res.status(201).json({ user, token }); 
    
        
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