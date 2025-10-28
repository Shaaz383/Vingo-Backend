import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { createEditShop, getMyShop, getShopsByCity } from "../controllers/shop.controllers.js";
const shopRouter = express.Router();
import {upload} from "../middlewares/multer.js"


shopRouter.post("/create-edit",isAuth, upload.single("image"), createEditShop);
shopRouter.get("/get-my",isAuth, getMyShop);
shopRouter.get("/list", isAuth, getShopsByCity);


export default shopRouter;