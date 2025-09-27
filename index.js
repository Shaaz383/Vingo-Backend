import express from "express";
const app = express();
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 3000;
app.use(express.json());
import connectDB from "./config/db.js";
app.listen(PORT, () => {
    connectDB();
    console.log(`Server is running on port ${PORT}`);
});