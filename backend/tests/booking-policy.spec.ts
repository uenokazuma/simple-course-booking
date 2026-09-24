import test from 'node:test';
import assert from 'node:assert/strict';

import { canBookForStudent } from '../src/services/booking-policy.js';

test('parent can book for their own child', () => {
  assert.equal(
    canBookForStudent({ role: 'Parent', parentProfileId: 7, studentParentId: 7, userId: 99 }, 7),
    true
  );
});

test('student can only book for themselves', () => {
  assert.equal(
    canBookForStudent({ role: 'Student', userId: 42, studentUserId: 42 }, 42),
    true
  );

  assert.equal(
    canBookForStudent({ role: 'Student', userId: 42, studentUserId: 99 }, 99),
    false
  );
});
