import { createBookingRequest } from '../services/booking.service.js';

export const createBooking = async (req: any, res: any): Promise<any> => {
  try {
    const { student_id, trial_class_id } = req.body ?? {};
    const user = req.user as { userId: number; roles: string[] } | undefined;

    if (!student_id || !trial_class_id) {
      return res.status(400).json({ error: 'student_id and trial_class_id are required' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await createBookingRequest({
      studentId: Number(student_id),
      trialClassId: Number(trial_class_id),
      currentUser: {
        userId: user.userId,
        roles: user.roles ?? []
      }
    });

    return res.status(201).json({
      message: 'Booking created. Trigger payment to continue.',
      booking: result.booking
    });
  } catch (error: any) {
    const statusCode = Number(error?.statusCode ?? 500);
    const message = error instanceof Error ? error.message : 'Internal server error';

    return res.status(statusCode).json({ error: message });
  }
};
