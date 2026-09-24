import express from 'express';
import { login } from '../controllers/auth.controller.js';
import { createBooking } from '../controllers/booking.controller.js';
import { paymentWebhook, triggerPayment } from '../controllers/payment.controller.js';
import { listStudents, getStudentBookings } from '../controllers/student.controller.js';
import { listTrialClassesController, getTrialClassController } from '../controllers/trial-class.controller.js';
import { verifyJWT, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/auth/login', login);
// router.post('/bookings', verifyJWT, requireRole(['Parent', 'Student']), createBooking);
// router.get('/students', verifyJWT, requireRole(['Parent', 'Student']), listStudents);
router.post('/bookings', verifyJWT, requireRole(['Parent']), createBooking);
router.get('/students', verifyJWT, requireRole(['Parent']), listStudents);
router.get('/students/:studentId/bookings', verifyJWT, requireRole(['Parent', 'Student']), getStudentBookings);
router.get('/trial-classes', verifyJWT, requireRole(['Parent', 'Student']), listTrialClassesController);
router.get('/trial-classes/:trialClassId', verifyJWT, requireRole(['Parent', 'Student']), getTrialClassController);
router.post('/payments/webhook', paymentWebhook);
router.post('/payments/trigger', verifyJWT, requireRole(['Parent']), triggerPayment);

export default router;
