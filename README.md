# SchoolPulse v2.1 — School Management System
### by Orion Soft Limited

## What's New in v2.1

### Enhanced Security
- Login rate limiting (10 attempts per minute)
- Account lockout after 5 failed attempts (15-minute cooldown)
- Session tracking with device info
- Login attempt audit log
- No public registration — admin-only user creation
- First-time setup wizard (creates school + super admin)

### New Modules
- **Staff Payroll & HR** — salary structures, monthly payments, leave management
- **Hostel Management** — hostels, rooms, bed allocations, occupancy tracking
- **Transport Management** — routes, vehicles, drivers, student subscriptions
- **Medical Records** — sick bay visits, diagnoses, treatments, parent notifications
- **Inventory & Assets** — stock tracking, low-stock alerts, asset management
- **Promotion History** — class-to-class promotion/repeat records
- **Parent Feedback** — complaints, suggestions, admin response tracking

### Existing Modules (Enhanced)
- Dashboard, Students, Academics (grades, subjects, classes)
- Attendance, Fees & Payments, Announcements
- Timetable, Events Calendar, Discipline Records
- Library, Staff Chat, Learning Hub (Quiz Bank)
- Report Cards, Settings, Notifications

### Roles (7)
`super_admin` | `school_admin` | `teacher` | `parent` | `student` | `accountant` | `staff`

## Tech Stack
- **Backend:** Node.js, Express, Knex.js, PostgreSQL
- **Frontend:** React 18, Vite, React Router, Recharts, Lucide Icons
- **Auth:** JWT with bcrypt, rate limiting, session management
- **Deployment:** Railway, Render, or any Node.js host

## Setup

### 1. Install Dependencies
```bash
npm install
cd client && npm install && cd ..
```

### 2. Set Environment Variables
Create `server/.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=schoolpulse
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your-long-random-secret-here
```

### 3. Run Migrations
```bash
cd server
npx knex migrate:latest
```

### 4. Start Development
```bash
npm run dev
```

### 5. First-Time Setup
Open `http://localhost:5173` — the system detects no users exist and shows the setup wizard. Create your school and admin account.

## Deployment (Railway)
1. Push to GitHub
2. Connect repo to Railway
3. Add PostgreSQL addon
4. Set environment variables (DATABASE_URL is auto-set, add JWT_SECRET)
5. Deploy — Railway runs migrations automatically

## No Demo Data
This system ships clean — no sample schools, students, or users. Everything is entered by the administrator through the UI. The first-time setup wizard guides you through creating the initial school and admin account.

---
Built by Orion Soft Limited | orionsoftlimited.com
