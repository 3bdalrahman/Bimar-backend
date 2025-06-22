import { body } from "express-validator";
import User from "../models/PatientAuth_Model.js";

// Phone number validation function
// const phoneValidator = (value) => {
//   const regex = /^01[0-2,5]\d{1,8}$/;
//   return regex.test(value);
// };

 const userValidation = () => {
  return [
    body("userName").notEmpty().withMessage("Name cant be Empty"),
    body("userPassword")
      .notEmpty()
      .withMessage("Password cant be Empty")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long")
      .custom((value) => {
        if (!/[A-Z]/.test(value)) {
          throw new Error(
            "Password must contain at least one uppercase letter"
          );
        }
        if (!/[a-z]/.test(value)) {
          throw new Error(
            "Password must contain at least one lowercase letter"
          );
        }
        if (!/\d/.test(value)) {
          throw new Error("Password must contain at least one number");
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
          throw new Error(
            "Password must contain at least one special character"
          );
        }
        return true;
      }),
    body("userEmail")
      .notEmpty()
      .withMessage("Email cant be Empty")
      .isEmail()
      .withMessage("Email Formate is invalid")
      .custom(async (data) => {
        let checkUser = await User.findOne({ userEmail: data });
        if (checkUser) {
          throw "User Already Exists";
        }
      }),

    body("userPhone")
      .notEmpty()
      .withMessage("Phone cant be Empty")
      .isMobilePhone()
      .withMessage("Phone Format invalid")
      .custom(async (data) => {
        let checkUser = await User.findOne({ userPhone: data });
        if (checkUser) {
          throw "Phone Already Exists";
        }
      }),
    // body("personalRecords.City").notEmpty().withMessage("City cant be Empty"),
    // body("personalRecords.Area").notEmpty().withMessage("Area cant be Empty"),
    // body("personalRecords.Gender")
    //   .notEmpty()
    //   .withMessage("Gender cant be Empty")
    //   .isIn(["Male", "Female"])
    //   .withMessage(
    //     "invalid gender we don't support LGPTQ choose between Male or Female"
    //   ),
    // body("personalRecords.userWeight")
    //   .notEmpty()
    //   .withMessage("Weight cant be Empty"),
    // body("personalRecords.userHeight")
    //   .notEmpty()
    //   .withMessage("Height cant be Empty"),
    // body("personalRecords.DateOfBirth")
    //   .notEmpty()
    //   .withMessage("DateOfBirth cant be Empty"),
    // body("personalRecords.emergencyContact")
    //   .notEmpty()
    //   .withMessage("emergencyContact cant be Empty")
    //   .isMobilePhone("any")
    //   .withMessage("emergencyContact Format invalid")
    //   .custom((value, { req }) => {
    //     if (value === req.body.userPhone) {
    //       throw new Error("emergencyContact cannot be the same as userPhone");
    //     }
    //     return true;
      // }),
    // body("personalRecords.workName")
    //   .notEmpty()
    //   .withMessage("workName cant be Empty"),
    // body("personalRecords.workPlace")
    //   .notEmpty()
    //   .withMessage("worPlace cant be Empty"),
    // body("personalRecords.childrenNumber")
    //   .notEmpty()
    //   .withMessage("childrenNumber cant be Empty"),
    // body("personalRecords.birthDateOfFirstChild").custom((value, { req }) => {
    //   if (req.body.personalRecords.childrenNumber == "0" && value) {
    //     throw new Error(
    //       "birthDateOfFirstChild cannot exist if there are no children"
    //     );
    //   }
    //   return true;
    // }),
    // body("personalRecords.smoking")
    //   .notEmpty()
    //   .withMessage("smoking cant be Empty")
    //   .isIn(["Yes", "No", "Former smoker"])
    //   .withMessage(
    //     "invalid smoking answer it should be Yes or No or Former smoker"
    //   ),
    // body("personalRecords.alcohol")
    //   .notEmpty()
    //   .withMessage("alcohol cant be Empty"),
    // body("personalRecords.wifesNumber").custom((value, { req }) => {
    //   if (req.body.personalRecords.Gender === "Female") {
    //     if (value) {
    //       throw "wifesNumber should not exist if Gender is female";
    //     }
    //   } else {
    //     if (value === undefined || value === null) {
    //       throw "wifesNumber cant be Empty";
    //     }
    //     if (
    //       ["Married"].includes(req.body.personalRecords.familyStatus) &&
    //       value === 0
    //     ) {
    //       throw "wifesNumber cannot be zero if family status is Married";
    //     }
    //     if (
    //       ["Single", "Divorced", "Widowed"].includes(
    //         req.body.personalRecords.familyStatus
    //       ) &&
    //       value != 0
    //     ) {
    //       throw "WifesNumber should be zero";
    //     }
    //   }
    //   return true;
    // }),
    // body("personalRecords.petsTypes")
    //   .isArray()
    //   .withMessage("petsTypes cant be Empty"),
    // body("personalRecords.familyStatus")
    //   .notEmpty()
    //   .withMessage("familyStatus cant be Empty")
    //   .isIn(["Single", "Married", "Divorced", "Widowed"])
    //   .withMessage(
    //     "it should be one of Single or Married or Divorced or Widowed"
    //   ),
  ];
};
 const medicalRecordValidation = () => {
  return [
    // body("allgeric").notEmpty().withMessage("Allergic field cannot be empty"),
    // body("chronicMedications")
    //   .notEmpty()
    //   .withMessage("Chronic Medications field cannot be empty"),
    // body("surgeries").notEmpty().withMessage("Surgeries field cannot be empty"),
    // body("chronicDiseases")
    //   .notEmpty()
    //   .withMessage("Chronic Diseases field cannot be empty"),
    // body("immunizations")
    //   .notEmpty()
    //   .withMessage("Immunizations field cannot be empty"),
    // body("vaccinations")
    //   .notEmpty()
    //   .withMessage("Vaccinations field cannot be empty"),
    body("bloodType")
      .optional()
      .isIn(["AB+", "A+", "B+", "O+", "AB-", "A-", "B-", "O-", ""])
      .withMessage("Invalid blood type"),
    // body("familyHistory.genatics")
    //   .isArray()
    //   .withMessage("Family history genetics must be an array"),
    // body("familyHistory.genaticsDiseases")
    //   .isArray()
    //   .withMessage("Family history genetic diseases must be an array"),
  ];
};

 const DiagnosisValidation = () => {
  return [
    body("doctorName").notEmpty().withMessage("Doctor Name Can't Be Empty"),
    body("doctorPhone")
      .notEmpty()
      .withMessage("Doctor Phone Can't Be Empty")
      .isMobilePhone()
      .withMessage("Mobile Formate Wrong"),
    body("diagnosis").notEmpty().withMessage("Diagnosis Can't Be Empty"),
    body("treatmentPlan")
      .notEmpty()
      .withMessage("TreatmentPlan Can't Be Empty"),
    body("prescriptionInstruction.*.medication")
      .notEmpty()
      .withMessage("Medication Can't Be Empty"),
    body("prescriptionInstruction.*.dosage")
      .notEmpty()
      .withMessage("Dosage Can't Be Empty"),
    body("prescriptionInstruction.*.frequency")
      .notEmpty()
      .withMessage("Frequency Can't Be Empty"),
    body("prescriptionInstruction.*.duration")
      .notEmpty()
      .withMessage("Duration Can't Be Empty"),
    body("consultations.*.consultationDate")
      .notEmpty()
      .withMessage("Consultation Date Can't Be Empty"),
  ];
};

// const personalRecordsValidation = ()=>{
//     return [
//         body('personalRecords.City').notEmpty().withMessage('City cant be Empty'),
//         body('personalRecords.Area').notEmpty().withMessage('Area cant be Empty'),
//         body('personalRecords.Gender').notEmpty().withMessage('Gender cant be Empty')
//             .isIn(['Male','Female']).withMessage("invalid gender we don't support LGPTQ choose between Male or Female"),
//         body('personalRecords.userWeight').notEmpty().withMessage('Weight cant be Empty'),
//         body('personalRecords.userHeight').notEmpty().withMessage('Height cant be Empty'),
//         body('personalRecords.DateOfBirth').notEmpty().withMessage('DateOfBirth cant be Empty'),
//         body('personalRecords.emergencyContact').notEmpty().withMessage('emergencyContact cant be Empty')
//             .isMobilePhone('any').withMessage('emergencyContact Format invalid')
//             .custom((value, { req }) => {
//                 if (value === req.body.userPhone) {
//                     throw new Error('emergencyContact cannot be the same as userPhone');
//                 }
//                 return true;
//             }),
//         body('personalRecords.workName').notEmpty().withMessage('workName cant be Empty'),
//         body('personalRecords.workPlace').notEmpty().withMessage('worPlace cant be Empty'),
//         body('personalRecords.childrenNumber').notEmpty().withMessage('childrenNumber cant be Empty'),
//         body('personalRecords.birthDateOfFirstChild').custom((value, { req }) => {
//             if (req.body.personalRecords.childrenNumber == '0' && value) {
//                 throw new Error('birthDateOfFirstChild cannot exist if there are no children');
//             }
//             return true;
//         }),
//         body('personalRecords.smoking').notEmpty().withMessage('smoking cant be Empty')
//             .isIn(["Yes","No","Former smoker"]).withMessage('invalid smoking answer it should be Yes or No or Former smoker'),
//         body('personalRecords.alcohol').notEmpty().withMessage('alcohol cant be Empty'),
//         body('personalRecords.wifesNumber').custom((value, { req }) => {
//             if (req.body.personalRecords.Gender === 'Female') {
//                 if (value) {
//                     throw('wifesNumber should not exist if Gender is female');
//                 }
//             } else {
//                 if (value === undefined || value === null) {
//                     throw('wifesNumber cant be Empty');
//                 }
//                 if (['Married', 'Divorced', 'Widowed'].includes(req.body.personalRecords.familyStatus) && value === 0) {
//                     throw('wifesNumber cannot be zero if family status is Married, Divorced, or Widowed');
//                 }
//             }
//             return true;
//         }),
//         body('personalRecords.petsTypes').isArray().withMessage('petsTypes cant be Empty'),
//         body('personalRecords.familyStatus').notEmpty().withMessage('familyStatus cant be Empty')
//             .isIn(["Single", "Married", "Divorced", "Widowed"]).withMessage('it should be one of Single or Married or Divorced or Widowed'),
//     ];
// };

export default {
  userValidation,
  medicalRecordValidation,
  DiagnosisValidation
};
