import { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, CheckCircle2, Filter, GraduationCap, Plus, Sparkles, Trash2, Trophy, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, Card, Input, Modal, ProgressBar, StatCard } from '../common/UI';
import { useAuth } from '../../context/AuthContext';
import { useApi, useMutation } from '../../hooks/useApi';

const emptyQuestion = () => ({
  question: '',
  options: ['', '', '', ''],
  answer_index: 0,
  explanation: '',
  difficulty: 'standard',
});

export default function LearningPage() {
  const { isAdmin, isTeacher } = useAuth();
  const [level, setLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [activeBank, setActiveBank] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const query = `/learning/banks?${level ? `level=${level}&` : ''}${subject ? `subject=${subject}&` : ''}`;
  const { data: banksData, loading, refetch } = useApi(query, { deps: [level, subject] });
  const { data: classesData } = useApi('/learning/classes', { initialData: [] });
  const { data: quizData, loading: loadingQuiz } = useApi(
    activeBank ? `/learning/banks/${activeBank.id}/questions` : null,
    { immediate: !!activeBank, deps: [activeBank?.id] }
  );
  const { mutate: submitAttempt, loading: submitting } = useMutation();

  const banks = Array.isArray(banksData) ? banksData : [];
  const classOptions = Array.isArray(classesData) ? classesData.map((item) => item.name).filter(Boolean) : [];
  const visibleBanks = classLevel ? banks.filter((bank) => bank.class_level === classLevel) : banks;
  const subjects = useMemo(() => [...new Set(banks.map((bank) => bank.subject))], [banks]);
  const questions = quizData?.questions || [];
  const scorePercent = result?.attempt?.total ? Math.round((Number(result.attempt.score) / result.attempt.total) * 100) : 0;

  const startQuiz = (bank) => {
    setActiveBank(bank);
    setAnswers({});
    setResult(null);
  };

  const submitQuiz = async () => {
    if (!questions.length) return;
    if (Object.keys(answers).length < questions.length) return toast.error('Answer every question before submitting');
    const orderedAnswers = questions.map((_, index) => answers[index]);
    const { success, data } = await submitAttempt(`/learning/banks/${activeBank.id}/attempts`, { answers: orderedAnswers });
    if (success) {
      setResult(data);
      toast.success('Quiz submitted');
    } else {
      toast.error('Could not submit quiz');
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-3)', flexWrap: 'wrap', marginBottom: 'var(--sp-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Learning Hub</h1>
          <p style={{ color: 'var(--sp-slate-500)', fontSize: '0.875rem', marginTop: 'var(--sp-1)' }}>
            Create, automate, practise, and instantly mark quizzes for your school classes.
          </p>
        </div>
        {(isAdmin || isTeacher) && <Button icon={Wand2} onClick={() => setShowCreate(true)}>Build Quiz</Button>}
      </div>

      <div className="page-hero" style={{ marginBottom: 'var(--sp-5)' }}>
        <div>
          <Badge variant="green" dot>Teacher automation ready</Badge>
          <h2 style={{ fontSize: '1.35rem', marginTop: 'var(--sp-3)', marginBottom: 'var(--sp-2)' }}>Turn lesson topics into practice sets</h2>
          <p style={{ color: 'var(--sp-slate-600)', maxWidth: 680 }}>
            Teachers can generate a full quiz draft, refine it manually, and let students practise with instant feedback.
          </p>
        </div>
        <div className="hero-metrics">
          <span>{banks.length}<small>banks</small></span>
          <span>{subjects.length}<small>subjects</small></span>
          <span>{visibleBanks.length}<small>showing</small></span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sp-4)', marginBottom: 'var(--sp-5)' }}>
        <StatCard label="Question Banks" value={banks.length} icon={BookOpenCheck} color="var(--sp-green-600)" />
        <StatCard label="Junior Prep" value={banks.filter(b => b.level === 'junior').length} icon={GraduationCap} color="var(--sp-info)" />
        <StatCard label="Senior Prep" value={banks.filter(b => b.level === 'senior').length} icon={Trophy} color="var(--sp-amber-600)" />
      </div>

      <Card style={{ marginBottom: 'var(--sp-5)' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', alignItems: 'end' }}>
          <div style={{ flex: '0 1 220px' }}>
            <Input label="Level" type="select" value={level} onChange={e => setLevel(e.target.value)} icon={Filter}>
              <option value="">All Levels</option>
              <option value="primary">Primary</option>
              <option value="junior">Junior Secondary</option>
              <option value="senior">Senior Secondary</option>
              <option value="all">All</option>
            </Input>
          </div>
          <div style={{ flex: '0 1 260px' }}>
            <Input label="Subject" type="select" value={subject} onChange={e => setSubject(e.target.value)}>
              <option value="">All Subjects</option>
              {subjects.map(item => <option key={item} value={item}>{item}</option>)}
            </Input>
          </div>
          <div style={{ flex: '0 1 220px' }}>
            <Input label="Class" type="select" value={classLevel} onChange={e => setClassLevel(e.target.value)}>
              <option value="">All Classes</option>
              {classOptions.map(item => <option key={item} value={item}>{item}</option>)}
            </Input>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: activeBank ? '360px 1fr' : '1fr', gap: 'var(--sp-5)' }} className="learning-shell">
        <div style={{ display: 'grid', gridTemplateColumns: activeBank ? '1fr' : 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--sp-4)', alignContent: 'start' }}>
          {loading ? <Card>Loading quizzes...</Card> : visibleBanks.map((bank) => (
            <Card key={bank.id} hover onClick={() => startQuiz(bank)} style={{ borderColor: activeBank?.id === bank.id ? 'var(--sp-green-400)' : 'var(--sp-border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
                <Badge variant={bank.level === 'senior' ? 'amber' : 'info'}>{bank.level}</Badge>
                <Badge variant="green">{bank.exam_type.toUpperCase()}</Badge>
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 'var(--sp-2)' }}>{bank.title}</h3>
              <p style={{ color: 'var(--sp-slate-500)', fontSize: '0.8125rem' }}>{bank.subject} - {bank.class_level || 'All classes'}</p>
              <Button size="sm" style={{ marginTop: 'var(--sp-4)' }}>Start Practice</Button>
            </Card>
          ))}
          {!loading && visibleBanks.length === 0 && <Card>No quizzes match this filter yet.</Card>}
        </div>

        {activeBank && (
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)' }}>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800 }}>{activeBank.title}</h2>
                <p style={{ color: 'var(--sp-slate-500)', fontSize: '0.8125rem' }}>{activeBank.subject} practice mode</p>
              </div>
              <Button variant="secondary" onClick={() => { setActiveBank(null); setResult(null); }}>Close</Button>
            </div>

            {loadingQuiz ? <p>Loading questions...</p> : questions.map((question, index) => {
              const options = Array.isArray(question.options) ? question.options : JSON.parse(question.options || '[]');
              const graded = result?.graded?.[index];
              return (
                <div key={question.id} style={{ padding: 'var(--sp-4)', border: '1px solid var(--sp-border-subtle)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--sp-4)' }}>
                  <p style={{ fontWeight: 800, marginBottom: 'var(--sp-3)' }}>{index + 1}. {question.question}</p>
                  <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
                    {options.map((option, optionIndex) => {
                      const selected = answers[index] === optionIndex;
                      const correct = graded?.answer_index === optionIndex;
                      return (
                        <button
                          key={`${option}-${optionIndex}`}
                          disabled={!!result}
                          onClick={() => setAnswers({ ...answers, [index]: optionIndex })}
                          style={{
                            border: `1px solid ${correct ? 'var(--sp-green-500)' : selected ? 'var(--sp-blue-500)' : 'var(--sp-border)'}`,
                            background: correct ? 'var(--sp-green-50)' : selected ? 'var(--sp-blue-50)' : 'var(--sp-surface)',
                            padding: '0.75rem 0.9rem',
                            borderRadius: 'var(--radius-md)',
                            textAlign: 'left',
                            cursor: result ? 'default' : 'pointer',
                            fontFamily: 'var(--font-body)',
                          }}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  {graded && (
                    <p style={{ marginTop: 'var(--sp-3)', fontSize: '0.8125rem', color: graded.correct ? 'var(--sp-success)' : 'var(--sp-danger)' }}>
                      {graded.correct ? 'Correct.' : 'Review this.'} {graded.explanation}
                    </p>
                  )}
                </div>
              );
            })}

            {result ? (
              <div style={{ padding: 'var(--sp-4)', background: 'var(--sp-green-50)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
                  <CheckCircle2 size={20} style={{ color: 'var(--sp-green-700)' }} />
                  <strong>Score: {result.attempt.score}/{result.attempt.total}</strong>
                </div>
                <ProgressBar value={scorePercent} showLabel />
              </div>
            ) : (
              <Button icon={CheckCircle2} loading={submitting} onClick={submitQuiz}>Submit Quiz</Button>
            )}
          </Card>
        )}
      </div>

      <CreateQuizModal isOpen={showCreate} classOptions={classOptions} onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); refetch(); }} />

      <style>{`
        @media (max-width: 960px) {
          .learning-shell { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function CreateQuizModal({ isOpen, classOptions, onClose, onSuccess }) {
  const [mode, setMode] = useState('automated');
  const [form, setForm] = useState({
    title: '',
    subject: '',
    level: 'junior',
    class_level: '',
    exam_type: 'school',
    count: 5,
    difficulty: 'standard',
    prompt: '',
    questions: [emptyQuestion()],
  });
  const { mutate, loading } = useMutation();
  useEffect(() => {
    if (!form.class_level && classOptions.length) {
      setForm((current) => ({ ...current, class_level: classOptions[0] }));
    }
  }, [classOptions, form.class_level]);
  const set = (key, value) => setForm({ ...form, [key]: value });
  const setQuestion = (index, key, value) => {
    const questions = [...form.questions];
    questions[index] = { ...questions[index], [key]: value };
    set('questions', questions);
  };
  const setOption = (questionIndex, optionIndex, value) => {
    const questions = [...form.questions];
    const options = [...questions[questionIndex].options];
    options[optionIndex] = value;
    questions[questionIndex] = { ...questions[questionIndex], options };
    set('questions', questions);
  };
  const addQuestion = () => set('questions', [...form.questions, emptyQuestion()]);
  const removeQuestion = (index) => {
    if (form.questions.length === 1) return toast.error('Keep at least one question');
    set('questions', form.questions.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (!form.title || !form.subject || !form.class_level) return toast.error('Add title, subject, and year/class');

    if (mode === 'automated') {
      const { success } = await mutate('/learning/banks/automate', {
        title: form.title,
        subject: form.subject,
        level: form.level,
        class_level: form.class_level,
        exam_type: form.exam_type,
        count: Number(form.count),
        difficulty: form.difficulty,
        prompt: form.prompt,
      });
      if (success) {
        toast.success('Automated quiz created');
        onSuccess();
      } else {
        toast.error('Could not automate quiz');
      }
      return;
    }

    if (form.questions.some(q => !q.question || q.options.some(option => !option))) {
      return toast.error('Complete every question and all four options');
    }

    const { success } = await mutate('/learning/banks', {
      title: form.title,
      subject: form.subject,
      level: form.level,
      class_level: form.class_level,
      exam_type: form.exam_type,
      questions: form.questions.map(q => ({ ...q, answer_index: Number(q.answer_index) })),
    });

    if (success) {
      toast.success('Quiz created');
      onSuccess();
    } else {
      toast.error('Could not create quiz');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Build Quiz" width={760}>
      <div className="segmented" style={{ marginBottom: 'var(--sp-5)' }}>
        <button type="button" onClick={() => setMode('automated')} className={mode === 'automated' ? 'active' : ''}><Sparkles size={15} /> Automated</button>
        <button type="button" onClick={() => setMode('manual')} className={mode === 'manual' ? 'active' : ''}><Plus size={15} /> Manual</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 var(--sp-3)' }}>
        <Input label="Title" value={form.title} onChange={e => set('title', e.target.value)} />
        <Input label="Subject" value={form.subject} onChange={e => set('subject', e.target.value)} />
        <Input label="Level" type="select" value={form.level} onChange={e => set('level', e.target.value)}>
          <option value="primary">Primary</option>
          <option value="junior">Junior</option>
          <option value="senior">Senior</option>
          <option value="all">All</option>
        </Input>
        <Input label="Exam Type" type="select" value={form.exam_type} onChange={e => set('exam_type', e.target.value)}>
          <option value="school">School Quiz</option>
          <option value="waec">WAEC Practice</option>
          <option value="neco">NECO Practice</option>
          <option value="igcse">IGCSE</option>
          <option value="checkpoint">Checkpoint</option>
          <option value="common_entrance">Common Entrance</option>
        </Input>
      </div>

      <Input label="Class" type="select" value={form.class_level} onChange={e => set('class_level', e.target.value)}>
        {classOptions.map(item => <option key={item} value={item}>{item}</option>)}
      </Input>

      {mode === 'automated' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 var(--sp-3)' }}>
            <Input label="Number of Questions" type="number" min="1" max="30" value={form.count} onChange={e => set('count', e.target.value)} />
            <Input label="Difficulty" type="select" value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
              <option value="foundation">Foundation</option>
              <option value="standard">Standard</option>
              <option value="challenge">Challenge</option>
            </Input>
          </div>
          <Input label="Topic Guidance" type="textarea" value={form.prompt} onChange={e => set('prompt', e.target.value)} placeholder="Example: fractions, cell biology, comprehension, algebra" />
        </>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
          {form.questions.map((question, questionIndex) => (
            <Card key={questionIndex} style={{ background: 'var(--sp-slate-50)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-3)' }}>
                <strong>Question {questionIndex + 1}</strong>
                <Button variant="ghost" size="sm" icon={Trash2} onClick={() => removeQuestion(questionIndex)}>Remove</Button>
              </div>
              <Input label="Question" type="textarea" value={question.question} onChange={e => setQuestion(questionIndex, 'question', e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 var(--sp-3)' }}>
                {question.options.map((option, optionIndex) => (
                  <Input key={optionIndex} label={`Option ${optionIndex + 1}`} value={option} onChange={e => setOption(questionIndex, optionIndex, e.target.value)} />
                ))}
              </div>
              <Input label="Correct Option" type="select" value={question.answer_index} onChange={e => setQuestion(questionIndex, 'answer_index', e.target.value)}>
                {question.options.map((_, index) => <option key={index} value={index}>Option {index + 1}</option>)}
              </Input>
              <Input label="Explanation" type="textarea" value={question.explanation} onChange={e => setQuestion(questionIndex, 'explanation', e.target.value)} />
            </Card>
          ))}
          <Button variant="secondary" icon={Plus} onClick={addQuestion}>Add Another Question</Button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-3)', marginTop: 'var(--sp-5)' }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button icon={mode === 'automated' ? Wand2 : CheckCircle2} loading={loading} onClick={submit}>{mode === 'automated' ? 'Generate Quiz' : 'Create Quiz'}</Button>
      </div>
    </Modal>
  );
}
