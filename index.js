import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";  
import shopRouter from "./routes/shop.routes.js";
import itemRouter from "./routes/item.routes.js";
import orderRouter from "./routes/order.routes.js";
import deliveryRouter from "./routes/delivery.routes.js";
import cookieParser from "cookie-parser";
import cors from "cors";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const allowedOrigins = (process.env.CLIENT_ORIGINS || "http://localhost:5173,http://localhost:5174").split(",").map(s => s.trim());
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// Map to store userId -> socketId
const users = new Map();

// Make io accessible to other modules
export const socketIO = io;
export const onlineUsers = users; // Export users map for targeted emission

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.set('trust proxy', 1);
const corsOrigins = (process.env.CLIENT_ORIGINS || "http://localhost:5173,http://localhost:5174").split(",").map(s => s.trim());
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowed = corsOrigins.includes(origin);
    callback(allowed ? null : new Error('Not allowed by CORS'), allowed);
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
};
app.use(cors(corsOptions));
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    if (!origin || corsOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin || '*');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      return res.sendStatus(204);
    }
  }
  next();
});

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter); 
app.use("/api/shop", shopRouter);
app.use("/api/item", itemRouter);
app.use("/api/order", orderRouter);
app.use("/api/delivery", deliveryRouter);

app.get('/health', (req, res) => {
  res.status(200).send('ok');
});

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // New: Handle user registration (must be emitted from client on login)
  socket.on('register', (userId) => {
    if (userId) {
        users.set(userId, socket.id);
        console.log(`User ${userId} registered with socket ${socket.id}`);
        // For targeted emissions, we use io.to(users.get(userId)).emit(...)
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    // Remove user from map on disconnect
    for (let [userId, socketId] of users.entries()) {
        if (socketId === socket.id) {
            users.delete(userId);
            console.log(`User ${userId} deregistered`);
            break;
        }
    }
  });
});

const start = async () => {
  try {
    await connectDB();
    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB');
    process.exit(1);
  }
};

start();