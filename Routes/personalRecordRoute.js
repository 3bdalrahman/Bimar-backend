const express = require("express");
const router = express.Router();
const PatientRecordController = require('./../controllers/PatientRecordController');
// const patientValidator = require('../validation/patientAuthValid')

router.get('/',PatientRecordController.getPatientRecords);
router.put('/'/*,patientValidator.personalRecordsValidation()*/,PatientRecordController.updatePersonalRecords);

module.exports = router;