const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize, schoolScope } = require('../middleware/auth');
const { success, error } = require('../utils/response');

router.use(authenticate, schoolScope);

// GET /api/events
router.get('/', async (req, res) => {
  try {
    const { month, year, type } = req.query;
    let query = db('events')
      .where({ school_id: req.schoolId, is_active: true })
      .orderBy('start_date');

    if (month && year) {
      query = query.whereRaw('EXTRACT(MONTH FROM start_date) = ?', [month])
        .whereRaw('EXTRACT(YEAR FROM start_date) = ?', [year]);
    }
    if (type) query = query.where({ event_type: type });

    // Filter by visibility
    if (req.user.role === 'parent') {
      query = query.whereIn('visibility', ['all', 'parents']);
    } else if (req.user.role === 'student') {
      query = query.whereIn('visibility', ['all', 'students']);
    }

    return success(res, await query);
  } catch (err) {
    return error(res, 'Failed to fetch events');
  }
});

// POST /api/events
router.post('/', authorize('school_admin', 'super_admin', 'teacher'), async (req, res) => {
  try {
    const { title, description, event_type, start_date, end_date, start_time, end_time, location, visibility, color, is_recurring, recurrence_rule } = req.body;
    if (!title || !start_date) return error(res, 'Title and start date are required', 400);

    const [event] = await db('events')
      .insert({
        school_id: req.schoolId, created_by: req.user.id,
        title, description, event_type, start_date, end_date: end_date || start_date,
        start_time, end_time, location, visibility: visibility || 'all',
        color: color || '#22A97A', is_recurring, recurrence_rule,
      })
      .returning('*');

    return success(res, event, 201);
  } catch (err) {
    return error(res, 'Failed to create event');
  }
});

// PUT /api/events/:id
router.put('/:id', authorize('school_admin', 'super_admin', 'teacher'), async (req, res) => {
  try {
    const allowed = ['title', 'description', 'event_type', 'start_date', 'end_date', 'start_time', 'end_time', 'location', 'visibility', 'color', 'is_recurring', 'recurrence_rule', 'is_active'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    updates.updated_at = db.fn.now();

    const [event] = await db('events')
      .where({ id: req.params.id, school_id: req.schoolId })
      .update(updates)
      .returning('*');

    if (!event) return error(res, 'Event not found', 404);
    return success(res, event);
  } catch (err) {
    return error(res, 'Failed to update event');
  }
});

// DELETE /api/events/:id
router.delete('/:id', authorize('school_admin', 'super_admin', 'teacher'), async (req, res) => {
  try {
    await db('events').where({ id: req.params.id, school_id: req.schoolId }).delete();
    return success(res, { message: 'Event deleted' });
  } catch (err) {
    return error(res, 'Failed to delete event');
  }
});

module.exports = router;
