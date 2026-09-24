# 📋 Simple course Booking System (`simple-course-booking`)

A full-stack, monorepo-based trial class booking platform tailored specifically for **Parents/Guardians** to manage and register their **Students (Children)** for educational trial lessons. 

---

## 🚀 How to Run the Solution

The project is structured as a **Monorepo** split into two independent directory layers: a TypeScript Node.js backend and a React Vite frontend.

### Prerequisites
* **Node.js** (v18+ recommended)
* **pnpm** (preferred package manager)
* A running **PostgreSQL** instance

### 1. Environment Configurations
First, navigate to your root/backend and configure your environmental variables.
Create a `.env` file inside the `backend/` folder:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/booking_db?schema=public"
JWT_SECRET="your_secure_jwt_secret_key"
PORT=3000
```

Create a `.env` file inside the `frontend/` folder:
```env
VITE_API_BASE_URL="http://localhost:3000/api/v1"
```

### 2. Backend Setup
```bash
cd backend
pnpm install
# Sync database schema and run the seed script for the default admin/parent/student accounts
npx prisma db push
npx prisma db seed 
pnpm run dev
```

### 3. Frontend Setup
```bash
cd ../frontend
pnpm install
pnpm run dev
```

---

## 🛠️ What You Built
This application handles an end-to-end user workflow for reserving academic trial classes:
* **Multi-Role Authentication System:** Secure login page distributing access permissions between three separate system roles: `ADMIN`, `PARENT`, and `STUDENT`.
* **Dynamic Parent Dashboard:** Once logged in, a parent can securely view a unified interface listing all their registered children (students) alongside the specific list of trial subjects they have booked.
* **Student Dashboard:** A separate lightweight login interface restricted to showing individual students only their personal upcoming booked classes.
* **Parent-Only Booking Menu:** A step-by-step wizard where parents start by selecting an available date, which dynamically populates the time slots, followed by selectors for the trial class subject and the specific student before entering the checkout sequence.
* **Confirmation & Payment Flow:** Bridges the finalization steps from a generic Booking Confirmation layout onto a dedicated Manual Payment Confirmation page.
* **System Settings & Automation Engine:** The capacity logic operates as application business logic governed by configuration rows in the system_settings table. Additional configuration details include booking time limits, default template values, and the max_allowed_class_capacity parameter to prevent incorrect max_capacity entries.

---

## ⏱️ Time Spent

Total Time: **5 Hours**
* **1 Hour:** Database schema design, ERD mapping, and backend monolithic architecture planning.
* **3 Hours:** Core development (writing frontend layouts, Prisma models, and Express API middleware logic).
* **1 Hour:** End-to-end visual integration verification, debugging background process halts, and logging optimization.

---

## 💡 Assumptions Made

* **Guardian-First Hierarchy:** Since the target demographic centers heavily on parents or legal guardians managing their children's activities, we assume a predefined parent-student relationship mapping in the system. The booking capability is exclusively reserved for `PARENT` roles.
* **Automatic Scheduling Templates:** To keep operations scalable, we assumed admins shouldn't create classes individually. We designed a `trial_class_template` system capable of projecting and auto-generating standard recurring trial class sessions in bulk (e.g., executing a template once to populate an entire month's worth of slot assets).
* **Defensive Business Validation:** We assumed that physical classroom limitations or teacher limits require safeguarding. Therefore, configuration values like `default_class_capacity` and `max_allowed_class_capacity` are hardcoded at a system level to prevent human input or allocation errors during schedule setups.

---

## 🏗️ Key Architecture & Backend Decisions

* **Monorepo Architecture:** The project bundles independent frontend and backend domains under a single repository to maintain clear atomic commits and simplify the overall development workflow.
* **Strict MVC Separation of Concerns:** The backend enforces a tight folder convention (`config/`, `controllers/`, `middleware/`, `routes/`, `services/`, `utils/`) ensuring that raw HTTP routing never mixes with core business logic loops.
* **Database-Level Data Integrity:** Double-booking errors are prevented at the database tier using a unique constraint `@@unique([student_id, trial_classes_id])` on the bookings table. This ensures that a student cannot be registered for the exact same trial class twice, maintaining clean transactional data.
* **High-Speed Frontend Tooling:** Leveraged **Oxlint** within the frontend directory to provide ultra-fast, zero-configuration code quality scanning, keeping the local development loop quick and clean.


---

## ✂️ What You Deliberately Cut

Due to the strict 5-hour constraint, the following items were trimmed out of the MVP:
* **Admin Dashboard UI:** Created the database role, but omitted the frontend management screen for adding new subjects or setting up the `trial_class_templates`.
* **Automated Cron Jobs:** The system settings support time-limit barriers (e.g., unit/hours thresholds defining the latest someone can book) but the automation loop that checks this actively remains unverified.
* **Real Payment Gateway Integration:** Skipped live third-party integrations (Stripe, Midtrans, etc.). Instead, the application utilizes a webhook receiver endpoint that must be called manually via a simulation script to update booking states from *Pending* to *Success/Failed*.

---

## 📊 What You Would Monitor After Release

* **Concurrency Limits & Race Conditions:** Tracking transaction completion behavior when hundreds of parents simultaneously attempt to check out identical limited capacity class blocks.
* **Conversion vs. Dropout Rates:** Monitoring drop-off anomalies where a parent initiates a booking but abandons the transaction, or mapping out the frequency of automated booking cancellations.
* **Database Connection Pool Exhaustion:** Keeping an eye on how Prisma handles high-velocity lookup queries under continuous connection loads.
* **Full Production Logging Implementation:** Although the **Winston Logger** package was installed in the backend dependencies to plan for persistent error tracking files (`logs/error.log`), it was deliberately cut from full integration across all endpoints to prioritize completing the core booking flow within the 5-hour limit.


---

## 🔮 What You Would Do Next with More Time

1. **Robust Payment Life-Cycles:** Integrate a real gateway hook, introducing token expirations for unpaid slots. If a parent fails to settle an invoice within the designated timeout, the slot should automatically transition to an `EXPIRED` state and release the seat capacity back to the public pool.
2. **Transaction Grace Periods:** Currently, a failed payment terminates a booking immediately. In a production build, it should loop back gracefully to allow the parent to retry payment options without losing their chosen calendar date selection.
3. **Full Staff Control Center:** Build out the missing visual administrative modules so school staff can fine-tune global system settings and templates directly inside the app interface.
4. **Complete Backend Observability:** Fully implement the pre-installed **Winston Logger** across all controllers and error-handling middleware. This includes setting up automated log rotation and ensuring all database queries, validation rejections, and payment webhook payloads are tracked securely in structured local files.