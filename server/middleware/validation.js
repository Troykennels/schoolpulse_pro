const Joi = require('joi');

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const errors = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/"/g, ''),
      }));
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    req[property] = value;
    next();
  };
};

const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    phone: Joi.string().allow('', null),
    password: Joi.string().min(6).required(),
    first_name: Joi.string().min(2).max(50).required(),
    last_name: Joi.string().min(2).max(50).required(),
    role: Joi.string().valid('school_admin', 'teacher', 'parent', 'student', 'accountant', 'staff').required(),
    school_id: Joi.string().uuid(),
  }),

  login: Joi.object({
    email: Joi.string().trim().lowercase().email(),
    phone: Joi.string().trim(),
    password: Joi.string().required(),
  }).or('email', 'phone'),

  createSchool: Joi.object({
    name: Joi.string().min(3).max(200).required(),
    code: Joi.string().min(2).max(20).required(),
    address: Joi.string().max(500),
    city: Joi.string().max(100),
    state_province: Joi.string().max(100),
    country: Joi.string().max(100),
    postal_code: Joi.string().max(20),
    school_type: Joi.string().valid('nursery', 'primary', 'secondary', 'combined', 'k12', 'international'),
    curriculum: Joi.string().valid('nigerian', 'british', 'american', 'ib', 'cbse', 'french', 'custom'),
    phone: Joi.string(),
    email: Joi.string().email(),
    motto: Joi.string().max(200),
    timezone: Joi.string(),
    default_currency: Joi.string().max(3),
  }),

  createStudent: Joi.object({
    first_name: Joi.string().min(2).max(50).required(),
    last_name: Joi.string().min(2).max(50).required(),
    other_names: Joi.string().max(50).allow('', null),
    admission_no: Joi.string().required(),
    class_id: Joi.string().uuid().required(),
    parent_id: Joi.string().uuid().allow(null),
    parent: Joi.object({
      first_name: Joi.string().min(2).max(50).required(),
      last_name: Joi.string().min(2).max(50).required(),
      email: Joi.string().email().required(),
      phone: Joi.string().allow('', null),
      password: Joi.string().min(6).allow('', null),
      avatar_url: Joi.string().uri().allow('', null),
      address: Joi.string().allow('', null),
    }).allow(null),
    date_of_birth: Joi.date().allow(null),
    gender: Joi.string().valid('male', 'female', 'other').required(),
    blood_group: Joi.string().allow('', null),
    genotype: Joi.string().allow('', null),
    nationality: Joi.string().allow('', null),
    state_of_origin: Joi.string().allow('', null),
    lga_of_origin: Joi.string().allow('', null),
    religion: Joi.string().allow('', null),
    address: Joi.string().allow('', null),
    photo_url: Joi.string().uri().allow('', null),
    passport_no: Joi.string().allow('', null),
    primary_language: Joi.string().allow('', null),
    boarding_status: Joi.string().valid('day', 'boarding', 'half_boarding'),
    special_needs: Joi.string().allow('', null),
    allergies: Joi.string().allow('', null),
  }),

  createGrade: Joi.object({
    student_id: Joi.string().uuid().required(),
    subject_id: Joi.string().uuid().required(),
    term_id: Joi.string().uuid().required(),
    class_id: Joi.string().uuid(),
    ca1_score: Joi.number().min(0).max(100).default(0),
    ca2_score: Joi.number().min(0).max(100).default(0),
    ca3_score: Joi.number().min(0).max(100).default(0),
    exam_score: Joi.number().min(0).max(100).default(0),
    teacher_comment: Joi.string().allow('', null),
  }),

  bulkGrades: Joi.object({
    subject_id: Joi.string().uuid().required(),
    term_id: Joi.string().uuid().required(),
    class_id: Joi.string().uuid().required(),
    grades: Joi.array().items(
      Joi.object({
        student_id: Joi.string().uuid().required(),
        ca1_score: Joi.number().min(0).max(100).default(0),
        ca2_score: Joi.number().min(0).max(100).default(0),
        ca3_score: Joi.number().min(0).max(100).default(0),
        exam_score: Joi.number().min(0).max(100).default(0),
        teacher_comment: Joi.string().allow('', null),
      })
    ).min(1).required(),
  }),

  markAttendance: Joi.object({
    class_id: Joi.string().uuid().required(),
    term_id: Joi.string().uuid().required(),
    date: Joi.date().required(),
    records: Joi.array().items(
      Joi.object({
        student_id: Joi.string().uuid().required(),
        status: Joi.string().valid('present', 'absent', 'late', 'excused', 'sick').required(),
        note: Joi.string().allow('', null),
        arrival_time: Joi.string().allow('', null),
      })
    ).min(1).required(),
  }),

  recordPayment: Joi.object({
    student_id: Joi.string().uuid().required(),
    fee_structure_id: Joi.string().uuid().required(),
    amount: Joi.number().positive().required(),
    payment_method: Joi.string().valid('cash', 'bank_transfer', 'paystack', 'flutterwave', 'stripe', 'pos', 'mobile_money', 'check').required(),
    reference: Joi.string().allow('', null),
    notes: Joi.string().allow('', null),
    receipt_no: Joi.string().allow('', null),
  }),

  createAnnouncement: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    content: Joi.string().min(10).required(),
    target_audience: Joi.string().valid('all', 'parents', 'teachers', 'students', 'staff', 'class').default('all'),
    target_class_id: Joi.string().uuid().allow(null),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
    is_pinned: Joi.boolean().default(false),
    send_sms: Joi.boolean().default(false),
    send_email: Joi.boolean().default(false),
    attachment_url: Joi.string().allow('', null),
  }),
};

module.exports = { validate, schemas };
