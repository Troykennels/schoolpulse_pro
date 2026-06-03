import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApi, useMutation } from '../../hooks/useApi';
import { Card, Button, Badge, Input, Modal, StatCard, Tabs } from '../common/UI';
import { Library, BookOpen, Plus, Search, ArrowDownUp, ArrowUpRight } from 'lucide-react';
import { formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function LibraryPage() {
  const { user } = useAuth();
  const isAdmin = ['school_admin', 'super_admin', 'staff'].includes(user?.role);
  const canManage = ['school_admin', 'super_admin', 'teacher', 'staff'].includes(user?.role);
  const [tab, setTab] = useState('catalog');
  const [search, setSearch] = useState('');
  const [showAddBook, setShowAddBook] = useState(false);
  const [showLoanForm, setShowLoanForm] = useState(false);

  const { data: booksData, loading: loadingBooks, refetch: refetchBooks } = useApi(`/library/books?search=${search}`);
  const { data: loansData, loading: loadingLoans, refetch: refetchLoans } = useApi('/library/loans');
  const { data: stats } = useApi('/library/stats');
  const { mutate: saveBook, loading: savingBook } = useMutation();
  const { mutate: issueLoan, loading: issuingLoan } = useMutation();
  const { mutate: returnBook } = useMutation();

  const books = booksData?.books || [];
  const loans = loansData || [];

  const [bookForm, setBookForm] = useState({ title: '', author: '', isbn: '', category: '', total_copies: 1 });
  const [loanForm, setLoanForm] = useState({ book_id: '', student_id: '', due_date: '' });

  const setB = (k, v) => setBookForm({ ...bookForm, [k]: v });
  const setL = (k, v) => setLoanForm({ ...loanForm, [k]: v });

  const handleAddBook = async () => {
    if (!bookForm.title) return toast.error('Title is required');
    const { success } = await saveBook('/library/books', bookForm);
    if (success) { toast.success('Book added'); setShowAddBook(false); refetchBooks(); }
  };

  const handleIssueLoan = async () => {
    if (!loanForm.book_id || !loanForm.student_id) return toast.error('Book and student are required');
    const { success } = await issueLoan('/library/loans', loanForm);
    if (success) { toast.success('Book issued'); setShowLoanForm(false); refetchLoans(); refetchBooks(); }
  };

  const handleReturn = async (loanId) => {
    const { success } = await returnBook(`/library/loans/${loanId}/return`, {}, 'PUT');
    if (success) { toast.success('Book returned'); refetchLoans(); refetchBooks(); }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-6)' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.625rem', fontWeight: 700 }}>Library</h2>
          <p style={{ color: 'var(--sp-slate-500)', fontSize: '0.875rem', marginTop: 4 }}>Manage books and loans</p>
        </div>
        {canManage && (
          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            <Button variant="secondary" onClick={() => setShowLoanForm(true)}><ArrowUpRight size={16} /> Issue Book</Button>
            <Button onClick={() => setShowAddBook(true)}><Plus size={16} /> Add Book</Button>
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }} className="stagger-children">
          <StatCard label="Total Titles" value={stats.total_titles} icon={<Library size={20} />} color="var(--sp-green-600)" />
          <StatCard label="Total Copies" value={stats.total_copies} icon={<BookOpen size={20} />} color="var(--sp-info)" />
          <StatCard label="Active Loans" value={stats.active_loans} icon={<ArrowUpRight size={20} />} color="var(--sp-amber-600)" />
          <StatCard label="Overdue" value={stats.overdue_loans} icon={<ArrowDownUp size={20} />} color="var(--sp-danger)" />
        </div>
      )}

      {/* Tabs */}
      <Tabs
        tabs={[
          { key: 'catalog', label: 'Book Catalog' },
          { key: 'loans', label: 'Active Loans' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'catalog' && (
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <Card style={{ padding: 'var(--sp-3) var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <Search size={16} style={{ color: 'var(--sp-slate-400)' }} />
              <input
                placeholder="Search books by title, author, or ISBN..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.875rem', fontFamily: 'var(--font-body)', background: 'transparent' }}
              />
            </div>
          </Card>

          {loadingBooks ? (
            <Card style={{ padding: 'var(--sp-10)', textAlign: 'center' }}><p style={{ color: 'var(--sp-slate-400)' }}>Loading...</p></Card>
          ) : books.length === 0 ? (
            <Card style={{ padding: 'var(--sp-10)', textAlign: 'center' }}>
              <Library size={40} style={{ color: 'var(--sp-slate-300)', marginBottom: 'var(--sp-3)' }} />
              <p style={{ color: 'var(--sp-slate-500)' }}>No books found</p>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--sp-4)' }} className="stagger-children">
              {books.map(book => (
                <Card key={book.id} style={{ padding: 'var(--sp-4) var(--sp-5)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-2)' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9375rem', marginBottom: 4 }}>{book.title}</h4>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--sp-slate-500)' }}>{book.author}</p>
                    </div>
                    {book.category && <Badge>{book.category}</Badge>}
                  </div>
                  {book.isbn && <p style={{ fontSize: '0.75rem', color: 'var(--sp-slate-400)', marginBottom: 'var(--sp-2)' }}>ISBN: {book.isbn}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--sp-3)', paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--sp-border-subtle)' }}>
                    <div style={{ display: 'flex', gap: 'var(--sp-4)', fontSize: '0.8125rem' }}>
                      <span style={{ color: 'var(--sp-slate-500)' }}>Total: <strong>{book.total_copies}</strong></span>
                      <span style={{ color: book.available_copies > 0 ? 'var(--sp-success)' : 'var(--sp-danger)' }}>
                        Available: <strong>{book.available_copies}</strong>
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'loans' && (
        <div style={{ marginTop: 'var(--sp-4)' }}>
          {loadingLoans ? (
            <Card style={{ padding: 'var(--sp-10)', textAlign: 'center' }}><p style={{ color: 'var(--sp-slate-400)' }}>Loading...</p></Card>
          ) : loans.length === 0 ? (
            <Card style={{ padding: 'var(--sp-10)', textAlign: 'center' }}>
              <p style={{ color: 'var(--sp-slate-500)' }}>No active loans</p>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }} className="stagger-children">
              {loans.map(loan => {
                const isOverdue = new Date(loan.due_date) < new Date();
                return (
                  <Card key={loan.id} style={{ padding: 'var(--sp-4) var(--sp-5)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9375rem', marginBottom: 4 }}>{loan.book_title}</h4>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--sp-slate-500)' }}>
                          Borrower: <strong>{loan.borrower_name}</strong>{loan.admission_no ? ` (${loan.admission_no})` : ''}
                        </p>
                        <div style={{ display: 'flex', gap: 'var(--sp-4)', fontSize: '0.75rem', color: 'var(--sp-slate-400)', marginTop: 4 }}>
                          <span>Borrowed: {formatDate(loan.borrow_date)}</span>
                          <span style={{ color: isOverdue ? 'var(--sp-danger)' : 'inherit', fontWeight: isOverdue ? 600 : 400 }}>
                            Due: {formatDate(loan.due_date)} {isOverdue && '(OVERDUE)'}
                          </span>
                        </div>
                      </div>
                      {canManage && loan.status === 'borrowed' && (
                        <Button size="sm" variant="secondary" onClick={() => handleReturn(loan.id)}>Return</Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Book Modal */}
      <Modal isOpen={showAddBook} onClose={() => setShowAddBook(false)} title="Add New Book" width={480}>
        <Input label="Title" value={bookForm.title} onChange={e => setB('title', e.target.value)} />
        <Input label="Author" value={bookForm.author} onChange={e => setB('author', e.target.value)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 var(--sp-3)' }}>
          <Input label="ISBN" value={bookForm.isbn} onChange={e => setB('isbn', e.target.value)} />
          <Input label="Category" value={bookForm.category} onChange={e => setB('category', e.target.value)} placeholder="e.g. Literature" />
        </div>
        <Input label="Total Copies" type="number" value={bookForm.total_copies} onChange={e => setB('total_copies', parseInt(e.target.value) || 1)} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-3)' }}>
          <Button variant="secondary" onClick={() => setShowAddBook(false)}>Cancel</Button>
          <Button loading={savingBook} onClick={handleAddBook}>Add Book</Button>
        </div>
      </Modal>

      {/* Issue Loan Modal */}
      <Modal isOpen={showLoanForm} onClose={() => setShowLoanForm(false)} title="Issue Book" width={420}>
        <Input label="Book ID" placeholder="Book UUID" value={loanForm.book_id} onChange={e => setL('book_id', e.target.value)} />
        <Input label="Student ID" placeholder="Student UUID" value={loanForm.student_id} onChange={e => setL('student_id', e.target.value)} />
        <Input label="Due Date" type="date" value={loanForm.due_date} onChange={e => setL('due_date', e.target.value)} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-3)' }}>
          <Button variant="secondary" onClick={() => setShowLoanForm(false)}>Cancel</Button>
          <Button loading={issuingLoan} onClick={handleIssueLoan}>Issue</Button>
        </div>
      </Modal>
    </div>
  );
}
