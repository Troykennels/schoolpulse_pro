const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize, schoolScope } = require('../middleware/auth');
const { success, error } = require('../utils/response');

router.use(authenticate, schoolScope);

const subjectTemplates = {
  mathematics: [
    { stem: 'Simplify the expression: {a} + {b} x {c}.', answer: ({ a, b, c }) => a + b * c, explanation: 'Apply multiplication before addition.' },
    { stem: 'Find x if {a}x = {b}.', answer: ({ a, b }) => b / a, explanation: 'Divide both sides by the coefficient of x.' },
    { stem: 'What is {p}% of {n}?', answer: ({ p, n }) => (p / 100) * n, explanation: 'Convert the percentage to a fraction of the number.' },
  ],
  english: [
    { question: 'Choose the correct synonym for "diligent".', options: ['Hardworking', 'Careless', 'Late', 'Noisy'], answer_index: 0, explanation: 'Diligent means careful and hardworking.' },
    { question: 'Identify the adverb: The learner answered quickly.', options: ['learner', 'answered', 'quickly', 'the'], answer_index: 2, explanation: 'Quickly modifies the verb answered.' },
    { question: 'Choose the correctly punctuated sentence.', options: ['Where are you going?', 'Where are you going.', 'Where are you going!', 'Where are you going,'], answer_index: 0, explanation: 'A direct question ends with a question mark.' },
  ],
  science: [
    { question: 'Which organelle is called the powerhouse of the cell?', options: ['Nucleus', 'Mitochondrion', 'Ribosome', 'Vacuole'], answer_index: 1, explanation: 'Mitochondria release energy during respiration.' },
    { question: 'What do plants need for photosynthesis?', options: ['Sunlight, water, and carbon dioxide', 'Sand only', 'Oxygen only', 'Sugar only'], answer_index: 0, explanation: 'Photosynthesis uses light energy, water, and carbon dioxide.' },
    { question: 'A force can change an object by changing its', options: ['shape or motion', 'name', 'colour only', 'age'], answer_index: 0, explanation: 'Forces can change speed, direction, or shape.' },
  ],
  default: [
    { question: 'Which study habit is most effective before a quiz?', options: ['Reviewing notes and practising questions', 'Guessing everything', 'Skipping sleep', 'Reading only the title'], answer_index: 0, explanation: 'Active revision and practice improve recall.' },
    { question: 'What should you do when you do not understand a topic?', options: ['Ask for help and review examples', 'Ignore it', 'Copy answers', 'Stop studying'], answer_index: 0, explanation: 'Good learners ask questions and practise examples.' },
    { question: 'A reliable answer should be based on', options: ['evidence', 'rumour', 'luck', 'speed only'], answer_index: 0, explanation: 'Evidence supports stronger answers.' },
  ],
};

function normaliseSubject(subject = '') {
  const value = subject.toLowerCase();
  if (value.includes('math')) return 'mathematics';
  if (value.includes('english')) return 'english';
  if (value.includes('science') || value.includes('biology') || value.includes('physics') || value.includes('chemistry')) return 'science';
  return 'default';
}

function makeOptions(correct, offset = 1) {
  const numeric = Number(correct);
  const values = Number.isFinite(numeric)
    ? [numeric, numeric + offset, Math.max(0, numeric - offset), numeric + offset * 2]
    : [correct, 'None of the above', 'All options', 'Not enough information'];
  return [...new Set(values.map(String))].slice(0, 4);
}

function generateQuestions({ subject, class_level, count = 5, difficulty = 'standard', prompt = '' }) {
  const key = normaliseSubject(`${subject} ${prompt}`);
  const templates = subjectTemplates[key] || subjectTemplates.default;
  const total = Math.min(Math.max(Number(count) || 5, 1), 30);
  const yearNumber = Number((class_level || '').match(/\d+/)?.[0] || 7);

  return Array.from({ length: total }, (_, index) => {
    const template = templates[index % templates.length];
    if (template.stem) {
      const vars = {
        a: Math.max(2, yearNumber + index + 1),
        b: Math.max(4, yearNumber * 2 + index + 3),
        c: (index % 4) + 2,
        p: [10, 20, 25, 50][index % 4],
        n: (yearNumber + index + 3) * 4,
      };
      const correct = template.answer(vars);
      const options = makeOptions(correct, index + 1);
      return {
        question: template.stem.replace(/\{(\w+)\}/g, (_, name) => vars[name]),
        options,
        answer_index: options.indexOf(String(correct)),
        explanation: template.explanation,
        difficulty,
      };
    }
    return { ...template, difficulty };
  });
}

const starterBanks = [
  {
    title: 'Junior WAEC Prep: Basic Science',
    subject: 'Basic Science',
    level: 'junior',
    class_level: 'JSS 3',
    exam_type: 'waec',
    questions: [
      {
        question: 'Which organelle is known as the powerhouse of the cell?',
        options: ['Nucleus', 'Mitochondrion', 'Ribosome', 'Vacuole'],
        answer_index: 1,
        explanation: 'The mitochondrion releases energy from food during respiration.',
      },
      {
        question: 'A simple machine that turns around a fixed point is called a',
        options: ['Lever', 'Pulley', 'Wedge', 'Screw'],
        answer_index: 0,
        explanation: 'A lever rotates around a fulcrum to make work easier.',
      },
      {
        question: 'The process by which green plants make food is',
        options: ['Respiration', 'Transpiration', 'Photosynthesis', 'Germination'],
        answer_index: 2,
        explanation: 'Photosynthesis uses sunlight, carbon dioxide, and water to produce glucose.',
      },
    ],
  },
  {
    title: 'Senior WAEC Prep: Mathematics',
    subject: 'Mathematics',
    level: 'senior',
    class_level: 'SS 3',
    exam_type: 'waec',
    questions: [
      {
        question: 'If 2x + 5 = 17, find x.',
        options: ['4', '5', '6', '7'],
        answer_index: 2,
        explanation: '2x = 12, therefore x = 6.',
      },
      {
        question: 'The gradient of the line y = 3x - 4 is',
        options: ['-4', '-3', '3', '4'],
        answer_index: 2,
        explanation: 'For y = mx + c, the gradient is m.',
      },
      {
        question: 'Simplify: (a^2 x a^3).',
        options: ['a^5', 'a^6', '2a^5', 'a^9'],
        answer_index: 0,
        explanation: 'When multiplying powers with the same base, add the indices.',
      },
    ],
  },
  {
    title: 'Senior WAEC Prep: English Language',
    subject: 'English Language',
    level: 'senior',
    class_level: 'SS 3',
    exam_type: 'waec',
    questions: [
      {
        question: 'Choose the word nearest in meaning to “diligent”.',
        options: ['Careless', 'Hardworking', 'Noisy', 'Late'],
        answer_index: 1,
        explanation: 'Diligent means careful and hardworking.',
      },
      {
        question: 'Identify the part of speech of “quickly” in: She quickly finished the work.',
        options: ['Noun', 'Verb', 'Adverb', 'Adjective'],
        answer_index: 2,
        explanation: 'Quickly modifies the verb finished, so it is an adverb.',
      },
      {
        question: 'A formal letter should usually include',
        options: ['Only emojis', 'Address and date', 'A song chorus', 'No greeting'],
        answer_index: 1,
        explanation: 'Formal letters include sender/receiver details, date, salutation, body, and closing.',
      },
    ],
  },
];

async function seedStarterBanks(schoolId) {
  const existing = await db('quiz_banks').where({ school_id: schoolId }).count('id as count').first();
  if (Number(existing.count || 0) > 0) return;

  await db.transaction(async (trx) => {
    for (const bank of starterBanks) {
      const { questions, ...bankData } = bank;
      const [created] = await trx('quiz_banks').insert({ school_id: schoolId, ...bankData }).returning('*');
      await trx('quiz_questions').insert(
        questions.map((question) => ({
          bank_id: created.id,
          question: question.question,
          options: JSON.stringify(question.options),
          answer_index: question.answer_index,
          explanation: question.explanation,
          difficulty: 'standard',
        }))
      );
    }
  });
}

router.get('/classes', async (req, res) => {
  try {
    const classes = await db('classes')
      .where({ school_id: req.schoolId, is_active: true })
      .select('id', 'name', 'section', 'level', 'order_index')
      .orderBy('order_index');
    return success(res, classes);
  } catch (err) {
    return error(res, 'Failed to load classes');
  }
});

router.get('/banks', async (req, res) => {
  try {
    await seedStarterBanks(req.schoolId);
    const { level, subject, exam_type } = req.query;
    const query = db('quiz_banks')
      .where({ school_id: req.schoolId, is_published: true })
      .orderBy([{ column: 'level' }, { column: 'subject' }, { column: 'title' }]);

    if (level) query.where({ level });
    if (subject) query.where('subject', 'like', `%${subject}%`);
    if (exam_type) query.where({ exam_type });

    return success(res, await query);
  } catch (err) {
    console.error('List learning banks error:', err);
    return error(res, 'Failed to load learning center');
  }
});

router.get('/banks/:id/questions', async (req, res) => {
  try {
    const bank = await db('quiz_banks').where({ id: req.params.id, school_id: req.schoolId }).first();
    if (!bank) return error(res, 'Quiz bank not found', 404);

    const questions = await db('quiz_questions')
      .where({ bank_id: req.params.id })
      .select('id', 'question', 'options', 'difficulty')
      .orderBy('created_at');

    return success(res, { bank, questions });
  } catch (err) {
    console.error('Load quiz questions error:', err);
    return error(res, 'Failed to load quiz questions');
  }
});

router.post('/banks', authorize('school_admin', 'super_admin', 'teacher'), async (req, res) => {
  try {
    const { title, subject, level, class_level, exam_type = 'school', questions = [] } = req.body;
    if (!title || !subject || !level || !questions.length) {
      return error(res, 'Title, subject, level, and at least one question are required', 400);
    }

    const result = await db.transaction(async (trx) => {
      const [bank] = await trx('quiz_banks')
        .insert({ school_id: req.schoolId, title, subject, level, class_level, exam_type, is_published: true })
        .returning('*');

      await trx('quiz_questions').insert(
        questions.map((question) => ({
          bank_id: bank.id,
          question: question.question,
          options: JSON.stringify(question.options || []),
          answer_index: Number(question.answer_index || 0),
          explanation: question.explanation || null,
          difficulty: question.difficulty || 'standard',
        }))
      );

      return bank;
    });

    return success(res, result, 201);
  } catch (err) {
    console.error('Create quiz bank error:', err);
    return error(res, 'Failed to create quiz');
  }
});

router.post('/banks/automate', authorize('school_admin', 'super_admin', 'teacher'), async (req, res) => {
  try {
    const {
      title,
      subject,
      level = 'junior',
      class_level = 'JSS 1',
      exam_type = 'school',
      count = 5,
      difficulty = 'standard',
      prompt = '',
    } = req.body;

    if (!title || !subject) return error(res, 'Title and subject are required', 400);
    const classExists = await db('classes')
      .where({ school_id: req.schoolId, is_active: true, name: class_level })
      .first();
    if (!classExists) return error(res, 'Select a supported class for this school', 400);

    const questions = generateQuestions({ subject, class_level, count, difficulty, prompt });
    const result = await db.transaction(async (trx) => {
      const [bank] = await trx('quiz_banks')
        .insert({
          school_id: req.schoolId,
          title,
          subject,
          level,
          class_level,
          exam_type,
          is_published: true,
          created_by: req.user.id,
        })
        .returning('*');

      await trx('quiz_questions').insert(
        questions.map((question) => ({
          bank_id: bank.id,
          question: question.question,
          options: JSON.stringify(question.options),
          answer_index: Number(question.answer_index || 0),
          explanation: question.explanation,
          difficulty: question.difficulty || difficulty,
        }))
      );

      return { bank, questions };
    });

    return success(res, result, 201);
  } catch (err) {
    console.error('Automate quiz bank error:', err);
    return error(res, 'Failed to automate quiz');
  }
});

router.post('/banks/:id/attempts', async (req, res) => {
  try {
    const { answers = [] } = req.body;
    const bank = await db('quiz_banks').where({ id: req.params.id, school_id: req.schoolId }).first();
    if (!bank) return error(res, 'Quiz bank not found', 404);

    const questions = await db('quiz_questions').where({ bank_id: bank.id }).orderBy('created_at');
    const graded = questions.map((question, index) => {
      const selected = Number(answers[index]);
      return {
        question_id: question.id,
        selected,
        correct: selected === Number(question.answer_index),
        answer_index: Number(question.answer_index),
        explanation: question.explanation,
      };
    });
    const score = graded.filter((item) => item.correct).length;

    const [attempt] = await db('quiz_attempts')
      .insert({
        school_id: req.schoolId,
        bank_id: bank.id,
        user_id: req.user.id,
        score,
        total: questions.length,
        answers: JSON.stringify(graded),
      })
      .returning('*');

    return success(res, { attempt, graded });
  } catch (err) {
    console.error('Submit quiz attempt error:', err);
    return error(res, 'Failed to submit quiz');
  }
});

module.exports = router;
