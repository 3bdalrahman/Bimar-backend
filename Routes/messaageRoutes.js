import express from "express";
import chatController from "../controllers/messageController.js";

const router = express.Router();

router.post("/send/:id", protectRoute, sendMessage);
router.get("/history/:doctorId/:patientId", chatController.getChatHistory);

export default router;
