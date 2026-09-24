import prisma from '../config/prisma.js';

export type StudentSummary = {
  id: number;
  student_name: string;
  birth_date: string | Date | null;
  parent_id: number | null;
  user_id: number;
};

export async function listStudentsForUser(userId: number, roles: string[]): Promise<StudentSummary[]> {
  if (roles.includes('Parent')) {
    const parentProfile = await prisma.parentProfile.findUnique({
      where: { user_id: userId }
    });

    if (!parentProfile) {
      return [];
    }

    const students = await prisma.studentProfile.findMany({
      where: { parent_id: parentProfile.id },
      orderBy: [{ student_name: 'asc' }]
    });

    return students.map((student: StudentSummary) => ({
      id: student.id,
      student_name: student.student_name,
      birth_date: student.birth_date,
      parent_id: student.parent_id,
      user_id: student.user_id
    }));
  }

  if (roles.includes('Student')) {
    const student = await prisma.studentProfile.findUnique({
      where: { user_id: userId }
    });

    if (!student) {
      return [];
    }

    return [{
      id: student.id,
      student_name: student.student_name,
      birth_date: student.birth_date,
      parent_id: student.parent_id,
      user_id: student.user_id
    }];
  }

  return [];
}

export async function getStudentBookingsForUser(userId: number, roles: string[], studentId: number) {
  if (!Number.isInteger(studentId)) {
    throw Object.assign(new Error('student_id must be a valid integer'), { statusCode: 400 });
  }

  if (roles.includes('Parent')) {
    const parentProfile = await prisma.parentProfile.findUnique({
      where: { user_id: userId }
    });

    if (!parentProfile) {
      throw Object.assign(new Error('Forbidden: You do not have access to this student'), { statusCode: 403 });
    }

    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId }
    });

    if (!student || student.parent_id !== parentProfile.id) {
      throw Object.assign(new Error('Forbidden: You do not have access to this student'), { statusCode: 403 });
    }
  } else if (roles.includes('Student')) {
    const student = await prisma.studentProfile.findUnique({
      where: { user_id: userId }
    });

    if (!student || (student.id !== studentId && student.user_id !== studentId)) {
      throw Object.assign(new Error('Forbidden: You can only view your own bookings'), { statusCode: 403 });
    }

    studentId = student.id;
  } else {
    throw Object.assign(new Error('Forbidden: Invalid role'), { statusCode: 403 });
  }

  return prisma.booking.findMany({
    where: { student_id: studentId },
    include: {
        student: true,
      trial_class: {
        include: { subject: true }
      }
    },
    orderBy: { trial_class: { start_time: 'asc' } }
  });
}
