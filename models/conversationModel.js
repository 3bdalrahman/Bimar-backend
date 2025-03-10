import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          refPath: "participants.modelType", // Dynamic reference
        },
        modelType: {
          type: String,
          required: true,
          enum: ["Doctor", "Patient"], // Allowed references
        },
      },
    ],
    messages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
    ],
  },
  { timestamps: true } 
);

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
