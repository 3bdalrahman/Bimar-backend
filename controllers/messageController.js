import Message from "../models/messageModel.js";
import errorHandler from "../utilities/errorHandler.js";

const getChatHistory = async (req, res) => {
  try {
    const { doctorId, patientId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: doctorId, receiver: patientId },
        { sender: patientId, receiver: doctorId },
      ],
    }).sort({ timestamp: 1 });

    res.status(200).json({
      status: "success",
      data: messages,
    });
  } catch (err) {
    errorHandler(res, err);
  }
};

export default {
  getChatHistory,
};
