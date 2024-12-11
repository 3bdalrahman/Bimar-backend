const mongoose = require("mongoose")
const { v4: uuidv4 } = require('uuid')

const PatientSchema = mongoose.Schema({
  userName: String,
  userPhone: String,
  userEmail: String,
  userPassword: String,
  medicalRecord: {
    allgeric: [String],
    chronicMedications: [String],
    surgeries: [String],
    chronicDiseases: [String],
    vaccinations: [String],
    bloodType: {
      type: String,
      enum: ["AB+", "A+", "B+", "O+", "AB-", "A-", "B-", "O-"],
    },
    familyHistory: {
      genatics: [String],
      genaticsDiseases: [String],
    },
  },

  Diagnosis: [{
    date: { type: Date, default: Date.now },
    doctorName: String,
    doctorPhone: String,
    diagnosis: [String],
    treatmentPlan: String,
    Xray: [String],
    labResults: [String],

    prescription: {
      prescriptionId: { type: String, default: uuidv4 },
      prescriptionDate: Date,
      prescriptionInstruction: [
        {
          medication: String,
          dosage: String, // الجرعات
          frequency: Number, // المرات ف اليوم الواحد
          duration: Number, // كام اسبوع
          notes: String,
        },
      ],
      prescriptionStatus: {
        type: String,
        enum: ["Pending", "Issued", "Expired"],
        default: "Pending",
      },
    },
    consultations: [{
      consultationId: { type: String, default: uuidv4 },
      consultationDate: Date,
      consultationDescription: String,
      consultationStatus: {
        type: String,
        enum: ["Pending", "Scheduled", "Completed"],
        default: "Pending",
      },
    }],
  }],

  personalRecords: {
    City: String,
    Area: String,
    userWeight: Number,
    userHeight: Number,
    DateOfBirth: String,
    emergencyContact: String,
    workName: String,
    workPlace: String,
    childrenNumber: Number,
    birthDateOfFirstChild: String,
    smoking: {
      type:String,
      enum:["Yes","No","Former smoker"],
    },
    alcohol: String,
    wifesNumber: Number,
    petsTypes: [String],
    familyStatus: {
      type: String,
      enum: ["Single", "Married", "Divorced", "Widowed"],
    },
    Gender: { type: String, enum: ["Male", "Female"] },
  },
});

const PatientModel = mongoose.model("PatientData", PatientSchema);

module.exports = PatientModel;
