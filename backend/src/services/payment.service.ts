import { randomUUID } from 'node:crypto';
import prisma from '../config/prisma.js';
import logger from '../config/winston.js';
import { canBookForStudent } from './booking-policy.js';

export type WebhookResult = {
  success: boolean;
  reason?: string;
};

export async function triggerPaymentRequest(
  bookingId: number,
  currentUser: { userId: number; roles: string[] }
): Promise<{ booking: any; paymentAttempt: any }> {
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    throw Object.assign(new Error('booking_id must be a valid integer'), { statusCode: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      student: true,
      trial_class: { include: { subject: true } },
      payments: true
    }
  });

  if (!booking) {
    throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
  }

  if (booking.status !== 'PENDING_PAYMENT') {
    throw Object.assign(new Error('Booking is not awaiting payment'), { statusCode: 409 });
  }

  if (booking.payments.some((payment: { status: string }) => payment.status === 'SUCCESSFUL')) {
    throw Object.assign(new Error('Payment already processed'), { statusCode: 409 });
  }

  const roles = currentUser.roles ?? [];
  const student = booking.student;
  let authorized = false;

  if (roles.includes('Student')) {
    authorized = canBookForStudent(
      { role: 'Student', userId: currentUser.userId, studentUserId: student.user_id },
      student.id
    );
  } else if (roles.includes('Parent')) {
    const parentProfile = await prisma.parentProfile.findUnique({ where: { user_id: currentUser.userId } });
    authorized = canBookForStudent(
      {
        role: 'Parent',
        parentProfileId: parentProfile?.id,
        studentParentId: student.parent_id
      },
      student.id
    );
  }

  if (!authorized) {
    throw Object.assign(new Error('Forbidden: You do not have permission to pay for this booking'), { statusCode: 403 });
  }

  try {
    const paymentAttempt = await prisma.$transaction(async (tx: any) => {
      const existingPayment = await tx.paymentAttempt.findFirst({
        where: { booking_id: booking.id, status: 'PENDING' }
      });

      if (existingPayment) {
        return existingPayment;
      }

      const lockedClasses = await tx.$queryRaw<Array<{
        id: number;
        current_booked: number;
        max_capacity: number | null;
      }>>`
        SELECT tc.id,
               tc.current_booked,
               COALESCE(tc.max_capacity, CAST(ss.value AS INTEGER)) AS max_capacity
        FROM trial_classes tc
        LEFT JOIN system_settings ss ON ss.key = 'max_allowed_class_capacity'
        WHERE tc.id = ${booking.trial_classes_id}
        FOR UPDATE OF tc
      `;

      if (!lockedClasses.length) {
        throw Object.assign(new Error('Class not found'), { statusCode: 404 });
      }

      const trialClass = lockedClasses[0];
      if (trialClass.max_capacity === null) {
        throw Object.assign(new Error('max_allowed_class_capacity is not configured correctly'), { statusCode: 500 });
      }

      if (trialClass.current_booked >= trialClass.max_capacity) {
        throw Object.assign(new Error('Class is already full'), { statusCode: 422 });
      }

      const transactionReference = `REF-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
      const paymentAttempt = await tx.paymentAttempt.create({
        data: {
          booking_id: booking.id,
          amount: booking.trial_class.subject.price,
          status: 'PENDING',
          transaction_reference: transactionReference
        }
      });

      return paymentAttempt;
    }, { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 });

    return { booking, paymentAttempt };
  } catch (error: any) {
    if (error?.statusCode) {
      throw error;
    }
    if (error?.code === 'P2034') {
      throw Object.assign(new Error('System is busy processing other transactions, please try again'), { statusCode: 503 });
    }
    throw Object.assign(new Error('Internal server error'), { statusCode: 500 });
  }

}

export async function processPaymentWebhook(
  transactionReference: string,
  paymentStatus: 'SUCCESSFUL' | 'FAILED'
): Promise<WebhookResult> {
  if (!transactionReference) {
    throw Object.assign(new Error('transaction_reference and status are required'), { statusCode: 400 });
  }

  try {
    const webhookResult = await prisma.$transaction(
      async (tx: any) => {
        const paymentAttempt = await tx.paymentAttempt.findUnique({
          where: { transaction_reference: transactionReference },
          include: { booking: true }
        });

        if (!paymentAttempt) {
          throw Object.assign(new Error('PAYMENT_NOT_FOUND'), { code: 'PAYMENT_NOT_FOUND', statusCode: 404 });
        }

        if (paymentAttempt.status !== 'PENDING') {
          throw Object.assign(new Error('PAYMENT_ALREADY_PROCESSED'), { code: 'PAYMENT_ALREADY_PROCESSED', statusCode: 200 });
        }

        if (paymentStatus === 'FAILED') {
          await tx.paymentAttempt.update({
            where: { id: paymentAttempt.id },
            data: { status: 'FAILED' }
          });

          await tx.booking.update({
            where: { id: paymentAttempt.booking_id },
            data: { status: 'CANCELLED' }
          });

          return { success: false, reason: 'FAILED' } satisfies WebhookResult;
        }

        const trialClassId = paymentAttempt.booking.trial_classes_id;
        const lockedClasses = await tx.$queryRaw<Array<{
          id: number;
          current_booked: number;
          max_capacity: number | null;
        }>>`
          SELECT tc.id,
                 tc.current_booked,
                 COALESCE(tc.max_capacity, CAST(ss.value AS INTEGER)) AS max_capacity
          FROM trial_classes tc
          LEFT JOIN system_settings ss ON ss.key = 'max_allowed_class_capacity'
          WHERE tc.id = ${trialClassId}
          FOR UPDATE OF tc
        `;

        if (!lockedClasses || lockedClasses.length === 0) {
          throw Object.assign(new Error('CLASS_NOT_FOUND'), { code: 'CLASS_NOT_FOUND', statusCode: 404 });
        }

        const trialClass = lockedClasses[0];

        if (trialClass.max_capacity === null) {
          throw Object.assign(new Error('max_allowed_class_capacity is not configured correctly'), {
            code: 'CAPACITY_NOT_CONFIGURED',
            statusCode: 500
          });
        }

        if (trialClass.current_booked >= trialClass.max_capacity) {
          await tx.paymentAttempt.update({
            where: { id: paymentAttempt.id },
            data: { status: 'FAILED' }
          });

          await tx.booking.update({
            where: { id: paymentAttempt.booking_id },
            data: { status: 'CANCELLED' }
          });

          return { success: false, reason: 'CLASS_FULL' } satisfies WebhookResult;
        }

        await tx.trialClass.update({
          where: { id: trialClass.id },
          data: { current_booked: { increment: 1 } }
        });

        await tx.paymentAttempt.update({
          where: { id: paymentAttempt.id },
          data: { status: 'SUCCESSFUL', paid_at: new Date() }
        });

        await tx.booking.update({
          where: { id: paymentAttempt.booking_id },
          data: { status: 'CONFIRMED' }
        });

        return { success: true, reason: 'SUCCESS' } satisfies WebhookResult;
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000
      }
    );

    return webhookResult;
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Payment service error: ${message}`);

    if (message === 'PAYMENT_NOT_FOUND') {
      throw Object.assign(new Error('Payment attempt not found'), { statusCode: 404 });
    }

    if (message === 'PAYMENT_ALREADY_PROCESSED') {
      throw Object.assign(new Error('Payment already processed'), { statusCode: 200 });
    }

    if (message === 'CLASS_NOT_FOUND') {
      throw Object.assign(new Error('Class not found'), { statusCode: 404 });
    }

    if (error?.code === 'P2034') {
      throw Object.assign(new Error('System is busy processing other transactions, please try again'), { statusCode: 503 });
    }

    throw Object.assign(new Error('Internal server error'), { statusCode: 500 });
  }
}
