-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('PENDING', 'SUCCESSFUL', 'FAILED');

-- AlterTable
ALTER TABLE "bookings"
    ALTER COLUMN "status" DROP DEFAULT,
    ALTER COLUMN "status" TYPE "BookingStatus" USING "status"::text::"BookingStatus",
    ALTER COLUMN "status" SET DEFAULT 'CONFIRMED';

-- AlterTable
ALTER TABLE "payment_attempts"
    ALTER COLUMN "status" TYPE "PaymentAttemptStatus" USING "status"::text::"PaymentAttemptStatus";
