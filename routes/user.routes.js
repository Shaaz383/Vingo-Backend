import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { getCurrentUser, updateCurrentUser, updateProfilePicture, sendEmailVerificationOtp, verifyEmailOtp, sendMobileVerificationOtp, verifyMobileOtp } from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.js";
const userRouter = express.Router();

userRouter.get("/current-user", isAuth, getCurrentUser);
userRouter.patch("/me", isAuth, updateCurrentUser);
userRouter.patch("/profile-picture", isAuth, upload.single("image"), updateProfilePicture);
userRouter.post("/send-email-otp", isAuth, sendEmailVerificationOtp);
userRouter.post("/verify-email-otp", isAuth, verifyEmailOtp);
userRouter.post("/send-mobile-otp", isAuth, sendMobileVerificationOtp);
userRouter.post("/verify-mobile-otp", isAuth, verifyMobileOtp);

export default userRouter;