/**
 * International grading system utilities.
 * Supports: Nigerian (WAEC/NECO), British (IGCSE/A-Level), American (GPA),
 * IB, CBSE, and custom grading scales.
 */

const DEFAULT_GRADING_SCALE = {
  A: { min: 70, max: 100, remark: 'Excellent', gpa: 4.0 },
  B: { min: 60, max: 69, remark: 'Very Good', gpa: 3.0 },
  C: { min: 50, max: 59, remark: 'Good', gpa: 2.0 },
  D: { min: 45, max: 49, remark: 'Fair', gpa: 1.0 },
  E: { min: 40, max: 44, remark: 'Poor', gpa: 0.5 },
  F: { min: 0, max: 39, remark: 'Fail', gpa: 0.0 },
};

const IGCSE_GRADING_SCALE = {
  'A*': { min: 90, max: 100, remark: 'Outstanding', gpa: 4.0 },
  A: { min: 80, max: 89, remark: 'Excellent', gpa: 4.0 },
  B: { min: 70, max: 79, remark: 'Very Good', gpa: 3.5 },
  C: { min: 60, max: 69, remark: 'Good', gpa: 3.0 },
  D: { min: 50, max: 59, remark: 'Satisfactory', gpa: 2.0 },
  E: { min: 40, max: 49, remark: 'Sufficient', gpa: 1.0 },
  F: { min: 20, max: 39, remark: 'Weak', gpa: 0.5 },
  G: { min: 10, max: 19, remark: 'Very Weak', gpa: 0.0 },
  U: { min: 0, max: 9, remark: 'Ungraded', gpa: 0.0 },
};

const US_GRADING_SCALE = {
  'A+': { min: 97, max: 100, remark: 'Exceptional', gpa: 4.0 },
  A: { min: 93, max: 96, remark: 'Excellent', gpa: 4.0 },
  'A-': { min: 90, max: 92, remark: 'Very Good', gpa: 3.7 },
  'B+': { min: 87, max: 89, remark: 'Good', gpa: 3.3 },
  B: { min: 83, max: 86, remark: 'Above Average', gpa: 3.0 },
  'B-': { min: 80, max: 82, remark: 'Satisfactory', gpa: 2.7 },
  'C+': { min: 77, max: 79, remark: 'Average', gpa: 2.3 },
  C: { min: 73, max: 76, remark: 'Acceptable', gpa: 2.0 },
  'C-': { min: 70, max: 72, remark: 'Below Average', gpa: 1.7 },
  D: { min: 60, max: 69, remark: 'Poor', gpa: 1.0 },
  F: { min: 0, max: 59, remark: 'Fail', gpa: 0.0 },
};

function getScaleForCurriculum(curriculum) {
  switch (curriculum) {
    case 'british': return IGCSE_GRADING_SCALE;
    case 'american': return US_GRADING_SCALE;
    case 'ib': return IGCSE_GRADING_SCALE;
    default: return DEFAULT_GRADING_SCALE;
  }
}

function getGradeLetter(total, scale = DEFAULT_GRADING_SCALE) {
  for (const [letter, range] of Object.entries(scale)) {
    if (total >= range.min && total <= range.max) {
      return { letter, remark: range.remark, gpa: range.gpa || 0 };
    }
  }
  return { letter: 'F', remark: 'Fail', gpa: 0 };
}

function computeTotal(ca1 = 0, ca2 = 0, ca3 = 0, exam = 0) {
  return parseFloat((Number(ca1) + Number(ca2) + Number(ca3) + Number(exam)).toFixed(2));
}

function computeClassAverage(grades) {
  if (!grades.length) return 0;
  const sum = grades.reduce((acc, g) => acc + Number(g.total), 0);
  return parseFloat((sum / grades.length).toFixed(2));
}

function rankStudentsInSubject(grades) {
  const sorted = [...grades].sort((a, b) => b.total - a.total);
  return sorted.map((g, i) => ({
    ...g,
    position_in_subject: i + 1,
  }));
}

function computeStudentTermSummary(grades) {
  if (!grades.length) return { total_score: 0, average: 0, subjects_count: 0 };
  const totalScore = grades.reduce((acc, g) => acc + Number(g.total), 0);
  const gpas = grades.map(g => Number(g.gpa_points || 0));
  return {
    total_score: parseFloat(totalScore.toFixed(2)),
    average: parseFloat((totalScore / grades.length).toFixed(2)),
    subjects_count: grades.length,
    highest: Math.max(...grades.map((g) => g.total)),
    lowest: Math.min(...grades.map((g) => g.total)),
    cumulative_gpa: gpas.length ? parseFloat((gpas.reduce((a, b) => a + b, 0) / gpas.length).toFixed(2)) : 0,
  };
}

function generateReportCardData(studentGrades, classGrades, gradingScale) {
  const subjectResults = studentGrades.map((sg) => {
    const subjectClassGrades = classGrades.filter(
      (g) => g.subject_id === sg.subject_id
    );
    const classAvg = computeClassAverage(subjectClassGrades);
    const ranked = rankStudentsInSubject(subjectClassGrades);
    const studentRank = ranked.find((r) => r.student_id === sg.student_id);
    const { letter, remark, gpa } = getGradeLetter(sg.total, gradingScale);

    return {
      subject_name: sg.subject_name,
      ca1: sg.ca1_score,
      ca2: sg.ca2_score,
      ca3: sg.ca3_score,
      exam: sg.exam_score,
      total: sg.total,
      grade: letter,
      remark,
      gpa,
      class_average: classAvg,
      class_highest: subjectClassGrades.length ? Math.max(...subjectClassGrades.map((g) => g.total)) : 0,
      class_lowest: subjectClassGrades.length ? Math.min(...subjectClassGrades.map((g) => g.total)) : 0,
      position: studentRank?.position_in_subject || '-',
      out_of: subjectClassGrades.length,
      teacher_comment: sg.teacher_comment || '',
    };
  });

  const summary = computeStudentTermSummary(studentGrades);

  return { subjects: subjectResults, summary };
}

module.exports = {
  DEFAULT_GRADING_SCALE,
  IGCSE_GRADING_SCALE,
  US_GRADING_SCALE,
  getScaleForCurriculum,
  getGradeLetter,
  computeTotal,
  computeClassAverage,
  rankStudentsInSubject,
  computeStudentTermSummary,
  generateReportCardData,
};
