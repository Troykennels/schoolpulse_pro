const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize, schoolScope } = require('../middleware/auth');
const { success, error } = require('../utils/response');

router.use(authenticate, schoolScope);

// GET /api/hostels
router.get('/', authorize('super_admin', 'school_admin', 'staff'), async (req, res) => {
  try {
    const hostels = await db('hostels').where({ school_id: req.schoolId, is_active: true }).orderBy('name');
    return success(res, hostels);
  } catch (err) { return error(res, 'Failed to fetch hostels'); }
});

// POST /api/hostels
router.post('/', authorize('super_admin', 'school_admin'), async (req, res) => {
  try {
    const { name, type, warden_id, total_rooms, total_beds, address, description } = req.body;
    if (!name || !type) return error(res, 'Hostel name and type are required', 400);
    const [hostel] = await db('hostels').insert({
      school_id: req.schoolId, name, type, warden_id, total_rooms: total_rooms || 0,
      total_beds: total_beds || 0, address, description,
    }).returning('*');
    return success(res, hostel, 201);
  } catch (err) { return error(res, 'Failed to create hostel'); }
});

// GET /api/hostels/:id/rooms
router.get('/:id/rooms', async (req, res) => {
  try {
    const rooms = await db('hostel_rooms').where({ hostel_id: req.params.id }).orderBy('room_number');
    return success(res, rooms);
  } catch (err) { return error(res, 'Failed to fetch rooms'); }
});

// POST /api/hostels/:id/rooms
router.post('/:id/rooms', authorize('super_admin', 'school_admin'), async (req, res) => {
  try {
    const { room_number, room_type, capacity, fee_per_term } = req.body;
    if (!room_number) return error(res, 'Room number is required', 400);
    const [room] = await db('hostel_rooms').insert({
      hostel_id: req.params.id, room_number, room_type: room_type || 'dormitory',
      capacity: capacity || 4, fee_per_term: fee_per_term || 0,
    }).returning('*');
    return success(res, room, 201);
  } catch (err) { return error(res, 'Failed to create room'); }
});

// POST /api/hostels/allocate — assign student to room
router.post('/allocate', authorize('super_admin', 'school_admin', 'staff'), async (req, res) => {
  try {
    const { student_id, room_id, term_id, bed_number } = req.body;
    if (!student_id || !room_id) return error(res, 'Student and room are required', 400);

    const room = await db('hostel_rooms').where({ id: room_id }).first();
    if (!room) return error(res, 'Room not found', 404);
    if (room.occupied >= room.capacity) return error(res, 'Room is full', 400);

    const [allocation] = await db('hostel_allocations').insert({
      school_id: req.schoolId, student_id, room_id, term_id, bed_number,
      check_in_date: new Date(),
    }).returning('*');

    await db('hostel_rooms').where({ id: room_id }).increment('occupied', 1);
    if (room.occupied + 1 >= room.capacity) {
      await db('hostel_rooms').where({ id: room_id }).update({ status: 'full' });
    }

    return success(res, allocation, 201);
  } catch (err) { return error(res, 'Failed to allocate room'); }
});

// GET /api/hostels/allocations — list allocations
router.get('/allocations/list', async (req, res) => {
  try {
    const allocations = await db('hostel_allocations as ha')
      .join('students as s', 'ha.student_id', 's.id')
      .join('hostel_rooms as hr', 'ha.room_id', 'hr.id')
      .join('hostels as h', 'hr.hostel_id', 'h.id')
      .where('ha.school_id', req.schoolId)
      .where('ha.status', 'active')
      .select('ha.*', 's.first_name', 's.last_name', 's.admission_no',
        'hr.room_number', 'h.name as hostel_name')
      .orderBy('h.name');
    return success(res, allocations);
  } catch (err) { return error(res, 'Failed to fetch allocations'); }
});

module.exports = router;
