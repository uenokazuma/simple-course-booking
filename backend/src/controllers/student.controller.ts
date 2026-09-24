import { listStudentsForUser, getStudentBookingsForUser } from '../services/student.service.js';

export const listStudents = async (req: any, res: any): Promise<any> => {
  try {
    const user = req.user as { userId: number; roles: string[] } | undefined;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const students = await listStudentsForUser(user.userId, user.roles ?? []);
    return res.status(200).json({ data: students });
  } catch (error: any) {
    const statusCode = Number(error?.statusCode ?? 500);
    return res.status(statusCode).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
};

export const getStudentBookings = async (req: any, res: any): Promise<any> => {
  try {
    const user = req.user as { userId: number; roles: string[] } | undefined;
    const studentId = Number(req.params.studentId);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const bookings = await getStudentBookingsForUser(user.userId, user.roles ?? [], studentId);
    return res.status(200).json({ data: bookings });
  } catch (error: any) {
    const statusCode = Number(error?.statusCode ?? 500);
    return res.status(statusCode).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
};
