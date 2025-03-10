import express from "express";
import mime from "mime";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import fs from "fs"; // For file writing
import Message from "./models/chatModel.js";

import patientAuth from "./Routes/patientAuth.js";
import medicalRecordRoutes from "./Routes/medicalRecordRoutes.js";
import doctorRoutes from "./Routes/doctorRoute.js";
import diagnosisRoute from "./Routes/diagnosisRoute.js";
import patientRecordRoute from "./Routes/personalRecordRoute.js";
import bookingRoutes from "./Routes/bookingRoutes.js";
import accessRecordRoute from "./Routes/accessRecordRoute.js";
import meesageRoutes from "./Routes/messaageRoutes.js";
import connectToMongoDB from "./db/connectToMongoDB.js";
import ratingRoutes from './Routes/ratingRoutes.js'
import appRatingRoutes from './Routes/appRatingRoutes.js';

import {scheduleReminders} from "./controllers/automaticMedicineAlert.js"

import aiRoutes from "./Routes/aiRoute.js";
import appointmentAnalytics from "./Routes/appointmentAnalyticsRoute.js";
import symptoms from "./Routes/symptomRoutes.js";


dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type"],
  },
  transports: ["websocket", "polling"],
});

// Resolve __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "uploads")));
app.use(express.json());
app.use(cookieParser());
app.use(helmet());

// Routes
app.use("/patientsAuth", patientAuth);
app.use("/medical-records", medicalRecordRoutes);
app.use("/Diagnosis", diagnosisRoute);
app.use("/doctor", doctorRoutes);
app.use("/patientRecords", patientRecordRoute);
app.use("/bookings", bookingRoutes);
app.use("/access", accessRecordRoute);
app.use("/messages", meesageRoutes);
app.use("/ai", aiRoutes);
app.use("/symptoms", symptoms);
app.use("/analytics", appointmentAnalytics);
app.use('/rate',ratingRoutes);
app.use('/rateApp', appRatingRoutes);

const onlineUsers = {};

// Socket.IO Connection Handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // User Registration & Auto-Join Rooms
  socket.on("register", (userId) => {
    onlineUsers[userId] = socket.id;
    console.log(`User ${userId} connected.`);

    // User joins all chat rooms with online users
    for (const otherUserId in onlineUsers) {
      if (userId !== otherUserId) {
        const room = `${userId}-${otherUserId}`;
        socket.join(room);
        console.log(`User ${userId} joined room: ${room}`);
      }
    }

    io.emit("online_users", Object.keys(onlineUsers));
  });
  // Join a chat room
  socket.on("join_chat", async (data) => {
    try {
      // Add validation
      if (!data || !data.chatRoom || !data.userId || !data.userType) {
        console.error("Invalid chat room data:", data);
        return;
      }

      // Store user info in socket
      socket.userId = data.userId;
      socket.userType = data.userType;

      socket.join(data.chatRoom);


//! expected error for Doctor var
      // Get user details based on type
      let userName;
      if (data.userType === "Doctor") {
        const doctor = await Doctor.findById(data.userId);
        userName = doctor?.doctorName;
      } else {
        const patient = await Patient.findById(data.userId);
        userName = patient?.userName;
      }

      console.log(`User joined room: ${data.chatRoom}`);
      console.log(`User details: ${userName} (${data.userType})`);

      // Notify room of new user
      io.to(data.chatRoom).emit("user_joined", {
        userId: data.userId,
        userType: data.userType,
        userName: userName,
      });
    } catch (error) {
      console.error("Error in join_chat:", error);
    }
  });

  // Typing Status
  socket.on("typing", (data) => {
    const room = `${data.senderId}-${data.receiverId}`;
    socket.to(room).emit("user_typing", { userId: data.senderId });
  });

  socket.on("stop_typing", (data) => {
    const room = `${data.senderId}-${data.receiverId}`;
    socket.to(room).emit("user_stop_typing", { userId: data.senderId });
  });

  // Send Message With File Handling
  socket.on("send_message", async (data) => {
    try {
      let fileUrls = [];
      let fileTypes = [];

      const uploadPath = path.join(__dirname, "uploads", "chat");
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      if (Array.isArray(data.data.files) && data.data.files.length > 0) {
        data.data.files.forEach((file) => {
          if (file && file.filename && file.fileData) {
            const fileType = mime.getType(file.filename);
            fileTypes.push(fileType);

            // Clean Base64 prefix if exists
            const base64Data = file.fileData.replace(
              /^data:\w+\/\w+;base64,/,
              ""
            );

            const filePath = path.join(uploadPath, file.filename);
            fs.writeFileSync(filePath, base64Data, "base64");

            fileUrls.push(`uploads/chat/${file.filename}`);
          } else {
            console.error("Invalid file data:", file);
          }
        });
      }

      const newMessage = await Message.create({
        sender: data.data.senderId,
        senderModel: data.data.senderType,
        receiver: data.data.receiverId,
        receiverModel: data.data.receiverType,
        message: data.data.message || null,
        file: fileUrls,
        fileType: fileTypes,
      });

      const room = `${data.data.senderId}-${data.data.receiverId}`;
      socket.join(room);
      io.to(room).emit("receive_message", newMessage);
    } catch (error) {
      console.error("Error saving message:", error);
    }
  });

  // Handle User Disconnect
  socket.on("disconnect", () => {
    for (const userId in onlineUsers) {
      if (onlineUsers[userId] === socket.id) {
        delete onlineUsers[userId];
        break;
      }
    }
    io.emit("online_users", Object.keys(onlineUsers));
    console.log("User disconnected:", socket.id);
  });
});

const Port = process.env.PORT || 3000;
httpServer.listen(Port, () => {
  connectToMongoDB();
  console.log(`Server running on port ${Port}`);
});


scheduleReminders()


