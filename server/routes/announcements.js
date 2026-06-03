const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize, schoolScope } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { success, error, paginate } = require('../utils/response');

// POST /api/announcements
router.post('/', authenticate, authorize('school_admin', 'teacher'), validate(schemas.createAnnouncement), async (req, res) => {
  try {
    const { title, content, target_audience, priority, send_sms, send_whatsapp } = req.body;

    const [announcement] = await db('announcements')
      .insert({
        school_id: req.user.school_id,
        title,
        content,
        target_audience: target_audience || 'all',
        priority: priority || 'normal',
        send_sms: send_sms || false,
        send_whatsapp: send_whatsapp || false,
        created_by: req.user.id
      })
      .returning('*');

    // In production: queue SMS/WhatsApp jobs via BullMQ
    // if (send_sms) await smsQueue.add('sendBulk', { announcementId: announcement.id });

    return success(res, announcement, 201);
  } catch (err) {
    console.error('Create announcement error:', err);
    return error(res, 'Failed to create announcement');
  }
});

// GET /api/announcements
router.get('/', authenticate, schoolScope, async (req, res) => {
  try {
    const { page = 1, limit = 20, audience } = req.query;

    let query = db('announcements as a')
      .where({ 'a.school_id': req.user.school_id })
      .join('users as u', 'u.id', 'a.created_by')
      .select('a.*', db.raw("u.first_name || ' ' || u.last_name as author_name"));

    // Filter by audience relevance
    if (req.user.role === 'parent') {
      query = query.where(function () {
        this.where('a.target_audience', 'all')
          .orWhere('a.target_audience', 'parents');
      });
    } else if (req.user.role === 'teacher') {
      query = query.where(function () {
        this.where('a.target_audience', 'all')
          .orWhere('a.target_audience', 'teachers')
          .orWhere('a.target_audience', 'staff');
      });
    }

    if (audience) query = query.where('a.target_audience', audience);

    query = query.orderBy('a.created_at', 'desc');
    const result = await paginate(query, page, limit);

    return success(res, result);
  } catch (err) {
    return error(res, 'Failed to fetch announcements');
  }
});

// DELETE /api/announcements/:id
router.delete('/:id', authenticate, authorize('school_admin'), async (req, res) => {
  try {
    await db('announcements')
      .where({ id: req.params.id, school_id: req.user.school_id })
      .delete();
    return success(res, { message: 'Announcement deleted' });
  } catch (err) {
    return error(res, 'Failed to delete announcement');
  }
});

module.exports = router;
