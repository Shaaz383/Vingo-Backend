import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { createEditShop, getMyShop } from "../controllers/shop.controllers.js";
const shopRouter = express.Router();
import {upload} from "../middlewares/multer.js"


shopRouter.post("/create-edit",isAuth, upload.single("image"), createEditShop);
shopRouter.get("/get-my",isAuth, getMyShop);


export default shopRouter;