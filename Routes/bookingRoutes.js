import express from 'express';
import bookingController from '../controllers/bookingController.js';

const router = express.Router();

router.post('/', bookingController.createAppointemnt);
router.post('/follow-up', bookingController.createFollowUpAppointment);
router.get('/', bookingController.getAppointments);
router.patch('/', bookingController.updateAppointment);
router.patch('/:id',bookingController.cancelAppointment);
router.delete('/:id',bookingController.deleteAppointment);

export default router;
