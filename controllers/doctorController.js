import doctor from "../models/doctorModel.js";
import { validationResult } from "express-validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import responseMsgs from "../utilities/responseMsgs.js";
import errorHandler from "../utilities/errorHandler.js";
import nodemailer from "nodemailer";
import { decode } from "jsonwebtoken";
import Admin from "../models/AdminAuthModel.js";

// Register Function
const register = async (req, res) => {
  try {
    let newDoctorData = req.body;

    if (req.files) {
      // Assign doctorImage and syndicateCard
      newDoctorData.doctorImage =
        req.files.find((file) => file.fieldname === "doctorImage")?.path ||
        null;
      newDoctorData.syndicateCard =
        req.files.find((file) => file.fieldname === "syndicateCard")?.path ||
        null;
      newDoctorData.certificates = req.files
        .filter((file) => file.fieldname === "certificates")
        .map((file) => file.path);

      // Process clinicLicense inside the clinic array
      if (Array.isArray(newDoctorData.clinic)) {
        newDoctorData.clinic = newDoctorData.clinic.map((clinic, index) => {
          const clinicLicenseFile = req.files.find(
            (file) => file.fieldname === `clinic[${index}][clinicLicense]`
          );
          return {
            ...clinic,
            clinicLicense: clinicLicenseFile ? clinicLicenseFile.path : null,
          };
        });
      }
    }

    let validationError = validationResult(req);
    if (!validationError.isEmpty()) {
      throw validationError;
    }

    let hashedPassword = await bcrypt.hash(newDoctorData.doctorPassword, 6);
    let addDoctor = await doctor.create({
      ...newDoctorData,
      doctorPassword: hashedPassword,
      status: "pending" // Explicitly set status to pending
    });

    // Send a welcome email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: parseInt(process.env.EMAIL_PORT) || 587,
      auth: {
        user: process.env.USER,
        pass: process.env.PASS,
      },
    });

    const mailOptions = {
      from: "bimar.med24@gmail.com",
      to: newDoctorData.doctorEmail,
      subject: "Welcome to Bimar - Registration Under Review",
      html: ` <div style="font-family: Arial, sans-serif; background-color: #F0F4F9; padding: 40px;"> 
                <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px;"> 
                  <h1 style="background-color: #16423C; color: white; padding: 30px; text-align: center;">👋 Welcome to Bimar</h1> 
                  <div style="padding: 30px;"> 
                  <h2>Hello, ${newDoctorData.doctorName} 👋</h2> 
                  <p>Thank you for registering with Bimar! We're excited to have you join our medical community.</p>
                  <p>Your registration is currently under review by our team. We will carefully examine your credentials and documents to ensure everything meets our standards.</p>
                  <p>You will receive another email once your account has been reviewed and activated. This process typically takes 1-2 business days.</p>
                  <p>If you have any questions during this process, please don't hesitate to contact our support team.</p>
                  <p>Best regards,</p> 
                  <p>Bimar's Team</p> 
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
              </style>`,
    };

    if (addDoctor) {
      await transporter.sendMail(mailOptions);
      res.status(201).json({
        status: responseMsgs.SUCCESS,
        data: "Registration submitted successfully. Your account is pending review.",
      });
    }
  } catch (er) {
    console.log("Error in register DOCTOR controller", er);
    errorHandler(res, er);
  }
};

const login = async (req, res) => {
  try {
    let credentials = req.body;
    
    // First, try to find admin with the provided email
    let admin = await Admin.findOne({ email: credentials.doctorEmail });
    
    if (admin) {
      // If admin exists, check password
      let checkPassword = await bcrypt.compare(
        credentials.doctorPassword,
        admin.password
      );
      
      if (!checkPassword) {
        throw "Wrong Password";
      }
      
      // Create token with admin ID and isAdmin flag
      let token = jwt.sign(
        { 
          userId: admin._id,
          isAdmin: true 
        },
        process.env.JWT_KEY
      );
      
      // Return admin data with token
      return res.status(200).cookie("jwt", token).json({
        status: responseMsgs.SUCCESS,
        data: "Logged In Successfully as Admin",
        user: {
          _id: admin._id,
          email: admin.email,
          name: admin.name,
          isAdmin: true
        }
      });
    }
    
    // If not an admin, check for doctor
    let getDoctor = await doctor.findOne({ doctorEmail: credentials.doctorEmail });
    
    if (!getDoctor) {
      throw "User Not Found";
    }

    let checkPassword = await bcrypt.compare(
      credentials.doctorPassword,
      getDoctor.doctorPassword
    );
    
    if (!checkPassword) {
      throw "Wrong Password";
    }

    // Check doctor's account status
    if (getDoctor.status !== "active") {
      return res.status(403).json({
        status: responseMsgs.FAIL,
        data: `Your account is currently ${getDoctor.status}. Please contact support for more information.`,
        accountStatus: getDoctor.status
      });
    }

    // Create token with doctor ID and isAdmin:false
    let token = jwt.sign(
      { 
        userId: getDoctor._id,
        isAdmin: false 
      },
      process.env.JWT_KEY
    );
    
    // Return doctor data with token
    res.status(200).cookie("jwt", token).json({
      status: responseMsgs.SUCCESS,
      data: "Logged In Successfully as Doctor",
      doctor: getDoctor,
      isAdmin: false
    });
    
  } catch (er) {
    console.log("Error in login controller", er);
    errorHandler(res, er);
  }
};

// Generate OTP Function
const generateOtp = () => {
  return String(Math.floor(10000 + Math.random() * 90000)).padStart(5, "0");
};

// Forget Password Function
const forgetPassword = async (req, res) => {
  try {
    const { doctorEmail } = req.body;
    const foundDoctor = await doctor.findOne({ doctorEmail });
    if (!foundDoctor) {
      throw "User With This Email does not exist";
    }

    const otp = generateOtp();

    const token = jwt.sign({ email: doctorEmail }, process.env.JWT_KEY, {
      expiresIn: "10m",
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: parseInt(process.env.EMAIL_PORT) || 587,
      auth: {
        user: process.env.USER,
        pass: process.env.PASS,
      },
    });

    const mailOptions = {
      from: "bimar.med24@gmail.com",
      to: doctorEmail,
      subject: "Password Reset OTP",
      html: `
      <div style="font-family: Arial, sans-serif; background-color: #F0F4F9; padding: 40px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px;">
          <h1 style="background-color: #16423C; color: white; padding: 30px; text-align: center;">🔒 Password Reset</h1>
          <div style="padding: 30px;">
            <h2>Hello, ${doctorEmail} 👋</h2>
            <p>We've received a request to reset your password. Use OTP below:</p>
            <h3 style="color: #16423C; text-align: center;">${otp}</h3>
            <p>This OTP is valid for 10 minutes. If not requested, ignore this email.</p>
          </div>
        </div>
      </div>`,
    };

    await transporter.sendMail(mailOptions);

    res.cookie("otp", otp, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 10 * 60 * 1000,
    });

    res.status(200).cookie("jwt", token).json({
      status: responseMsgs.SUCCESS,
      data: "OTP sent to your email",
    });
  } catch (err) {
    console.log(err);
    errorHandler(res, err);
  }
};

// Verify OTP Function
const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const storedOtp = req.cookies.otp;

    if (!storedOtp) {
      return res.status(400).json({
        status: responseMsgs.FAILURE,
        data: "OTP has expired or does not exist",
      });
    }

    if (storedOtp !== otp) {
      return res.status(400).json({
        status: responseMsgs.FAILURE,
        data: "Incorrect OTP. Please try again.",
      });
    }

    res.status(200).json({
      status: responseMsgs.SUCCESS,
      data: "OTP verified successfully. Now you can reset your password",
    });
  } catch (err) {
    console.log(err);
    errorHandler(res, err);
  }
};

// Reset Password Function
const resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const token = req.cookies.jwt;

    if (!token) {
      throw "No Token Provided";
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_KEY);
    } catch (err) {
      throw "Invalid or expired token";
    }

    const email = decoded.email;

    const foundDoctor = await doctor.findOne({ doctorEmail: email });
    if (!foundDoctor) {
      throw "User Not Found";
    }

    const hashedPassword = await bcrypt.hash(newPassword, 6);

    const update = await doctor.updateOne(
      { doctorEmail: email },
      { doctorPassword: hashedPassword }
    );

    res.clearCookie("otp");

    res
      .status(200)
      .json(
        update
          ? { data: "Password updated" }
          : { data: "Password update failed" }
      );
  } catch (err) {
    console.log(err);
    errorHandler(res, err);
  }
};

// Get All Active Doctors Function
const getAllDoctors = async (req, res) => {
  try {
    const doctors = await doctor.find({ status: "active" });
    res.status(200).json({
      status: responseMsgs.SUCCESS,
      data: doctors,
    });
  } catch (err) {
    console.log(err);
    errorHandler(res, err);
  }
};

// Delete Doctor Function
const deleteDoctor = async (req, res) => {
  try {
    const { email } = req.body; // Assuming the email is sent in the request body

    if (!email) {
      throw "Email is required to delete the account";
    }

    const result = await doctor.deleteOne({ doctorEmail: email });

    if (result.deletedCount === 0) {
      throw "Doctor not found or already deleted";
    }

    res.status(200).json({
      status: responseMsgs.SUCCESS,
      data: "Doctor account deleted successfully",
    });
  } catch (err) {
    console.log(err);
    errorHandler(res, err);
  }
};

// Delete Clinic Function
const deleteClinic = async (req, res) => {
  try {
    const { doctorEmail, clinicId } = req.body; // Assuming the email and clinic ID are sent in the request body

    if (!doctorEmail || !clinicId) {
      throw "Doctor email and clinic ID are required to delete the clinic";
    }

    const result = await doctor.updateOne(
      { doctorEmail: doctorEmail },
      { $pull: { clinic: { _id: clinicId } } } // Use $pull to remove the clinic by ID
    );

    if (result.modifiedCount === 0) {
      throw "Clinic not found or already deleted";
    }

    res.status(200).json({
      status: responseMsgs.SUCCESS,
      data: "Clinic deleted successfully",
    });
  } catch (err) {
    console.log(err);
    errorHandler(res, err);
  }
};

// Update Doctor Function
const updateDoctor = async (req, res) => {
  try {
    const { email } = req.body; // Extract email from the request body

    if (!email) {
      throw "Email is required to update the doctor";
    }

    // Create an object to hold the fields to update
    const updateData = {};

    // Check for each field and add it to updateData if it exists in the request body
    if (req.body.doctorName) updateData.doctorName = req.body.doctorName;
    if (req.body.doctorDateOfBirth)
      updateData.doctorDateOfBirth = req.body.doctorDateOfBirth;
    if (req.body.doctorPhone) updateData.doctorPhone = req.body.doctorPhone;
    if (req.body.doctorEmail) updateData.doctorEmail = req.body.doctorEmail;

    // Do not allow changes to the following fields
    // Commented out to prevent updates
    // if (req.body.nationalID) updateData.nationalID = req.body.nationalID;
    // if (req.body.field) updateData.field = req.body.field;
    // if (req.body.syndicateID) updateData.syndicateID = req.body.syndicateID;
    // if (req.body.syndicateCard) updateData.syndicateCard = req.body.syndicateCard;
    // if (req.body.certificates) updateData.certificates = req.body.certificates;

    // Update the doctor in the database
    const result = await doctor.updateOne(
      { doctorEmail: email },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      throw "Doctor not found or no changes made";
    }

    res.status(200).json({
      status: responseMsgs.SUCCESS,
      data: "Doctor updated successfully",
    });
  } catch (err) {
    console.log(err);
    errorHandler(res, err);
  }
};

const updateClinic = async (req, res) => {
  try {
    const { doctorEmail, clinicId, clinicData } = req.body; // Extract email, clinic ID, and new clinic data

    if (!doctorEmail || !clinicId || !clinicData) {
      throw "Doctor email, clinic ID, and clinic data are required to update the clinic";
    }

    // Create an object to hold the fields to update
    const updateData = {};

    // Check for each field in clinicData and add it to updateData if it exists
    if (clinicData.clinicName)
      updateData["clinic.$.clinicName"] = clinicData.clinicName;
    if (clinicData.clinicCity)
      updateData["clinic.$.clinicCity"] = clinicData.clinicCity;
    if (clinicData.clinicArea)
      updateData["clinic.$.clinicArea"] = clinicData.clinicArea;
    if (clinicData.clinicAddress)
      updateData["clinic.$.clinicAddress"] = clinicData.clinicAddress;
    if (clinicData.clinicPhone)
      updateData["clinic.$.clinicPhone"] = clinicData.clinicPhone;
    if (clinicData.clinicEmail)
      updateData["clinic.$.clinicEmail"] = clinicData.clinicEmail;
    if (clinicData.clinicWebsite)
      updateData["clinic.$.clinicWebsite"] = clinicData.clinicWebsite;
    if (clinicData.clinicLocationLinks)
      updateData["clinic.$.clinicLocationLinks"] =
        clinicData.clinicLocationLinks;
    if (clinicData.Price) updateData["clinic.$.Price"] = clinicData.Price;

    // Do not allow changes to the following fields
    // Commented out to prevent updates
    // if (clinicData.clinicLicense) updateData.clinicLicense = clinicData.clinicLicense;

    // Update the specific clinic in the database
    const result = await doctor.updateOne(
      { doctorEmail: doctorEmail, "clinic._id": clinicId },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      throw "Clinic not found or no changes made";
    }

    res.status(200).json({
      status: responseMsgs.SUCCESS,
      data: "Clinic updated successfully",
    });
  } catch (err) {
    console.log(err);
    errorHandler(res, err);
  }
};

const getField = async (req, res) => {
  try {
    const { field } = req.body; // Extract field from the request body
    const doctors = await doctor.find({ field: field });
    res.status(200).json({
      status: responseMsgs.SUCCESS,
      data: doctors,
    });
  } catch (err) {
    console.log(err);
    errorHandler(res, err);
  }
};

const updateDoctorImage = async (req, res) => {
  try {
    if (!req.file) {
      throw "No image file provided";
    }

    const token = req.cookies.jwt;
    if (!token) {
      throw "No Token Provided";
    }

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const Doctor = await doctor.findById(decoded.userId);
    console.log(decoded.userId)
    if (!Doctor) {
      throw "Doctor not found";
    }

    // Update profile image path
    Doctor.doctorImage = req.file.path;
    await Doctor.save();

    res.status(200).json({
      status: responseMsgs.SUCCESS,
      data: {
        message: "Profile picture updated successfully",
        doctorImage: doctor.doctorImage,
      },
    });
  } catch (err) {
    console.log(err);
    errorHandler(res, err);
  }
};

// Get Doctor Details for Re-application
const getDoctorDetailsForEdit = async (req, res) => {
  try {
    const { id } = req.params;
    const foundDoctor = await doctor.findById(id);

    if (!foundDoctor) {
      return res.status(404).json({
        status: responseMsgs.FAIL,
        data: ["Doctor not found"],
      });
    }

    // This route is public, but we only return data if the doctor was rejected.
    if (foundDoctor.status !== "rejected") {
      return res.status(403).json({
        status: responseMsgs.FAIL,
        data: ["This application cannot be edited at this time."],
      });
    }

    res.status(200).json({
      status: responseMsgs.SUCCESS,
      data: foundDoctor,
    });
  } catch (err) {
    console.log("Error in getDoctorDetailsForEdit:", err);
    errorHandler(res, err);
  }
};

// Resubmit Doctor Application
const resubmitDoctorApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const foundDoctor = await doctor.findById(id);
    if (!foundDoctor) {
      return res.status(404).json({
        status: responseMsgs.FAIL,
        data: ["Doctor not found"],
      });
    }

    // Ensure status cannot be manually changed by the payload
    if (updatedData.status) {
      delete updatedData.status;
    }

    const resubmittedDoctor = await doctor.findByIdAndUpdate(
      id,
      {
        ...updatedData,
        status: "pending", // Set status to pending for re-review
        rejectionReason: null, // Clear previous rejection reason
      },
      { new: true }
    );

    res.status(200).json({
      status: responseMsgs.SUCCESS,
      data: "Application resubmitted successfully. It will be reviewed by an admin shortly.",
      doctor: resubmittedDoctor,
    });
  } catch (err) {
    console.log("Error in resubmitDoctorApplication:", err);
    errorHandler(res, err);
  }
};
// Add Clinic Function
const addClinic = async (req, res) => {
  try {
    console.log("addClinic function called");
    console.log("Request body:", req.body);
    console.log("Request files:", req.files);
    
    const token = req.cookies.jwt;
    console.log("token:-", token);
    
    if (!token) {
      return res.status(401).json({
        status: responseMsgs.FAIL,
        data: "No Token Provided"
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_KEY);
      console.log("Decoded token:", decoded);
    } catch (jwtError) {
      console.log("JWT verification error:", jwtError);
      return res.status(401).json({
        status: responseMsgs.FAIL,
        data: "Invalid or expired token"
      });
    }

    const Doctor = await doctor.findById(decoded.userId);
    
    if (!Doctor) {
      return res.status(404).json({
        status: responseMsgs.FAIL,
        data: "Doctor not found"
      });
    }

    // Check if the user is a doctor (not an admin)
    if (decoded.isAdmin) {
      return res.status(403).json({
        status: responseMsgs.FAIL,
        data: "Unauthorized: Only doctors can add clinics"
      });
    }

    const clinicData = req.body;
    console.log("Clinic data received:", clinicData);
    
    // Validate required fields based on the clinic schema
    if (!clinicData.clinicCity || !clinicData.clinicArea || !clinicData.clinicAddress || 
        !clinicData.clinicPhone || !clinicData.clinicEmail || !clinicData.clinicLocationLinks || 
        !clinicData.Price || !clinicData.clinicWorkDays) {
      return res.status(400).json({
        status: responseMsgs.FAIL,
        data: "Missing required fields: clinicCity, clinicArea, clinicAddress, clinicPhone, clinicEmail, clinicLocationLinks, Price, and clinicWorkDays are required"
      });
    }

    // Validate clinicWorkDays structure
    if (!Array.isArray(clinicData.clinicWorkDays) || clinicData.clinicWorkDays.length === 0) {
      return res.status(400).json({
        status: responseMsgs.FAIL,
        data: "clinicWorkDays must be an array with at least one working day"
      });
    }

    // Validate each working day
    const validDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    for (const workDay of clinicData.clinicWorkDays) {
      if (!workDay.day || !validDays.includes(workDay.day)) {
        return res.status(400).json({
          status: responseMsgs.FAIL,
          data: `Invalid day: ${workDay.day}. Must be one of: ${validDays.join(", ")}`
        });
      }
      if (!workDay.workingHours || !Array.isArray(workDay.workingHours) || workDay.workingHours.length === 0) {
        return res.status(400).json({
          status: responseMsgs.FAIL,
          data: `Working hours are required for ${workDay.day}`
        });
      }
      if (typeof workDay.NoBookings !== 'number' || workDay.NoBookings < 0) {
        return res.status(400).json({
          status: responseMsgs.FAIL,
          data: `NoBookings must be a positive number for ${workDay.day}`
        });
      }
    }

    // Handle clinic license file upload
    let clinicLicensePath = null;
    if (req.files && req.files.length > 0) {
      const clinicLicenseFile = req.files.find(file => file.fieldname === "clinicLicense");
      if (clinicLicenseFile) {
        clinicLicensePath = clinicLicenseFile.path;
      }
    }

    // Ensure clinicPhone is an array
    const clinicPhoneArray = Array.isArray(clinicData.clinicPhone) 
      ? clinicData.clinicPhone 
      : [clinicData.clinicPhone];

    // Create new clinic object matching the schema
    const newClinic = {
      clinicName: clinicData.clinicName || Doctor.doctorName, // Use doctor name as default
      clinicLicense: clinicLicensePath,
      clinicCity: clinicData.clinicCity,
      clinicArea: clinicData.clinicArea,
      clinicAddress: clinicData.clinicAddress,
      clinicPhone: clinicPhoneArray,
      clinicEmail: clinicData.clinicEmail,
      clinicWebsite: clinicData.clinicWebsite || "",
      clinicWorkDays: clinicData.clinicWorkDays,
      clinicLocationLinks: clinicData.clinicLocationLinks,
      Price: clinicData.Price
    };

    console.log("New clinic object:", newClinic);

    // Add the new clinic to the doctor's clinic array
    const result = await doctor.updateOne(
      { _id: decoded.userId },
      { $push: { clinic: newClinic } }
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json({
        status: responseMsgs.FAIL,
        data: "Failed to add clinic"
      });
    }

    console.log("Clinic added successfully");
    return res.status(200).json({
      status: responseMsgs.SUCCESS,
      data: "Clinic added successfully",
      clinic: newClinic
    });
  } catch (err) {
    console.log("Error in addClinic:", err);
    return res.status(500).json({
      status: responseMsgs.FAIL,
      data: err.message || "Internal server error"
    });
  }
};

export default {
  register,
  login,
  forgetPassword,
  resetPassword,
  verifyOtp,
  getAllDoctors,
  deleteDoctor,
  deleteClinic,
  updateDoctor,
  updateClinic,
  getField,
  updateDoctorImage,
  getDoctorDetailsForEdit,
  resubmitDoctorApplication,
  addClinic,
};
