import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "sender.modelType",
      },
      modelType: {
        type: String,
        required: true,
        enum: ["Doctor", "Patient"], // Allowed references
      },
    },
    receiver: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "receiver.modelType",
      },
      modelType: {
        type: String,
        required: true,
        enum: ["Doctor", "Patient"],
      },
    },
    message: {
      type: String,
      trim: true, // Removes extra spaces
    },
    files: [
      {
        url: { type: String, required: true },
        type: { type: String, required: true },
      },
    ],
  },
  { timestamps: true } // Adds createdAt and updatedAt automatically
);

const Message = mongoose.model("Message", messageSchema);
export default Message;
