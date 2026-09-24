import assert from 'node:assert/strict';
import test, { afterEach, mock } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';

const { createBookingRequest } = await import('../src/services/booking.service.js');
const { triggerPaymentRequest } = await import('../src/services/payment.service.js');
const { default: prisma } = await import('../src/config/prisma.js');

const replacedMethods: Array<{ target: any; methodName: string; original: any }> = [];

function replaceMethod(target: any, methodName: string, implementation: (...args: any[]) => any): void {
  replacedMethods.push({ target, methodName, original: target[methodName] });
  target[methodName] = implementation;
}

function mockBookingTransaction(maxCapacity: number | null, activeBookingCount: number): void {
  replaceMethod(prisma, '$transaction', async (callback: any) => callback({
    $queryRaw: async () => maxCapacity === null ? [] : [{ id: 12, max_capacity: maxCapacity }],
    booking: {
      count: async () => activeBookingCount,
      create: async ({ data }: any) => prisma.booking.create({ data })
    }
  }));
}

afterEach(() => {
  mock.restoreAll();
  for (const { target, methodName, original } of replacedMethods.splice(0)) {
    target[methodName] = original;
  }
});

test('creates a pending booking for an authorised parent', async () => {
  const booking = {
    id: 31,
    student_id: 7,
    trial_classes_id: 12,
    status: 'PENDING_PAYMENT'
  };

  replaceMethod(prisma.studentProfile, 'findUnique', async () => ({
    id: 7,
    parent_id: 3,
    user_id: 42
  }));
  replaceMethod(prisma.parentProfile, 'findUnique', async () => ({ id: 3 }));
  replaceMethod(prisma.trialClass, 'findUnique', async () => ({
    id: 12,
    start_time: new Date(Date.now() + 2 * 60 * 60 * 1000),
    max_capacity: 4,
    subject: { price: 75 }
  }));
  replaceMethod(prisma.booking, 'findUnique', async () => null);
  replaceMethod(prisma.systemSetting, 'findUnique', async ({ where }: any) => ({
    value: where.key === 'booking_lead_time_value' ? '1' : 'HOUR'
  }));
  mockBookingTransaction(4, 0);
  replaceMethod(prisma.booking, 'create', async ({ data }: any) => ({ ...booking, ...data }));

  const result = await createBookingRequest({
    studentId: 7,
    trialClassId: 12,
    currentUser: { userId: 42, roles: ['Parent'] }
  });

  assert.deepEqual(result.booking, booking);
});

test('rejects a booking when the class capacity is reached', async () => {
  replaceMethod(prisma.studentProfile, 'findUnique', async () => ({
    id: 7,
    parent_id: 3,
    user_id: 42
  }));
  replaceMethod(prisma.parentProfile, 'findUnique', async () => ({ id: 3 }));
  replaceMethod(prisma.trialClass, 'findUnique', async () => ({
    id: 12,
    start_time: new Date(Date.now() + 2 * 60 * 60 * 1000),
    max_capacity: 4,
    subject: { price: 75 }
  }));
  replaceMethod(prisma.booking, 'findUnique', async () => null);
  replaceMethod(prisma.systemSetting, 'findUnique', async ({ where }: any) => ({
    value: where.key === 'booking_lead_time_value' ? '1' : 'HOUR'
  }));
  mockBookingTransaction(4, 4);

  await assert.rejects(
    () => createBookingRequest({
      studentId: 7,
      trialClassId: 12,
      currentUser: { userId: 42, roles: ['Parent'] }
    }),
    (error: any) => {
      assert.equal(error.statusCode, 422);
      assert.equal(error.message, 'Class is already full');
      return true;
    }
  );
});

test('uses the system capacity when the class has no capacity', async () => {
  replaceMethod(prisma.studentProfile, 'findUnique', async () => ({
    id: 7,
    parent_id: 3,
    user_id: 42
  }));
  replaceMethod(prisma.parentProfile, 'findUnique', async () => ({ id: 3 }));
  replaceMethod(prisma.trialClass, 'findUnique', async () => ({
    id: 12,
    start_time: new Date(Date.now() + 2 * 60 * 60 * 1000),
    max_capacity: null,
    subject: { price: 75 }
  }));
  replaceMethod(prisma.booking, 'findUnique', async () => null);
  replaceMethod(prisma.systemSetting, 'findUnique', async ({ where }: any) => ({
    value: where.key === 'max_allowed_class_capacity'
      ? '4'
      : where.key === 'booking_lead_time_value'
        ? '1'
        : 'HOUR'
  }));
  mockBookingTransaction(4, 4);

  await assert.rejects(
    () => createBookingRequest({
      studentId: 7,
      trialClassId: 12,
      currentUser: { userId: 42, roles: ['Parent'] }
    }),
    (error: any) => {
      assert.equal(error.statusCode, 422);
      assert.equal(error.message, 'Class is already full');
      return true;
    }
  );
});

test('rejects a booking that already exists for the student and class', async () => {
  replaceMethod(prisma.studentProfile, 'findUnique', async () => ({
    id: 7,
    parent_id: 3,
    user_id: 42
  }));
  replaceMethod(prisma.parentProfile, 'findUnique', async () => ({ id: 3 }));
  replaceMethod(prisma.trialClass, 'findUnique', async () => ({
    id: 12,
    start_time: new Date(Date.now() + 2 * 60 * 60 * 1000),
    max_capacity: 4,
    subject: { price: 75 }
  }));
  replaceMethod(prisma.booking, 'findUnique', async () => ({
    id: 31,
    student_id: 7,
    trial_classes_id: 12,
    status: 'PENDING_PAYMENT'
  }));

  await assert.rejects(
    () => createBookingRequest({
      studentId: 7,
      trialClassId: 12,
      currentUser: { userId: 42, roles: ['Parent'] }
    }),
    (error: any) => {
      assert.equal(error.statusCode, 409);
      assert.equal(error.message, 'Booking already exists for this student and class');
      return true;
    }
  );
});

test('triggers payment for an authorised parent when capacity is available', async () => {
  const booking = {
    id: 31,
    student_id: 7,
    trial_classes_id: 12,
    status: 'PENDING_PAYMENT',
    student: { id: 7, parent_id: 3, user_id: 42 },
    trial_class: { subject: { price: 75 } },
    payments: []
  };
  const paymentAttempt = {
    id: 91,
    booking_id: 31,
    amount: 75,
    status: 'PENDING',
    transaction_reference: 'REF-ABC123'
  };
  const transaction = {
    paymentAttempt: {
      findFirst: mock.fn(async () => null),
      create: mock.fn(async ({ data }: any) => ({ ...paymentAttempt, ...data }))
    },
    $queryRaw: async () => [{ id: 12, current_booked: 1, max_capacity: 10 }]
  };

  replaceMethod(prisma.booking, 'findUnique', async () => booking);
  replaceMethod(prisma.parentProfile, 'findUnique', async () => ({ id: 3 }));
  replaceMethod(prisma, '$transaction', async (callback: any) => callback(transaction));

  const result = await triggerPaymentRequest(31, {
    userId: 42,
    roles: ['Parent']
  });

  assert.equal(result.booking, booking);
  assert.equal(result.paymentAttempt.booking_id, 31);
  assert.equal(result.paymentAttempt.amount, 75);
  assert.equal(result.paymentAttempt.status, 'PENDING');
  assert.match(result.paymentAttempt.transaction_reference, /^REF-[A-Z0-9]{12}$/);
  assert.equal(transaction.paymentAttempt.create.mock.calls.length, 1);
});

test('returns the existing pending payment attempt when payment is triggered again', async () => {
  const paymentAttempt = {
    id: 91,
    booking_id: 31,
    amount: 75,
    status: 'PENDING',
    transaction_reference: 'REF-ABC123'
  };
  const booking = {
    id: 31,
    student_id: 7,
    trial_classes_id: 12,
    status: 'PENDING_PAYMENT',
    student: { id: 7, parent_id: 3, user_id: 42 },
    trial_class: { subject: { price: 75 } },
    payments: [paymentAttempt]
  };
  const transaction = {
    paymentAttempt: {
      findFirst: mock.fn(async () => paymentAttempt),
      create: mock.fn()
    }
  };

  replaceMethod(prisma.booking, 'findUnique', async () => booking);
  replaceMethod(prisma.parentProfile, 'findUnique', async () => ({ id: 3 }));
  replaceMethod(prisma, '$transaction', async (callback: any) => callback(transaction));

  const result = await triggerPaymentRequest(31, {
    userId: 42,
    roles: ['Parent']
  });

  assert.equal(result.booking, booking);
  assert.equal(result.paymentAttempt, paymentAttempt);
  assert.equal(transaction.paymentAttempt.create.mock.calls.length, 0);
});