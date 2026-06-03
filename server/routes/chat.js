const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize, schoolScope } = require('../middleware/auth');
const { success, error } = require('../utils/response');

const STAFF_ROLES = ['school_admin', 'super_admin', 'teacher', 'accountant', 'staff'];

router.use(authenticate, authorize(...STAFF_ROLES), schoolScope);

async function ensureStaffRoom(req) {
  let thread = await db('chat_threads')
    .where({ school_id: req.schoolId, type: 'staff', title: 'Staff Lounge' })
    .first();

  if (!thread) {
    [thread] = await db('chat_threads')
      .insert({
        school_id: req.schoolId,
        type: 'staff',
        title: 'Staff Lounge',
        created_by: req.user.id,
      })
      .returning('*');
  }

  const staffUsers = await db('users')
    .where({ school_id: req.schoolId, is_active: true })
    .whereIn('role', STAFF_ROLES.filter((role) => role !== 'super_admin'))
    .select('id');

  const rows = staffUsers.map((user) => ({ thread_id: thread.id, user_id: user.id }));
  if (rows.length) {
    await db('chat_participants')
      .insert(rows)
      .onConflict(['thread_id', 'user_id'])
      .ignore();
  }

  return thread;
}

router.get('/threads', async (req, res) => {
  try {
    await ensureStaffRoom(req);

    const query = db('chat_threads as t')
      .where({ 't.school_id': req.schoolId })
      .leftJoin('chat_messages as m', function () {
        this.on('m.thread_id', 't.id').andOn(
          'm.created_at',
          '=',
          db.raw('(select max(created_at) from chat_messages where thread_id = t.id)')
        );
      })
      .select('t.*', 'm.body as last_message', 'm.created_at as last_message_at')
      .orderByRaw('COALESCE(m.created_at, t.created_at) desc');

    if (req.user.role !== 'school_admin' && req.user.role !== 'super_admin') {
      query.join('chat_participants as p', 'p.thread_id', 't.id').where({ 'p.user_id': req.user.id });
    }

    return success(res, await query);
  } catch (err) {
    console.error('List chat threads error:', err);
    return error(res, 'Failed to load staff chat');
  }
});

router.post('/threads', authorize('school_admin', 'super_admin'), async (req, res) => {
  try {
    const { title, participant_ids = [], type = 'staff' } = req.body;
    if (!title) return error(res, 'Thread title is required', 400);

    const [thread] = await db('chat_threads')
      .insert({ school_id: req.schoolId, title, type, created_by: req.user.id })
      .returning('*');

    const participants = [...new Set([req.user.id, ...participant_ids])].map((userId) => ({
      thread_id: thread.id,
      user_id: userId,
    }));

    if (participants.length) await db('chat_participants').insert(participants).onConflict(['thread_id', 'user_id']).ignore();
    return success(res, thread, 201);
  } catch (err) {
    console.error('Create chat thread error:', err);
    return error(res, 'Failed to create staff chat');
  }
});

router.get('/threads/:id/messages', async (req, res) => {
  try {
    const thread = await db('chat_threads').where({ id: req.params.id, school_id: req.schoolId }).first();
    if (!thread) return error(res, 'Chat not found', 404);

    const messages = await db('chat_messages as m')
      .leftJoin('users as u', 'u.id', 'm.sender_id')
      .where({ 'm.thread_id': req.params.id })
      .select('m.*', 'u.first_name', 'u.last_name', 'u.role', 'u.avatar_url')
      .orderBy('m.created_at', 'asc')
      .limit(200);

    await db('chat_participants')
      .where({ thread_id: req.params.id, user_id: req.user.id })
      .update({ last_read_at: db.fn.now() });

    return success(res, messages);
  } catch (err) {
    console.error('List chat messages error:', err);
    return error(res, 'Failed to load messages');
  }
});

router.post('/threads/:id/messages', async (req, res) => {
  try {
    const { body, attachment_url } = req.body;
    if (!body || !body.trim()) return error(res, 'Message cannot be empty', 400);

    const thread = await db('chat_threads').where({ id: req.params.id, school_id: req.schoolId }).first();
    if (!thread) return error(res, 'Chat not found', 404);

    const [message] = await db('chat_messages')
      .insert({
        thread_id: req.params.id,
        sender_id: req.user.id,
        body: body.trim(),
        attachment_url: attachment_url || null,
      })
      .returning('*');

    return success(res, message, 201);
  } catch (err) {
    console.error('Send chat message error:', err);
    return error(res, 'Failed to send message');
  }
});

module.exports = router;
