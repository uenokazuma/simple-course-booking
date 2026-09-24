# Backend API for Trial Class Bookings

This backend exposes the secure booking and payment APIs required for a parent/student scheduling flow under the `/api/v1` prefix.

## Authentication

The login endpoint validates the account password using bcrypt hashing and returns a JWT containing the authenticated user and role metadata.

- Endpoint: `POST /api/v1/auth/login`
- Payload: `{ "email": "user@example.com", "password": "secret" }`
- Success: returns a signed JWT that includes the authenticated `user_id` and role metadata (`Parent` or `Student`).

The middleware in `verifyJWT` validates the bearer token, resolves the user from Prisma, and populates `req.user` before any protected route executes.

## Booking flow

The booking endpoint enforces ownership and authorization before a pending reservation is created.

- Endpoint: `POST /api/v1/bookings`
- Payload: `{ "student_id": 1, "trial_class_id": 101 }`
- Behavior:
  1. A parent must be linked to the student record through the parent tree.
  2. A student may only book for themselves.
  3. A `booking` row is created with `status = 'PENDING_PAYMENT'`.
  4. No payment attempt is created until the payment trigger confirms capacity.
  5. Capacity is not decremented until the payment webhook confirms the slot lock-in.
- A booking is rejected unless the class starts after the configured lead time from `system_settings`:
  - `booking_lead_time_value`: non-negative integer
  - `booking_lead_time_unit`: `HOUR`, `DAY`, or `WEEK`

## Critical concurrency protection for seats

The webhook path is the seat-grabbing safety barrier for the limited-capacity class.

- Endpoint: `POST /api/v1/payments/webhook`
- Payload: `{ "transaction_reference": "REF-XYZ123", "status": "SUCCESSFUL" }`
- Data integrity behavior:
  1. The payment attempt and trial class are fetched in a single Prisma transaction.
  2. The target `trial_classes` row is locked with `SELECT ... FOR UPDATE`.
  3. If `current_booked >= max_capacity`, the request enters the failsafe rejection path.
  4. That path updates the payment attempt to `FAILED`, sets the booking to `CANCELLED`, and returns `422` with the message: `Class full, payment rejected, initiate gateway refund`.
  5. If there is still available capacity, the code increments `current_booked` atomically, marks the payment attempt as `SUCCESSFUL`, marks the booking as `CONFIRMED`, and returns `200 OK`.

Before sending a payment request to the gateway, the authenticated parent or student can verify that the pending payment still has a seat:

- Endpoint: `POST /api/v1/payments/trigger`
- Payload: `{ "booking_id": 123 }`
- The endpoint checks `trial_classes.max_capacity`, falling back to `max_allowed_class_capacity` when the class capacity is unavailable.
- If the class is full, no payment attempt is created and the request returns `422`.
- If capacity remains, it creates a `PENDING` payment attempt and returns the booking and transaction reference. It does not mark the payment as successful; the webhook remains the final confirmation step.

This protects against race conditions where multiple payment callbacks compete for the final remaining seat in the same trial class.

### Local-only manual webhook test

For local testing, first call `POST /api/v1/payments/trigger` with an authenticated parent. Copy the `transaction_reference` from the response, then send:

```bash
curl -X POST http://localhost:5000/api/v1/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_reference": "REF-FROM-TRIGGER-RESPONSE",
    "status": "SUCCESSFUL"
  }'
```

This confirms the pending payment, confirms the booking, and increments the class capacity. A `FAILED` status marks the payment attempt as `FAILED` and cancels the booking. Other non-successful statuses return `200` without changing payment data. The webhook currently has no gateway signature verification, so use this manual request only against a local development server and do not expose it publicly.

## Database deadlock and retry handling

The implementation includes Prisma transaction controls and deadlock-handling errors for serialization conflicts, making the webhook path resilient under concurrent payments.

## Project notes

- Runtime: Express + TypeScript
- ORM: Prisma
- Validation: JWT verification + role-based middleware
- Payment flow: pending checkout before capacity lock-in
- Concurrency control: row locking + serializable transactions
