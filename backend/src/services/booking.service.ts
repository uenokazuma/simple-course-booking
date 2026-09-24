import prisma from '../config/prisma.js';
import logger from '../config/winston.js';
import { canBookForStudent } from './booking-policy.js';
import { getLeadTimeMilliseconds } from '../utils/booking-time.js';

export type BookingInput = {
  studentId: number;
  trialClassId: number;
  currentUser: {
    userId: number;
    roles: string[];
  };
};

export type BookingResult = {
  booking: any;
};

async function getSystemSetting(key: string): Promise<string | null> {
  const setting = await prisma.systemSetting.findUnique({ where: { key } });
  return setting?.value ?? null;
}

export async function createBookingRequest(input: BookingInput): Promise<BookingResult> {
  const { studentId, trialClassId, currentUser } = input;

  if (!Number.isInteger(studentId) || !Number.isInteger(trialClassId)) {
    throw Object.assign(new Error('student_id and trial_class_id must be valid integers'), { statusCode: 400 });
  }

  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    include: { parent: true }
  });

  if (!student) {
    throw Object.assign(new Error('Student not found'), { statusCode: 404 });
  }

  const parentProfile = await prisma.parentProfile.findUnique({
    where: { user_id: currentUser.userId }
  });

  const roles = currentUser.roles ?? [];
  const canAuthorise = canBookForStudent(
    {
      role: roles.includes('Parent') ? 'Parent' : 'Student',
      parentProfileId: parentProfile?.id ?? null,
      studentParentId: student.parent_id ?? null,
      userId: currentUser.userId,
      studentUserId: student.user_id
    },
    studentId
  );

  if (roles.includes('Parent') && !canAuthorise) {
    throw Object.assign(new Error('Forbidden: You do not have permission to book for this student'), { statusCode: 403 });
  }

  if (roles.includes('Student') && !canAuthorise) {
    throw Object.assign(new Error('Forbidden: You can only book for yourself'), { statusCode: 403 });
  }

  if (!roles.includes('Parent') && !roles.includes('Student')) {
    throw Object.assign(new Error('Forbidden: Invalid role for booking'), { statusCode: 403 });
  }

  const trialClass = await prisma.trialClass.findUnique({
    where: { id: trialClassId },
    include: { subject: true }
  });

  if (!trialClass) {
    throw Object.assign(new Error('Trial class not found'), { statusCode: 404 });
  }

  const existingBooking = await prisma.booking.findUnique({
    where: {
      student_id_trial_classes_id: {
        student_id: studentId,
        trial_classes_id: trialClassId
      }
    }
  });

  if (existingBooking) {
    throw Object.assign(new Error('Booking already exists for this student and class'), { statusCode: 409 });
  }

  const leadTimeValue = await getSystemSetting('booking_lead_time_value');
  const leadTimeUnit = await getSystemSetting('booking_lead_time_unit');
  if (leadTimeValue === null || leadTimeUnit === null) {
    throw Object.assign(new Error('Booking lead time settings are not configured'), { statusCode: 500 });
  }

  const leadTimeMilliseconds = getLeadTimeMilliseconds(leadTimeValue, leadTimeUnit);
  if (trialClass.start_time.getTime() < Date.now() + leadTimeMilliseconds) {
    throw Object.assign(new Error('Booking is not available within the required lead time'), { statusCode: 422 });
  }

  try {
    const booking = await prisma.$transaction(async (tx: any) => {
      const lockedClasses = await tx.$queryRaw<Array<{
        id: number;
        max_capacity: number | null;
      }>>`
        SELECT tc.id,
               COALESCE(tc.max_capacity, CAST(ss.value AS INTEGER)) AS max_capacity
        FROM trial_classes tc
        LEFT JOIN system_settings ss ON ss.key = 'max_allowed_class_capacity'
        WHERE tc.id = ${trialClassId}
        FOR UPDATE OF tc
      `;

      if (!lockedClasses.length) {
        throw Object.assign(new Error('Trial class not found'), { statusCode: 404 });
      }

      const lockedClass = lockedClasses[0];
      if (lockedClass.max_capacity === null || !Number.isInteger(lockedClass.max_capacity)) {
        throw Object.assign(new Error('max_allowed_class_capacity is not configured correctly'), { statusCode: 500 });
      }

      const activeBookingCount = await tx.booking.count({
        where: {
          trial_classes_id: trialClassId,
          status: { not: 'CANCELLED' }
        }
      });

      if (activeBookingCount >= lockedClass.max_capacity) {
        throw Object.assign(new Error('Class is already full'), { statusCode: 422 });
      }

      return tx.booking.create({
        data: {
          student_id: studentId,
          trial_classes_id: trialClassId,
          status: 'PENDING_PAYMENT'
        }
      });
    }, { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 });

    return { booking };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Booking service error: ${message}`);

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
      throw Object.assign(new Error('System is busy processing other transactions, please try again'), { statusCode: 503 });
    }

    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      throw Object.assign(new Error('Student is already booked for this class'), { statusCode: 409 });
    }

    throw Object.assign(new Error('Internal server error'), { statusCode: 500 });
  }
}
