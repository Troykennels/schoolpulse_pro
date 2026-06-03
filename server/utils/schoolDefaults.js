const dayjs = require('dayjs');

const CLASS_PLANS = {
  Nigeria: [
    ['JSS 1', 'Junior Secondary', 'junior_secondary'],
    ['JSS 2', 'Junior Secondary', 'junior_secondary'],
    ['JSS 3', 'Junior Secondary', 'junior_secondary'],
    ['SS 1', 'Senior Secondary', 'senior_secondary'],
    ['SS 2', 'Senior Secondary', 'senior_secondary'],
    ['SS 3', 'Senior Secondary', 'senior_secondary'],
  ],
  Ghana: [
    ['JHS 1', 'Junior High', 'junior_secondary'],
    ['JHS 2', 'Junior High', 'junior_secondary'],
    ['JHS 3', 'Junior High', 'junior_secondary'],
    ['SHS 1', 'Senior High', 'senior_secondary'],
    ['SHS 2', 'Senior High', 'senior_secondary'],
    ['SHS 3', 'Senior High', 'senior_secondary'],
  ],
  Kenya: [
    ['Grade 7', 'Junior Secondary', 'junior_secondary'],
    ['Grade 8', 'Junior Secondary', 'junior_secondary'],
    ['Grade 9', 'Junior Secondary', 'junior_secondary'],
    ['Grade 10', 'Senior Secondary', 'senior_secondary'],
    ['Grade 11', 'Senior Secondary', 'senior_secondary'],
    ['Grade 12', 'Senior Secondary', 'senior_secondary'],
  ],
  'South Africa': [
    ['Grade 7', 'Senior Phase', 'junior_secondary'],
    ['Grade 8', 'Senior Phase', 'junior_secondary'],
    ['Grade 9', 'Senior Phase', 'junior_secondary'],
    ['Grade 10', 'FET', 'senior_secondary'],
    ['Grade 11', 'FET', 'senior_secondary'],
    ['Grade 12', 'FET', 'senior_secondary'],
  ],
  'United Kingdom': [
    ['Year 7', 'Key Stage 3', 'junior_secondary'],
    ['Year 8', 'Key Stage 3', 'junior_secondary'],
    ['Year 9', 'Key Stage 3', 'junior_secondary'],
    ['Year 10', 'Key Stage 4', 'senior_secondary'],
    ['Year 11', 'Key Stage 4', 'senior_secondary'],
    ['Year 12', 'Sixth Form', 'a_level'],
    ['Year 13', 'Sixth Form', 'a_level'],
  ],
  'United States': [
    ['Grade 6', 'Middle School', 'grade_6_8'],
    ['Grade 7', 'Middle School', 'grade_6_8'],
    ['Grade 8', 'Middle School', 'grade_6_8'],
    ['Grade 9', 'High School', 'grade_9_12'],
    ['Grade 10', 'High School', 'grade_9_12'],
    ['Grade 11', 'High School', 'grade_9_12'],
    ['Grade 12', 'High School', 'grade_9_12'],
  ],
};

const DEFAULT_SUBJECTS = [
  ['Mathematics', 'MATH', 'mathematics'],
  ['English Language', 'ENG', 'languages'],
  ['Basic Science', 'BSC', 'science'],
  ['Social Studies', 'SOC', 'humanities'],
  ['Civic Education', 'CIV', 'general'],
  ['Computer Studies', 'ICT', 'technology'],
];

function classPlanFor(country) {
  return CLASS_PLANS[country] || CLASS_PLANS.Nigeria;
}

function currentAcademicYear() {
  const now = dayjs();
  const startYear = now.month() >= 7 ? now.year() : now.year() - 1;
  return {
    name: `${startYear}/${startYear + 1}`,
    start: `${startYear}-09-01`,
    end: `${startYear + 1}-07-31`,
  };
}

async function ensureSchoolDefaults(db, school) {
  const schoolId = typeof school === 'string' ? school : school.id;
  const country = typeof school === 'string' ? 'Nigeria' : school.country;
  const year = currentAcademicYear();

  let academicYear = await db('academic_years')
    .where({ school_id: schoolId, is_current: true })
    .first();

  if (!academicYear) {
    [academicYear] = await db('academic_years')
      .insert({
        school_id: schoolId,
        name: year.name,
        start_date: year.start,
        end_date: year.end,
        is_current: true,
      })
      .returning('*');
  }

  const termCount = await db('terms').where({ school_id: schoolId }).count('id as count').first();
  if (Number(termCount.count || 0) === 0) {
    await db('terms').insert([
      {
        school_id: schoolId,
        academic_year_id: academicYear.id,
        name: 'First Term',
        term_number: 1,
        start_date: year.start,
        end_date: `${year.name.slice(5)}-12-20`,
        is_current: false,
      },
      {
        school_id: schoolId,
        academic_year_id: academicYear.id,
        name: 'Second Term',
        term_number: 2,
        start_date: `${year.name.slice(5)}-01-08`,
        end_date: `${year.name.slice(5)}-04-12`,
        is_current: false,
      },
      {
        school_id: schoolId,
        academic_year_id: academicYear.id,
        name: 'Third Term',
        term_number: 3,
        start_date: `${year.name.slice(5)}-04-29`,
        end_date: year.end,
        is_current: true,
      },
    ]);
  }

  const classCount = await db('classes').where({ school_id: schoolId, is_active: true }).count('id as count').first();
  if (Number(classCount.count || 0) === 0) {
    await db('classes').insert(
      classPlanFor(country).map(([name, section, level], index) => ({
        school_id: schoolId,
        academic_year_id: academicYear.id,
        name,
        section,
        level,
        order_index: index + 1,
        capacity: 40,
        is_active: true,
      }))
    );
  }

  const subjectCount = await db('subjects').where({ school_id: schoolId, is_active: true }).count('id as count').first();
  if (Number(subjectCount.count || 0) === 0) {
    await db('subjects').insert(
      DEFAULT_SUBJECTS.map(([name, code, category]) => ({
        school_id: schoolId,
        name,
        code,
        category,
        is_active: true,
      }))
    );
  }
}

module.exports = { classPlanFor, ensureSchoolDefaults };
