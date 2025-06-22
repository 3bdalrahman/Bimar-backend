import Admin from "../models/AdminAuthModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import responseMsgs from "../utilities/responseMsgs.js";
import errorHandler from "../utilities/errorHandler.js";
import dotenv from "dotenv";
import PatientModel from "../models/PatientAuth_Model.js";
import Appointments from "../models/AppointmentsModel.js";
import Doctor from "../models/doctorModel.js";
import nodemailer from "nodemailer";

dotenv.config();

const register = async (req, res) => {
  try {
    const newAdminData = req.body;

    // Validate that required fields exist
    if (
      !newAdminData.email ||
      !newAdminData.password ||
      !newAdminData.username
    ) {
      throw "Missing required fields";
    }

    // Check if admin with this email already exists
    const existingAdmin = await Admin.findOne({ email: newAdminData.email });
    if (existingAdmin) {
      throw "Admin with this email already exists";
    }

    const hashedPassword = await bcrypt.hash(newAdminData.password, 6);
    const addAdmin = await Admin.create({
      ...newAdminData,
      password: hashedPassword,
    });

    if (addAdmin) {
      res.status(200).json({
        status: responseMsgs.SUCCESS,
        data: "Admin Added Successfully",
      });
    }
  } catch (err) {
    console.log("Error in register admin:", err);
    errorHandler(res, err);
  }
};

const getAllPatients = async (req, res) => {
  try {
    // Verify this is an admin request
    const token = req.cookies.jwt;
    if (!token) throw "Token not provided";

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    if (!decoded.isAdmin) throw "Unauthorized: Admin access required";

    // Fetch all patients with selected fields
    const patients = await PatientModel.find({});

    res.status(200).json({
      status: responseMsgs.SUCCESS,
      count: patients.length,
      data: patients,
    });
  } catch (err) {
    console.log("Error in getAllPatients:", err);
    errorHandler(res, err);
  }
};

const getAllAppointments = async (req, res) => {
  try {
    // Verify this is an admin request
    const token = req.cookies.jwt;
    if (!token) throw "Token not provided";

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    if (!decoded.isAdmin) throw "Unauthorized: Admin access required";

    // Fetch all appointments with full populated references
    const appointments = await Appointments.find({})
      .populate("patientId") // Get all patient fields
      .populate("doctorId") // Get all doctor fields
      .populate("clinicId") // Get all clinic fields
      .sort({ appointmentDate: -1 }); // Most recent first

    res.status(200).json({
      status: responseMsgs.SUCCESS,
      count: appointments.length,
      data: appointments,
    });
  } catch (err) {
    console.log("Error in getAllAppointments:", err);
    errorHandler(res, err);
  }
};

// Get All Doctors Function
const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find({});
    res.status(200).json({
      status: responseMsgs.SUCCESS,
      data: doctors,
    });
  } catch (err) {
    console.log(err);
    errorHandler(res, err);
  }
};

// Doctor Activate Function
const DoctorActivate = async (req, res) => {
  try {
    // Verify this is an admin request
    const token = req.cookies.jwt;
    if (!token) throw "Token not provided";

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    if (!decoded.isAdmin) throw "Unauthorized: Admin access required";

    const { id } = req.params;
    const { newStatus } = req.body;

    // Validate required fields
    if (!newStatus) {
      return res.status(400).json({
        status: responseMsgs.FAIL,
        data: ["New status is required"]
      });
    }

    // Validate status value
    const validStatuses = [
      "pending",
      "rejected", 
      "active",
      "banned",
      "suspended",
    ];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({
        status: responseMsgs.FAIL,
        data: [`Invalid status value. Must be one of: ${validStatuses.join(", ")}`]
      });
    }

    // Update doctor status
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      id,
      { status: newStatus },
      { new: true }
    );

    if (!updatedDoctor) {
      return res.status(404).json({
        status: responseMsgs.FAIL,
        data: ["Doctor not found"]
      });
    }

    // Send email notification if status is active
    if (newStatus === "active") {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        port: parseInt(process.env.EMAIL_PORT) || 587,
        auth: {
          user: process.env.USER,
          pass: process.env.PASS,
        },
      });

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; background-color: #F0F4F9; padding: 40px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px;">
            <h1 style="background-color: #16423C; color: white; padding: 30px; text-align: center;">🎉 Welcome to Bimar!</h1>
            <div style="padding: 30px;">
              <h2>Dear Dr. ${updatedDoctor.doctorName},</h2>
              <p>We are pleased to inform you that your Bimar account has been successfully activated! 🎉</p>
              <p>Your credentials have been verified and you are now officially part of our medical community. You can now:</p>
              <ul style="list-style-type: none; padding-left: 0;">
                <li>✓ Access your professional dashboard</li>
                <li>✓ Manage your clinic profiles</li>
                <li>✓ Accept patient appointments</li>
              </ul>
              <p>If you have any questions or need assistance, our support team is here to help.</p>
              <p>Best regards,</p>
              <p>The Bimar Team</p>
            </div>
          </div>
        </div>

        <!-- Media Query -->
        <style>
          @media only screen and (max-width: 600px) {
            div[style*="padding: 40px;"] {
              padding: 10px !important;
            }

            div[style*="padding: 30px;"] {
              padding: 15px !important;
            }

            div[style*="max-width: 600px;"] {
              max-width: 95% !important;
              margin: 0 auto !important;
            }

            h1, h2 {
              font-size: 20px !important;
            }

            p, a {
              font-size: 14px !important;
            }
          }
        </style>
      `;

      try {
        await transporter.sendMail({
          from: process.env.USER, // Use the configured email
          to: updatedDoctor.doctorEmail,
          subject: "Welcome to Bimar - Account Activated",
          html: emailHtml
        });
        console.log("Activation email sent successfully to:", updatedDoctor.doctorEmail);
      } catch (emailError) {
        console.error("Failed to send activation email:", emailError);
      }
    }

    res.status(200).json({
      status: responseMsgs.SUCCESS,
      data: `Doctor status updated to ${newStatus}`,
      doctor: updatedDoctor,
      emailSent: newStatus === "active" ? "Email notification sent" : "No email needed"
    });
  } catch (err) {
    console.log("Error in updateDoctorStatus:", err);
    errorHandler(res, err);
  }
};

// Doctor Rejection Function
const DoctorRejection = async (req, res) => {
  try {
    // Verify this is an admin request
    const token = req.cookies.jwt;
    if (!token) throw "Token not provided";

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    if (!decoded.isAdmin) throw "Unauthorized: Admin access required";

    const { id } = req.params;
    const { rejectionReason } = req.body; // Get rejection reason from request body

    // Update doctor status to rejected and add rejection reason
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      id,
      { status: "rejected", rejectionReason: rejectionReason },
      { new: true }
    );

    if (!updatedDoctor) {
      return res.status(404).json({
        status: responseMsgs.FAIL,
        data: ["Doctor not found"],
      });
    }

    // Send rejection notification email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: parseInt(process.env.EMAIL_PORT) || 587,
      auth: {
        user: process.env.USER,
        pass: process.env.PASS,
      },
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; background-color: #F0F4F9; padding: 40px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px;">
          <h1 style="background-color: #16423C; color: white; padding: 30px; text-align: center;">Account Status Update</h1>
          <div style="padding: 30px;">
            <h2>Dear Dr. ${updatedDoctor.doctorName},</h2>
            <p>We've reviewed your Bimar account application and it requires a few updates before we can proceed with activation.</p>
            ${
              rejectionReason
                ? `<p><strong>Reason for rejection:</strong> ${rejectionReason}</p>`
                : ""
            }
            <p>Please click the link below to update your application. After you resubmit, we will review it again promptly.</p>
            <p style="text-align: center; margin: 20px 0;">
              <a href="${
                process.env.FRONTEND_URL
              }/doctor-re-apply/${updatedDoctor._id}" style="background-color: #16423C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Update Your Application</a>
            </p>
            <p>If you have any questions, please contact our support team.</p>
            <p>Best regards,</p>
            <p>The Bimar Team</p>
          </div>
        </div>
      </div>

      <!-- Media Query -->
      <style>
        @media only screen and (max-width: 600px) {
          div[style*="padding: 40px;"] {
            padding: 10px !important;
          }

          div[style*="padding: 30px;"] {
            padding: 15px !important;
          }

          div[style*="max-width: 600px;"] {
            max-width: 95% !important;
            margin: 0 auto !important;
          }

          h1, h2 {
            font-size: 20px !important;
          }

          p, a {
            font-size: 14px !important;
          }
        }
      </style>
    `;

    try {
      await transporter.sendMail({
        from: process.env.USER,
        to: updatedDoctor.doctorEmail,
        subject: "Bimar Account Status Update",
        html: emailHtml,
      });
      console.log(
        "Rejection email sent successfully to:",
        updatedDoctor.doctorEmail
      );
    } catch (emailError) {
      console.error("Failed to send rejection email:", emailError);
    }

    res.status(200).json({
      status: responseMsgs.SUCCESS,
      data: "Doctor account rejected successfully",
      doctor: updatedDoctor,
    });
  } catch (err) {
    console.log("Error in DoctorRejection:", err);
    errorHandler(res, err);
  }
};

// Doctor Ban Function
const DoctorBan = async (req, res) => {
  try {
    // Verify this is an admin request
    const token = req.cookies.jwt;
    if (!token) throw "Token not provided";

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    if (!decoded.isAdmin) throw "Unauthorized: Admin access required";

    const { id } = req.params;

    // Update doctor status to banned
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      id,
      { status: "banned" },
      { new: true }
    );

    if (!updatedDoctor) {
      return res.status(404).json({
        status: responseMsgs.FAIL,
        data: ["Doctor not found"]
      });
    }

    // Send ban notification email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: parseInt(process.env.EMAIL_PORT) || 587,
      auth: {
        user: process.env.USER,
        pass: process.env.PASS,
      },
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; background-color: #F0F4F9; padding: 40px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px;">
          <h1 style="background-color: #16423C; color: white; padding: 30px; text-align: center;">Account Banned</h1>
          <div style="padding: 30px;">
            <h2>Dear Dr. ${updatedDoctor.doctorName},</h2>
            <p>We regret to inform you that your Bimar account has been banned due to a violation of our terms of service.</p>
            <p>This action was taken after careful consideration of the circumstances.</p>
            <p>If you believe this is an error or would like to appeal this decision, please contact our support team.</p>
            <p>Best regards,</p>
            <p>The Bimar Team</p>
          </div>
        </div>
      </div>

      <!-- Media Query -->
      <style>
        @media only screen and (max-width: 600px) {
          div[style*="padding: 40px;"] {
            padding: 10px !important;
          }

          div[style*="padding: 30px;"] {
            padding: 15px !important;
          }

          div[style*="max-width: 600px;"] {
            max-width: 95% !important;
            margin: 0 auto !important;
          }

          h1, h2 {
            font-size: 20px !important;
          }

          p, a {
            font-size: 14px !important;
          }
        }
      </style>
    `;

    try {
      await transporter.sendMail({
        from: process.env.USER,
        to: updatedDoctor.doctorEmail,
        subject: "Bimar Account Banned",
        html: emailHtml
      });
      console.log("Ban notification email sent successfully to:", updatedDoctor.doctorEmail);
    } catch (emailError) {
      console.error("Failed to send ban notification email:", emailError);
    }

    res.status(200).json({
      status: responseMsgs.SUCCESS,
      data: "Doctor account banned successfully",
      doctor: updatedDoctor,
    });
  } catch (err) {
    console.log("Error in DoctorBan:", err);
    errorHandler(res, err);
  }
};

// Doctor Suspend Function
const DoctorSuspend = async (req, res) => {
  try {
    // Verify this is an admin request
    const token = req.cookies.jwt;
    if (!token) throw "Token not provided";

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    if (!decoded.isAdmin) throw "Unauthorized: Admin access required";

    const { id } = req.params;
    const { suspensionReason, suspensionDuration } = req.body;

    // Validate required fields
    if (!suspensionReason || !suspensionDuration) {
      return res.status(400).json({
        status: responseMsgs.FAIL,
        data: ["Suspension reason and duration are required"]
      });
    }

    // Update doctor status to suspended
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      id,
      { 
        status: "suspended",
        suspensionDetails: {
          reason: suspensionReason,
          startDate: new Date(),
          duration: suspensionDuration,
          endDate: new Date(Date.now() + suspensionDuration * 24 * 60 * 60 * 1000)
        }
      },
      { new: true }
    );

    if (!updatedDoctor) {
      return res.status(404).json({
        status: responseMsgs.FAIL,
        data: ["Doctor not found"]
      });
    }

    // Send suspension notification email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: parseInt(process.env.EMAIL_PORT) || 587,
      auth: {
        user: process.env.USER,
        pass: process.env.PASS,
      },
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; background-color: #F0F4F9; padding: 40px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px;">
          <h1 style="background-color: #16423C; color: white; padding: 30px; text-align: center;">Account Suspended</h1>
          <div style="padding: 30px;">
            <h2>Dear Dr. ${updatedDoctor.doctorName},</h2>
            <p>We regret to inform you that your Bimar account has been suspended for ${suspensionDuration} days.</p>
            <p>Reason for suspension: ${suspensionReason}</p>
            <p>Suspension period: ${new Date().toLocaleDateString()} to ${new Date(Date.now() + suspensionDuration * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
            <p>If you believe this is an error or would like to appeal this decision, please contact our support team.</p>
            <p>Best regards,</p>
            <p>The Bimar Team</p>
          </div>
        </div>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: process.env.USER,
        to: updatedDoctor.doctorEmail,
        subject: "Bimar Account Suspended",
        html: emailHtml
      });
      console.log("Suspension notification email sent successfully to:", updatedDoctor.doctorEmail);
    } catch (emailError) {
      console.error("Failed to send suspension notification email:", emailError);
    }

    res.status(200).json({
      status: responseMsgs.SUCCESS,
      data: "Doctor account suspended successfully",
      doctor: updatedDoctor,
    });
  } catch (err) {
    console.log("Error in DoctorSuspend:", err);
    errorHandler(res, err);
  }
};

// Update exports
export default {
  register,
  getAllPatients,
  getAllAppointments,
  getAllDoctors,
  DoctorActivate,
  DoctorRejection,
  DoctorBan,
  DoctorSuspend,
};