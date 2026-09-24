import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';

const { getStudentBookingsForUser } = await import('../src/services/student.service.js');
const { default: prisma } = await import('../src/config/prisma.js');

const originalFindUnique = prisma.studentProfile.findUnique;
const originalFindMany = prisma.booking.findMany;

afterEach(() => {
  prisma.studentProfile.findUnique = originalFindUnique;
  prisma.booking.findMany = originalFindMany;
});

test('student can view bookings using their student profile id', async () => {
  (prisma.studentProfile as any).findUnique = async () => ({ id: 1, user_id: 3 });
  (prisma.booking as any).findMany = async ({ where }: any) => {
    assert.equal(where.student_id, 1);
    return [];
  };

  await getStudentBookingsForUser(3, ['Student'], 1);
});

test('student can view bookings using their user id', async () => {
  (prisma.studentProfile as any).findUnique = async () => ({ id: 1, user_id: 3 });
  (prisma.booking as any).findMany = async ({ where }: any) => {
    assert.equal(where.student_id, 1);
    return [];
  };

  await getStudentBookingsForUser(3, ['Student'], 3);
});

test('student cannot view another student bookings', async () => {
  (prisma.studentProfile as any).findUnique = async () => ({ id: 1, user_id: 3 });

  await assert.rejects(
    () => getStudentBookingsForUser(3, ['Student'], 2),
    (error: any) => {
      assert.equal(error.statusCode, 403);
      assert.equal(error.message, 'Forbidden: You can only view your own bookings');
      return true;
    }
  );
});