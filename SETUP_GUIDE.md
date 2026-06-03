# SchoolPulse v2.1 — Complete Setup & Deployment Guide
### by Orion Soft Limited

---

## PART 1 — LOCAL DEVELOPMENT (Run on your computer first)

### Step 1 — Requirements
Make sure these are installed on your machine:
- **Node.js 18+** — download from nodejs.org
- **npm** — comes with Node.js
- **Git** — optional but recommended

Check your versions:
```
node -v     → should show v18.x or higher
npm -v      → should show 9.x or higher
```

---

### Step 2 — Open the Project
The project is at:
```
C:\Users\user\Desktop\schoolpulse_v2.1\sp2
```

Open a terminal/PowerShell in that folder.

---

### Step 3 — Install All Dependencies
```bash
# Install everything (client + server)
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
```

---

### Step 4 — Run Locally (SQLite — zero setup, no database needed)
```bash
npm run dev
```

This starts:
- **Frontend** at http://localhost:5173
- **Backend API** at http://localhost:5000

SQLite database is created automatically at `server/data/schoolpulse.sqlite3`.
**No Postgres, no Supabase — just open the browser and go.**

---

### Step 5 — First-Time Setup Wizard
1. Open http://localhost:5173
2. You will see **"Create Your School"** — fill in:
   - School name (e.g. Greenfield International School)
   - School code (e.g. GIS)
   - Country and Curriculum
3. Click **Continue** → fill in your admin account:
   - First name, Last name
   - Email (this becomes your login)
   - Password (minimum 8 characters)
4. Click **Create School & Login**
5. You are now inside the system as Super Admin

---

## PART 2 — DATABASE SETUP (Supabase — Free Forever)

> Skip this section if you want to keep using SQLite locally.
> You MUST do this before deploying to Vercel.

---

### Step 1 — Create a Free Supabase Account
1. Go to **https://supabase.com**
2. Click **Start your project** → Sign up with GitHub or email
3. Confirm your email

---

### Step 2 — Create a New Project
1. Click **New Project**
2. Fill in:
   - **Name:** schoolpulse (or any name)
   - **Database Password:** choose a strong password — SAVE THIS
   - **Region:** choose closest to your users (e.g. West US 2 for Africa/UK)
3. Click **Create new project**
4. Wait 1–2 minutes for it to provision

---

### Step 3 — Get Your Connection String
1. In your Supabase project, go to **Settings** (gear icon, left sidebar)
2. Click **Database**
3. Scroll down to **Connection pooling**
4. Make sure **Mode = Transaction**
5. Copy the **Connection string** — it looks like:
   ```
   postgresql://postgres.xxxxxxxxxxxx:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
6. Replace `[YOUR-PASSWORD]` with the password you set in Step 2

---

### Step 4 — Run Migrations (Creates All 42 Tables)
This is a ONE-TIME step that builds the entire database structure.

Open terminal in `C:\Users\user\Desktop\schoolpulse_v2.1\sp2\server`

**On Windows PowerShell:**
```powershell
$env:DATABASE_URL="postgresql://postgres.xxxxxxxxxxxx:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
npx knex migrate:latest
```

**On Mac/Linux:**
```bash
DATABASE_URL="postgresql://postgres.xxxxxxxxxxxx:..." npx knex migrate:latest
```

You should see output like:
```
Batch 1 run: 2 migrations
  001_initial_schema.js
  002_enhanced_modules.js
```

✅ All 42 tables are now created in Supabase.

---

### Step 5 — Verify Tables Were Created
1. Go back to Supabase dashboard
2. Click **Table Editor** in the left sidebar
3. You should see all 42 tables listed

---

## PART 3 — VERCEL DEPLOYMENT (Free)

### Step 1 — Create a Vercel Account
1. Go to **https://vercel.com**
2. Sign up with GitHub (recommended) or email

---

### Step 2 — Install Vercel CLI
```bash
npm install -g vercel
```

---

### Step 3 — Deploy
Open terminal in `C:\Users\user\Desktop\schoolpulse_v2.1\sp2`

```bash
vercel
```

Follow the prompts:
- **Set up and deploy?** → Y
- **Which scope?** → your account name
- **Link to existing project?** → N
- **Project name?** → schoolpulse (or any name)
- **In which directory is your code located?** → ./ (just press Enter)
- **Want to modify settings?** → N

---

### Step 4 — Set Environment Variables in Vercel
After the first deploy, go to your Vercel dashboard:

1. Open your project → **Settings** tab → **Environment Variables**
2. Add these 3 variables — click **Add** for each:

| Variable Name | Value |
|--------------|-------|
| `DATABASE_URL` | your Supabase Connection Pooler URI from Part 2 Step 3 |
| `JWT_SECRET` | any long random string (see generator below) |
| `NODE_ENV` | `production` |

**To generate a JWT_SECRET**, run this in terminal:
```
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copy the output and paste it as the `JWT_SECRET` value.

---

### Step 5 — Redeploy with Environment Variables
```bash
vercel --prod
```

Or click **Redeploy** in the Vercel dashboard.

---

### Step 6 — Open Your Live App
Vercel gives you a URL like:
```
https://schoolpulse-abc123.vercel.app
```

Open it → run the Setup Wizard (same as Part 1, Step 5) → you are live!

---

## PART 4 — ALL 42 DATABASE TABLES

### Migration 001 — Core System (28 tables)

| # | Table | Purpose |
|---|-------|---------|
| 1 | `schools` | School profile — name, curriculum, grading scale, address, logo, settings |
| 2 | `users` | ALL login accounts — admins, teachers, parents, students, accountants, staff |
| 3 | `academic_years` | e.g. "2025/2026" — used to group terms |
| 4 | `terms` | e.g. "First Term 2025/26" — all grading and fees are per term |
| 5 | `classes` | e.g. "JSS 1", "SS 2 Science" — classes with level, capacity, teacher |
| 6 | `subjects` | Subject catalogue — Mathematics, English, etc. with codes and categories |
| 7 | `class_subjects` | Links which teacher teaches which subject in which class |
| 8 | `students` | Student profiles — DOB, admission number, parent link, blood group, etc. |
| 9 | `grades` | Assessment scores — CA1, CA2, CA3, Exam, Total, Grade per student/subject/term |
| 10 | `attendance` | Daily attendance — present/absent/late/excused/sick per student per day |
| 11 | `fee_structures` | Fee lines per class/term — e.g. Tuition ₦150,000, Transport ₦20,000 |
| 12 | `payments` | Payment records — cash/bank transfer/POS/Paystack with reference |
| 13 | `announcements` | School-wide notices with audience targeting and priority |
| 14 | `timetable_slots` | Class schedule — subject, teacher, day, start/end time, room |
| 15 | `behavioural_traits` | Student soft skills — punctuality, neatness, etc. + teacher remarks |
| 16 | `events` | School calendar — holidays, exams, sports, cultural events |
| 17 | `discipline_records` | Student misconduct — severity, action taken, parent notification |
| 18 | `student_notifications` | In-app alerts for students/parents |
| 19 | `chat_threads` | Staff chat conversation groups |
| 20 | `chat_participants` | Who is in each chat thread |
| 21 | `chat_messages` | Individual messages in threads |
| 22 | `quiz_banks` | Quiz/test collections (WAEC, NECO, IGCSE, school quizzes) |
| 23 | `quiz_questions` | MCQ questions with options, correct answer, explanation |
| 24 | `quiz_attempts` | Student quiz scores and answers |
| 25 | `activity_logs` | Audit trail of all system actions |
| 26 | `library_books` | Book catalogue — title, author, ISBN, copies, shelf location |
| 27 | `book_loans` | Borrow/return records with due dates |
| 28 | `ptm_slots` | Parent-Teacher Meeting scheduling |

---

### Migration 002 — Enhanced Modules (14 tables)

| # | Table | Purpose |
|---|-------|---------|
| 29 | `staff_payroll` | Salary structure per staff — basic, allowances, deductions, net |
| 30 | `salary_payments` | Monthly salary payment records with approval status |
| 31 | `staff_leaves` | Leave requests — annual, sick, maternity, etc. with approval |
| 32 | `hostels` | Hostel buildings — boys, girls, mixed with warden assignment |
| 33 | `hostel_rooms` | Individual rooms — capacity, type, fee, occupancy status |
| 34 | `hostel_allocations` | Student room assignments per term with check-in/out dates |
| 35 | `transport_routes` | Bus routes — driver, vehicle, stops, departure/return times |
| 36 | `transport_subscriptions` | Student subscriptions — one-way or two-way per route |
| 37 | `medical_records` | Sick bay visits — diagnosis, treatment, medication, parent notification |
| 38 | `inventory_items` | School assets and stock — quantity, condition, supplier, cost |
| 39 | `promotion_history` | Student class promotions, repeats, and graduations |
| 40 | `parent_feedback` | Parent complaints, feedback and suggestions with admin responses |
| 41 | `login_attempts` | Security — tracks failed logins for account lockout |
| 42 | `active_sessions` | Security — JWT session tracking per device |

---

## PART 5 — USER ROLES & WHAT THEY CAN ACCESS

| Role | Login As | Can Access |
|------|----------|-----------|
| `super_admin` | System owner | Everything — all schools, all settings |
| `school_admin` | School principal/registrar | Everything in their school |
| `teacher` | Class/subject teacher | Students, Grades, Attendance, Timetable, Discipline, Reports, Chat, Learning |
| `accountant` | Bursar/finance officer | Fees, Payments, Payroll, Inventory, Staff list |
| `staff` | Support staff | Hostel, Transport, Medical, Inventory, Library, Events, Chat |
| `parent` | Guardian | Their child's: Grades, Attendance, Timetable, Announcements, Fees, Report card |
| `student` | Pupil | Their own timetable, announcements, learning hub, quiz attempts |

---

## PART 6 — HOW TO ADD YOUR FIRST DATA

After the Setup Wizard creates your school, follow this order:

### 1. Add Academic Year & Term
- Go to **Academics** → **Terms & Years** tab
- Add your academic year (e.g. 2025/2026)
- Add terms (e.g. First Term, Second Term, Third Term)
- Tick **"Set as current term"** on your active term

### 2. Add Classes
- Go to **Academics** → **Classes** tab
- Add your classes (e.g. JSS 1, JSS 2, SS 1 Science, SS 1 Arts)
- Set the level for each class

### 3. Add Subjects
- Go to **Academics** → **Subjects** tab
- Add your subjects (e.g. Mathematics — MATH, English — ENG)

### 4. Add Staff (Teachers & Others)
- Go to **Settings** → **Add User**
- Add each teacher with role = "Teacher"
- Add accountants, support staff etc.

### 5. Assign Teachers to Classes
- Go to **Academics** → **Teaching Profile** tab
- Select each teacher → assign them to classes and subjects

### 6. Add Students
- Go to **Students** → **Add Student**
- Fill in the student details and class
- Create their parent login at the same time

### 7. Set Up Fees
- Go to **Fees & Payments** → **Fee Structures** tab
- Select class + term
- Add fee lines (e.g. Tuition ₦150,000, Development Levy ₦20,000)

### 8. You are ready!
- Attendance can now be marked daily
- Grades can be entered per subject per term
- Parents can log in and see their child's progress
- Reports can be printed from the Report Cards page

---

## PART 7 — COMMON ISSUES & FIXES

### "Cannot connect to database"
- Make sure `DATABASE_URL` is set correctly in Vercel
- Check that migrations have been run (`npx knex migrate:latest`)

### "API route not found" on Vercel
- Make sure you ran `vercel --prod` AFTER setting environment variables
- Check Vercel dashboard → Deployments → latest deployment has the env vars

### "SQLite error" locally
- Delete `server/data/schoolpulse.sqlite3` and restart — migrations will re-run
- Or run: `cd server && npx knex migrate:latest`

### Forgot admin password
- In Supabase Table Editor → find the `users` table
- Find your user row → run SQL to reset:
  ```sql
  UPDATE users SET password_hash = '$2b$12$...' WHERE email = 'your@email.com';
  ```
- Or add a new admin via the `/api/auth/setup` endpoint (only works when 0 users exist)

### CORS error in browser
- Add your Vercel domain to `CLIENT_URL` environment variable in Vercel
- Redeploy after adding the variable

---

## PART 8 — ENVIRONMENT VARIABLES REFERENCE

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes (production) | Full PostgreSQL connection string from Supabase |
| `JWT_SECRET` | Yes (production) | Random 64-char string for signing auth tokens |
| `NODE_ENV` | Yes (production) | Set to `production` |
| `CLIENT_URL` | Optional | Your Vercel URL for CORS (auto-detected for *.vercel.app) |
| `PORT` | Optional | Server port (default 5000, Vercel ignores this) |

---

## PART 9 — QUICK COMMAND REFERENCE

```bash
# Start local development
npm run dev

# Build frontend only
npm run build

# Run database migrations
cd server && npx knex migrate:latest

# Roll back last migration
cd server && npx knex migrate:rollback

# Deploy to Vercel (production)
vercel --prod

# Install all dependencies from scratch
npm install && cd client && npm install && cd ../server && npm install && cd ..
```

---

*SchoolPulse v2.1 — by Orion Soft Limited*
*Built with React + Express + PostgreSQL*
