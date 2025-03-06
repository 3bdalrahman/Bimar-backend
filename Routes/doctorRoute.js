import express from "express";
import doctorController from "../controllers/doctorController.js";
// import doctorValidation from '../validation/doctorValid.js';
import uploadProfile from "./../utilities/imagUpload.js";

const router = express.Router();

router.route("/doctorRegister").post(
  uploadProfile.uploadDocProfile.any(),
  // doctorValidation(),
  doctorController.register
);

router.post("/doctorLogin", doctorController.login);
router.post("/forget-password", doctorController.forgetPassword);
router.post("/verify-otp", doctorController.verifyOtp);
router.post("/reset-password", doctorController.resetPassword);
router.get("/doctors", doctorController.getAllDoctors);
router.delete("/doctorDelete", doctorController.deleteDoctor);
router.delete("/deleteClinic", doctorController.deleteClinic);
router.put("/updateDoctor", doctorController.updateDoctor);
router.put("/updateClinic", doctorController.updateClinic);
router.post("/field", doctorController.getField);

export default router;
