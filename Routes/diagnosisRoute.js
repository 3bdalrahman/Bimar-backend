const express = require('express')
const router = express.Router()
const diagnosisController = require ('./../controllers/Diagnosis')
const Diagnosisvalidator = require('./../validation/patientAuthValid')
const uploadDig = require('./../utilities/imagUpload')

router.route('/')
.post(uploadDig.upload.fields([
    { name: 'Xray', maxCount: 5 },
    { name: 'labResults', maxCount: 5 },
  ]),Diagnosisvalidator.DiagnosisValidation(),diagnosisController.creatDiagnosis)
.get(diagnosisController.getDiagnosis)
.patch(diagnosisController.updateDiagnosis)

router.route('/:id')
.delete(diagnosisController.deletePrescription)
.patch(diagnosisController.updatePrescription)

router.route('/consultation/:id')
.patch(diagnosisController.updateconsultation)
.delete(diagnosisController.deleteconsultation)


module.exports = router