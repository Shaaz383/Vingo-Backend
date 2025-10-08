import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { createEditShop } from "../controllers/shop.controllers.js";
const shopRouter = express.Router();
import {upload} from "../middlewares/multer.js"


shopRouter.post("/create-edit",isAuth, upload.single("image"), createEditShop);


export default shopRouter;