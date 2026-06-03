const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize, schoolScope } = require('../middleware/auth');
const { success, error, paginate, paginationMeta } = require('../utils/response');

router.use(authenticate, schoolScope);

// GET /api/library/books
router.get('/books', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category } = req.query;

    let query = db('library_books')
      .where({ school_id: req.schoolId, is_active: true });

    if (search) {
      query = query.where(function () {
        this.whereILike('title', `%${search}%`)
          .orWhereILike('author', `%${search}%`)
          .orWhereILike('isbn', `%${search}%`);
      });
    }
    if (category) query = query.where({ category });

    const countQuery = query.clone().count('id as count').first();
    const total = await countQuery;

    const books = await paginate(
      query.orderBy('title'),
      page, limit
    );

    return success(res, {
      books,
      pagination: paginationMeta(Number(total.count), page, limit),
    });
  } catch (err) {
    return error(res, 'Failed to fetch books');
  }
});

// POST /api/library/books
router.post('/books', authorize('school_admin', 'staff'), async (req, res) => {
  try {
    const { title, author, isbn, category, publisher, year_published, total_copies, shelf_location, cover_image_url, description } = req.body;
    if (!title) return error(res, 'Title is required', 400);

    const [book] = await db('library_books')
      .insert({
        school_id: req.schoolId, title, author, isbn, category, publisher,
        year_published, total_copies: total_copies || 1, available_copies: total_copies || 1,
        shelf_location, cover_image_url, description,
      })
      .returning('*');

    return success(res, book, 201);
  } catch (err) {
    return error(res, 'Failed to add book');
  }
});

// POST /api/library/loans
router.post('/loans', authorize('school_admin', 'teacher', 'staff'), async (req, res) => {
  try {
    const { book_id, student_id, user_id, due_date } = req.body;
    if (!book_id || (!student_id && !user_id)) return error(res, 'book_id and borrower required', 400);

    const book = await db('library_books').where({ id: book_id, school_id: req.schoolId }).first();
    if (!book) return error(res, 'Book not found', 404);
    if (book.available_copies < 1) return error(res, 'No copies available', 400);

    const [loan] = await db('book_loans')
      .insert({
        book_id, student_id, user_id, school_id: req.schoolId,
        borrow_date: new Date().toISOString().split('T')[0],
        due_date: due_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        issued_by: req.user.id,
      })
      .returning('*');

    await db('library_books').where({ id: book_id }).decrement('available_copies', 1);

    return success(res, loan, 201);
  } catch (err) {
    return error(res, 'Failed to issue book');
  }
});

// PUT /api/library/loans/:id/return
router.put('/loans/:id/return', authorize('school_admin', 'teacher', 'staff'), async (req, res) => {
  try {
    const loan = await db('book_loans').where({ id: req.params.id, school_id: req.schoolId }).first();
    if (!loan) return error(res, 'Loan not found', 404);
    if (loan.status === 'returned') return error(res, 'Already returned', 400);

    await db('book_loans').where({ id: req.params.id }).update({
      status: 'returned',
      return_date: new Date().toISOString().split('T')[0],
      updated_at: db.fn.now(),
    });

    await db('library_books').where({ id: loan.book_id }).increment('available_copies', 1);

    return success(res, { message: 'Book returned successfully' });
  } catch (err) {
    return error(res, 'Failed to return book');
  }
});

// GET /api/library/loans
router.get('/loans', async (req, res) => {
  try {
    const { status = 'borrowed' } = req.query;

    let query = db('book_loans as bl')
      .where({ 'bl.school_id': req.schoolId })
      .leftJoin('library_books as b', 'b.id', 'bl.book_id')
      .leftJoin('students as s', 's.id', 'bl.student_id')
      .leftJoin('users as u', 'u.id', 'bl.user_id')
      .select(
        'bl.*',
        'b.title as book_title', 'b.author as book_author',
        db.raw("COALESCE(s.first_name || ' ' || s.last_name, u.first_name || ' ' || u.last_name) as borrower_name"),
        's.admission_no'
      );

    if (status) query = query.where('bl.status', status);

    const loans = await query.orderBy('bl.borrow_date', 'desc').limit(100);

    return success(res, loans);
  } catch (err) {
    return error(res, 'Failed to fetch loans');
  }
});

// GET /api/library/stats
router.get('/stats', async (req, res) => {
  try {
    const [totalBooks, totalLoans, overdueLoans, categories] = await Promise.all([
      db('library_books').where({ school_id: req.schoolId, is_active: true }).sum('total_copies as total').count('id as titles').first(),
      db('book_loans').where({ school_id: req.schoolId, status: 'borrowed' }).count('id as count').first(),
      db('book_loans').where({ school_id: req.schoolId, status: 'borrowed' }).where('due_date', '<', new Date().toISOString().split('T')[0]).count('id as count').first(),
      db('library_books').where({ school_id: req.schoolId, is_active: true }).groupBy('category').select('category', db.raw('COUNT(*) as count')),
    ]);

    return success(res, {
      total_copies: Number(totalBooks.total || 0),
      total_titles: Number(totalBooks.titles || 0),
      active_loans: Number(totalLoans.count || 0),
      overdue_loans: Number(overdueLoans.count || 0),
      categories,
    });
  } catch (err) {
    return error(res, 'Failed to fetch library stats');
  }
});

module.exports = router;
