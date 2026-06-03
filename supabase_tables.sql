-- ============================================================
--  SchoolPulse v2.1 — Complete Database Schema
--  Paste this entire file into Supabase SQL Editor and click Run
--  Creates all 42 tables + indexes
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. Schools ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(255) UNIQUE NOT NULL,
  address VARCHAR(255),
  city VARCHAR(255),
  state_province VARCHAR(255),
  country VARCHAR(255) DEFAULT 'Nigeria',
  postal_code VARCHAR(255),
  region VARCHAR(255),
  school_type VARCHAR(50) DEFAULT 'international' CHECK (school_type IN ('nursery','primary','secondary','combined','k12','international')),
  curriculum VARCHAR(50) DEFAULT 'british' CHECK (curriculum IN ('nigerian','british','american','ib','cbse','french','custom')),
  logo_url VARCHAR(255),
  phone VARCHAR(255),
  email VARCHAR(255),
  website VARCHAR(255),
  motto VARCHAR(255),
  timezone VARCHAR(255) DEFAULT 'Africa/Lagos',
  default_currency VARCHAR(255) DEFAULT 'USD',
  locale VARCHAR(255) DEFAULT 'en',
  settings JSONB DEFAULT '{}',
  grading_scale JSONB DEFAULT '{"A":{"min":70,"max":100,"remark":"Excellent","gpa":4.0},"B":{"min":60,"max":69,"remark":"Very Good","gpa":3.0},"C":{"min":50,"max":59,"remark":"Good","gpa":2.0},"D":{"min":45,"max":49,"remark":"Fair","gpa":1.0},"E":{"min":40,"max":44,"remark":"Poor","gpa":0.5},"F":{"min":0,"max":39,"remark":"Fail","gpa":0.0}}',
  academic_structure JSONB DEFAULT '{"type":"term","periods_per_year":3,"assessment_weights":{"ca1":10,"ca2":10,"ca3":10,"exam":70}}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Users ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin','school_admin','teacher','parent','student','accountant','staff')),
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(255),
  gender VARCHAR(255),
  date_of_birth DATE,
  address TEXT,
  nationality VARCHAR(255),
  state_of_origin VARCHAR(255),
  qualification VARCHAR(255),
  employee_id VARCHAR(255),
  preferred_language VARCHAR(255) DEFAULT 'en',
  permissions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMPTZ,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Academic Years ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. Terms ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  term_number INTEGER NOT NULL,
  start_date DATE,
  end_date DATE,
  mid_term_break_start DATE,
  mid_term_break_end DATE,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. Classes ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  section VARCHAR(255),
  class_teacher_id UUID REFERENCES users(id),
  academic_year_id UUID REFERENCES academic_years(id),
  capacity INTEGER DEFAULT 40,
  level VARCHAR(50) NOT NULL CHECK (level IN ('nursery','primary','junior_secondary','senior_secondary','as_level','a_level','ib_myp','ib_dp','grade_k','grade_1_5','grade_6_8','grade_9_12')),
  order_index INTEGER DEFAULT 0,
  room_number VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. Subjects ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(255),
  is_elective BOOLEAN DEFAULT FALSE,
  credit_units INTEGER DEFAULT 1,
  category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('science','arts','commercial','vocational','general','languages','mathematics','humanities','technology','physical_education','creative_arts','core')),
  department VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. Class-Subject Mapping ─────────────────────────────────
CREATE TABLE IF NOT EXISTS class_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id),
  UNIQUE(class_id, subject_id)
);

-- ── 8. Students ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id),
  parent_id UUID REFERENCES users(id),
  admission_no VARCHAR(255) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  other_names VARCHAR(255),
  date_of_birth DATE,
  gender VARCHAR(10) NOT NULL CHECK (gender IN ('male','female','other')),
  blood_group VARCHAR(10),
  genotype VARCHAR(10),
  nationality VARCHAR(255) DEFAULT 'Nigerian',
  state_of_origin VARCHAR(255),
  lga_of_origin VARCHAR(255),
  religion VARCHAR(255),
  address TEXT,
  photo_url VARCHAR(255),
  passport_no VARCHAR(255),
  visa_status VARCHAR(255),
  primary_language VARCHAR(255),
  secondary_language VARCHAR(255),
  medical_info JSONB DEFAULT '{}',
  emergency_contact JSONB DEFAULT '{}',
  previous_school JSONB DEFAULT '{}',
  admission_date DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','graduated','withdrawn','suspended','expelled','transferred')),
  boarding_status VARCHAR(20) DEFAULT 'day' CHECK (boarding_status IN ('day','boarding','half_boarding')),
  special_needs TEXT,
  allergies TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, admission_no)
);

-- ── 9. Grades ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id),
  teacher_id UUID REFERENCES users(id),
  ca1_score DECIMAL(5,2) DEFAULT 0,
  ca2_score DECIMAL(5,2) DEFAULT 0,
  ca3_score DECIMAL(5,2) DEFAULT 0,
  exam_score DECIMAL(5,2) DEFAULT 0,
  total DECIMAL(5,2) DEFAULT 0,
  gpa_points DECIMAL(3,1) DEFAULT 0,
  grade_letter VARCHAR(10),
  remark VARCHAR(255),
  position_in_subject INTEGER,
  teacher_comment TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id, term_id)
);

-- ── 10. Attendance ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  term_id UUID REFERENCES terms(id),
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present','absent','late','excused','sick')),
  marked_by UUID REFERENCES users(id),
  note TEXT,
  arrival_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);

-- ── 11. Fee Structures ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  term_id UUID REFERENCES terms(id),
  class_id UUID REFERENCES classes(id),
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  fee_type VARCHAR(50) DEFAULT 'other',
  is_mandatory BOOLEAN DEFAULT TRUE,
  description TEXT,
  due_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 12. Payments ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  fee_structure_id UUID REFERENCES fee_structures(id),
  school_id UUID REFERENCES schools(id),
  term_id UUID REFERENCES terms(id),
  amount_paid DECIMAL(14,2) NOT NULL,
  balance DECIMAL(14,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  reference VARCHAR(255) UNIQUE,
  payment_method VARCHAR(30) DEFAULT 'cash' CHECK (payment_method IN ('cash','bank_transfer','paystack','flutterwave','stripe','pos','mobile_money','check','cheque')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','success','failed','refunded')),
  recorded_by UUID REFERENCES users(id),
  notes TEXT,
  receipt_no VARCHAR(255),
  gateway_response JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 13. Announcements ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  target_audience VARCHAR(20) DEFAULT 'all' CHECK (target_audience IN ('all','parents','teachers','students','staff','class')),
  target_class_id UUID REFERENCES classes(id),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  is_pinned BOOLEAN DEFAULT FALSE,
  send_sms BOOLEAN DEFAULT FALSE,
  send_email BOOLEAN DEFAULT FALSE,
  attachment_url VARCHAR(255),
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 14. Timetable Slots ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS timetable_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id),
  teacher_id UUID REFERENCES users(id),
  day_of_week VARCHAR(10) NOT NULL CHECK (day_of_week IN ('monday','tuesday','wednesday','thursday','friday','saturday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 15. Behavioural Traits ───────────────────────────────────
CREATE TABLE IF NOT EXISTS behavioural_traits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
  rated_by UUID REFERENCES users(id),
  punctuality INTEGER DEFAULT 0,
  attentiveness INTEGER DEFAULT 0,
  neatness INTEGER DEFAULT 0,
  politeness INTEGER DEFAULT 0,
  honesty INTEGER DEFAULT 0,
  self_control INTEGER DEFAULT 0,
  relationship_with_others INTEGER DEFAULT 0,
  handwriting INTEGER DEFAULT 0,
  verbal_fluency INTEGER DEFAULT 0,
  sports INTEGER DEFAULT 0,
  creativity INTEGER DEFAULT 0,
  musical_skills INTEGER DEFAULT 0,
  leadership INTEGER DEFAULT 0,
  teamwork INTEGER DEFAULT 0,
  critical_thinking INTEGER DEFAULT 0,
  class_teacher_remark TEXT,
  head_teacher_remark TEXT,
  counselor_remark TEXT,
  next_term_begins DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, term_id)
);

-- ── 16. Events ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(30) DEFAULT 'other' CHECK (event_type IN ('academic','sports','cultural','holiday','exam','meeting','excursion','competition','assembly','other')),
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  location VARCHAR(255),
  visibility VARCHAR(20) DEFAULT 'all' CHECK (visibility IN ('all','staff','parents','students')),
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule VARCHAR(255),
  color VARCHAR(20) DEFAULT '#22A97A',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 17. Discipline Records ───────────────────────────────────
CREATE TABLE IF NOT EXISTS discipline_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES users(id),
  resolved_by UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(20) DEFAULT 'minor' CHECK (category IN ('minor','moderate','major','critical')),
  infraction_type VARCHAR(30) DEFAULT 'other',
  action_taken TEXT,
  status VARCHAR(20) DEFAULT 'reported' CHECK (status IN ('reported','investigating','resolved','appealed','dismissed')),
  incident_date DATE,
  demerit_points INTEGER DEFAULT 0,
  parent_notified BOOLEAN DEFAULT FALSE,
  parent_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 18. Student Notifications ────────────────────────────────
CREATE TABLE IF NOT EXISTS student_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  category VARCHAR(20) DEFAULT 'general' CHECK (category IN ('academic','attendance','fees','behaviour','health','general')),
  priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('normal','high','urgent')),
  visible_to_parent BOOLEAN DEFAULT TRUE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 19. Chat ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(20) DEFAULT 'staff' CHECK (type IN ('staff','class','direct','parent_teacher')),
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_participants (
  thread_id UUID REFERENCES chat_threads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES chat_threads(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  attachment_url VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 20. Quiz / Learning Hub ──────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  level VARCHAR(20) NOT NULL CHECK (level IN ('junior','senior','primary','all')),
  class_level VARCHAR(255),
  exam_type VARCHAR(30) DEFAULT 'school' CHECK (exam_type IN ('waec','neco','igcse','sat','ib','school','checkpoint','common_entrance')),
  time_limit_minutes INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID REFERENCES quiz_banks(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  answer_index INTEGER NOT NULL,
  explanation TEXT,
  difficulty VARCHAR(20) DEFAULT 'standard' CHECK (difficulty IN ('foundation','standard','challenge')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  bank_id UUID REFERENCES quiz_banks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  score DECIMAL(5,2) DEFAULT 0,
  total INTEGER DEFAULT 0,
  time_taken_seconds INTEGER DEFAULT 0,
  answers JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 21. Activity Logs ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(255),
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 22. Library ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS library_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255),
  isbn VARCHAR(255),
  category VARCHAR(255),
  publisher VARCHAR(255),
  year_published INTEGER,
  total_copies INTEGER DEFAULT 1,
  available_copies INTEGER DEFAULT 1,
  shelf_location VARCHAR(255),
  cover_image_url VARCHAR(255),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS book_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES library_books(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id),
  user_id UUID REFERENCES users(id),
  school_id UUID REFERENCES schools(id),
  borrow_date DATE NOT NULL,
  due_date DATE NOT NULL,
  return_date DATE,
  status VARCHAR(20) DEFAULT 'borrowed' CHECK (status IN ('borrowed','returned','overdue','lost')),
  issued_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 23. Parent-Teacher Meeting ───────────────────────────────
CREATE TABLE IF NOT EXISTS ptm_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES users(id),
  student_id UUID REFERENCES students(id),
  meeting_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available','booked','completed','cancelled')),
  notes TEXT,
  teacher_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
--  MIGRATION 002 — Enhanced Modules
-- ═══════════════════════════════════════════════════════════

-- ── 29. Staff Payroll ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  bank_name VARCHAR(255),
  account_number VARCHAR(255),
  account_name VARCHAR(255),
  basic_salary DECIMAL(14,2) DEFAULT 0,
  housing_allowance DECIMAL(14,2) DEFAULT 0,
  transport_allowance DECIMAL(14,2) DEFAULT 0,
  meal_allowance DECIMAL(14,2) DEFAULT 0,
  other_allowances DECIMAL(14,2) DEFAULT 0,
  tax_deduction DECIMAL(14,2) DEFAULT 0,
  pension_deduction DECIMAL(14,2) DEFAULT 0,
  other_deductions DECIMAL(14,2) DEFAULT 0,
  net_salary DECIMAL(14,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'NGN',
  pay_grade VARCHAR(255),
  employment_date DATE,
  employment_type VARCHAR(20) DEFAULT 'full_time' CHECK (employment_type IN ('full_time','part_time','contract','volunteer')),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 30. Salary Payments ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS salary_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  payroll_id UUID REFERENCES staff_payroll(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL,
  gross_amount DECIMAL(14,2) NOT NULL,
  deductions DECIMAL(14,2) DEFAULT 0,
  net_amount DECIMAL(14,2) NOT NULL,
  bonus DECIMAL(14,2) DEFAULT 0,
  status VARCHAR(10) DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
  payment_method VARCHAR(20) DEFAULT 'bank_transfer' CHECK (payment_method IN ('bank_transfer','cash','check','mobile_money')),
  reference VARCHAR(255),
  approved_by UUID REFERENCES users(id),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payroll_id, month)
);

-- ── 31. Staff Leaves ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('annual','sick','maternity','paternity','compassionate','unpaid','study','other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,
  reason TEXT,
  status VARCHAR(10) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  approved_by UUID REFERENCES users(id),
  admin_remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 32. Hostels ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hostels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('boys','girls','mixed')),
  warden_name VARCHAR(255),
  warden_id UUID REFERENCES users(id),
  total_rooms INTEGER DEFAULT 0,
  total_beds INTEGER DEFAULT 0,
  address TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 33. Hostel Rooms ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hostel_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id UUID REFERENCES hostels(id) ON DELETE CASCADE,
  room_number VARCHAR(255) NOT NULL,
  room_type VARCHAR(20) DEFAULT 'dormitory' CHECK (room_type IN ('single','double','dormitory','suite')),
  capacity INTEGER DEFAULT 4,
  occupied INTEGER DEFAULT 0,
  fee_per_term DECIMAL(14,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available','full','maintenance','reserved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 34. Hostel Allocations ───────────────────────────────────
CREATE TABLE IF NOT EXISTS hostel_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  room_id UUID REFERENCES hostel_rooms(id) ON DELETE CASCADE,
  term_id UUID REFERENCES terms(id),
  bed_number VARCHAR(255),
  check_in_date DATE,
  check_out_date DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','checked_out','transferred','expelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 35. Transport Routes ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS transport_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  route_name VARCHAR(255) NOT NULL,
  vehicle_number VARCHAR(255),
  vehicle_type VARCHAR(255),
  driver_name VARCHAR(255),
  driver_phone VARCHAR(255),
  assistant_name VARCHAR(255),
  assistant_phone VARCHAR(255),
  capacity INTEGER DEFAULT 40,
  fee_per_term DECIMAL(14,2) DEFAULT 0,
  pickup_points TEXT,
  departure_time TIME,
  return_time TIME,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 36. Transport Subscriptions ──────────────────────────────
CREATE TABLE IF NOT EXISTS transport_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  route_id UUID REFERENCES transport_routes(id) ON DELETE CASCADE,
  term_id UUID REFERENCES terms(id),
  pickup_point VARCHAR(255),
  type VARCHAR(20) DEFAULT 'two_way' CHECK (type IN ('one_way_morning','one_way_afternoon','two_way')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','suspended','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 37. Medical Records ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  visit_type VARCHAR(20) DEFAULT 'sick_bay' CHECK (visit_type IN ('routine','emergency','sick_bay','referral','immunization')),
  complaint TEXT,
  diagnosis TEXT,
  treatment TEXT,
  medication_given TEXT,
  temperature VARCHAR(255),
  blood_pressure VARCHAR(255),
  weight VARCHAR(255),
  parent_notified BOOLEAN DEFAULT FALSE,
  sent_home BOOLEAN DEFAULT FALSE,
  attended_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 38. Inventory ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(20) DEFAULT 'other' CHECK (category IN ('furniture','electronics','stationery','sports','laboratory','kitchen','cleaning','vehicle','other')),
  location VARCHAR(255),
  quantity INTEGER DEFAULT 0,
  minimum_stock INTEGER DEFAULT 0,
  unit_cost DECIMAL(14,2) DEFAULT 0,
  supplier VARCHAR(255),
  condition VARCHAR(255),
  purchase_date DATE,
  warranty_expiry DATE,
  serial_number VARCHAR(255),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 39. Promotion History ────────────────────────────────────
CREATE TABLE IF NOT EXISTS promotion_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  from_class_id UUID REFERENCES classes(id),
  to_class_id UUID REFERENCES classes(id),
  academic_year_id UUID REFERENCES academic_years(id),
  decision VARCHAR(20) NOT NULL CHECK (decision IN ('promoted','repeated','graduated','withdrawn','transferred')),
  average_score DECIMAL(5,2),
  remarks TEXT,
  decided_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 40. Parent Feedback ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS parent_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id),
  type VARCHAR(20) DEFAULT 'feedback' CHECK (type IN ('feedback','complaint','suggestion','appreciation')),
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  admin_response TEXT,
  responded_by UUID REFERENCES users(id),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 41. Login Attempts ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255),
  ip_address VARCHAR(255),
  success BOOLEAN DEFAULT FALSE,
  user_agent VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 42. Active Sessions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  ip_address VARCHAR(255),
  user_agent VARCHAR(255),
  device_name VARCHAR(255),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
--  Performance Indexes
-- ═══════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_grades_school ON grades(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_school ON attendance(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_term ON grades(term_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_users_school ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_announcements_school ON announcements(school_id);
CREATE INDEX IF NOT EXISTS idx_events_school ON events(school_id);
CREATE INDEX IF NOT EXISTS idx_discipline_student ON discipline_records(student_id);
CREATE INDEX IF NOT EXISTS idx_library_books_school ON library_books(school_id);
CREATE INDEX IF NOT EXISTS idx_payroll_user ON staff_payroll(user_id);
CREATE INDEX IF NOT EXISTS idx_salary_month ON salary_payments(month);
CREATE INDEX IF NOT EXISTS idx_hostel_alloc_student ON hostel_allocations(student_id);
CREATE INDEX IF NOT EXISTS idx_transport_sub_student ON transport_subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_medical_student ON medical_records(student_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_promotion_student ON promotion_history(student_id);

-- ═══════════════════════════════════════════════════════════
--  Done! All 42 tables created.
-- ═══════════════════════════════════════════════════════════
SELECT 'SchoolPulse tables created successfully!' AS status,
       COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name NOT LIKE 'knex_%';
