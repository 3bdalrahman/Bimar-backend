import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const PatientSchema = mongoose.Schema({
  userName: String,
  userPhone: String,
  userEmail: String,
  userPassword: String,
  // fcmToken : String,
  profileImage: { type: String, default: null },
  medicalRecord: {
    allgeric: [String],
    chronicMedications: [String],
    surgeries: [String],
    chronicDiseases: [String],
    vaccinations: [String],
    bloodType: {
      type: String,
      enum: ["AB+", "A+", "B+", "O+", "AB-", "A-", "B-", "O-", ""],
      default: "",
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
    doctorImage: String,
    diagnosis: [String],
    treatmentPlan: String,
    Xray: [String],
    labResults: [String],

    prescription: {
      prescriptionId: { type: String, default: uuidv4 },
      prescriptionDate: Date,
      followUpDate: Date,
      notes: String,
      prescriptionInstruction: [
        {
          medication: String,
          dosage: String, // الجرعات
          frequency: Number, // المرات ف اليوم الواحد
          duration: Number, // كام اسبوع
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
      enum:["Yes","No","Former smoker", ""],
      default: "",
    },
    alcohol: String,
    wifesNumber: Number,
    petsTypes: [String],
    familyStatus: {
      type: String,
      enum: ["Single", "Married", "Divorced", "Widowed", ""],
      default: "",
    },
    Gender: { type: String, enum: ["Male", "Female"] },
  },
});

// Pre-save middleware to remove wifesNumber for female patients
PatientSchema.pre('save', function (next) {
  if (this.personalRecords && this.personalRecords.Gender === 'Female') {
      if ('wifesNumber' in this.personalRecords) {
          this.updateOne({ $unset: { "personalRecords.wifesNumber": "" } }).exec();
          console.log('Removed wifesNumber for female patient (save)');
      }
  }
  next();
});

const PatientModel = mongoose.model("PatientData", PatientSchema);

export default PatientModel;