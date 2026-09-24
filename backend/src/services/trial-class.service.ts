import prisma from '../config/prisma.js';

export async function listTrialClasses() {
  return prisma.trialClass.findMany({
    include: {
      subject: true,
      _count: {
        select: { bookings: true }
      }
    },
    orderBy: [{ start_time: 'asc' }]
  });
}

export async function getTrialClassById(trialClassId: number) {
  if (!Number.isInteger(trialClassId)) {
    throw Object.assign(new Error('trial_class_id must be a valid integer'), { statusCode: 400 });
  }

  return prisma.trialClass.findUnique({
    where: { id: trialClassId },
    include: {
      subject: true,
      bookings: {
        include: {
          student: true
        }
      }
    }
  });
}
