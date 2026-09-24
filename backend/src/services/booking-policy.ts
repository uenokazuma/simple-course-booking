export type BookingAuthorizationInput = {
  role: 'Parent' | 'Student';
  parentProfileId?: number | null;
  studentParentId?: number | null;
  userId?: number;
  studentUserId?: number;
};

export const canBookForStudent = (
  input: BookingAuthorizationInput,
  studentId: number
): boolean => {
  if (!Number.isFinite(studentId) || studentId <= 0) {
    return false;
  }

  if (input.role === 'Parent') {
    return !!input.parentProfileId && !!input.studentParentId && input.studentParentId === input.parentProfileId;
  }

  if (input.role === 'Student') {
    return !!input.userId && !!input.studentUserId && input.studentUserId === input.userId;
  }

  return false;
};
