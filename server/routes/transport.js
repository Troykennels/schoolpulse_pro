const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize, schoolScope } = require('../middleware/auth');
const { success, error } = require('../utils/response');

router.use(authenticate, schoolScope);

// GET /api/transport/routes
router.get('/routes', async (req, res) => {
  try {
    const routes = await db('transport_routes').where({ school_id: req.schoolId, is_active: true }).orderBy('route_name');
    return success(res, routes);
  } catch (err) { return error(res, 'Failed to fetch transport routes'); }
});

// POST /api/transport/routes
router.post('/routes', authorize('super_admin', 'school_admin'), async (req, res) => {
  try {
    const { route_name, vehicle_number, vehicle_type, driver_name, driver_phone,
      assistant_name, assistant_phone, capacity, fee_per_term, pickup_points,
      departure_time, return_time } = req.body;
    if (!route_name) return error(res, 'Route name is required', 400);
    const [route] = await db('transport_routes').insert({
      school_id: req.schoolId, route_name, vehicle_number, vehicle_type,
      driver_name, driver_phone, assistant_name, assistant_phone,
      capacity: capacity || 40, fee_per_term: fee_per_term || 0,
      pickup_points: typeof pickup_points === 'string' ? pickup_points : JSON.stringify(pickup_points || []),
      departure_time, return_time,
    }).returning('*');
    return success(res, route, 201);
  } catch (err) { return error(res, 'Failed to create route'); }
});

// PUT /api/transport/routes/:id
router.put('/routes/:id', authorize('super_admin', 'school_admin'), async (req, res) => {
  try {
    const allowed = ['route_name', 'vehicle_number', 'vehicle_type', 'driver_name', 'driver_phone',
      'assistant_name', 'assistant_phone', 'capacity', 'fee_per_term', 'pickup_points',
      'departure_time', 'return_time', 'is_active'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    updates.updated_at = db.fn.now();
    const [route] = await db('transport_routes').where({ id: req.params.id, school_id: req.schoolId })
      .update(updates).returning('*');
    return success(res, route);
  } catch (err) { return error(res, 'Failed to update route'); }
});

// POST /api/transport/subscribe
router.post('/subscribe', authorize('super_admin', 'school_admin', 'staff'), async (req, res) => {
  try {
    const { student_id, route_id, term_id, pickup_point, type } = req.body;
    if (!student_id || !route_id) return error(res, 'Student and route are required', 400);
    const [sub] = await db('transport_subscriptions').insert({
      school_id: req.schoolId, student_id, route_id, term_id,
      pickup_point, type: type || 'two_way',
    }).returning('*');
    return success(res, sub, 201);
  } catch (err) { return error(res, 'Failed to subscribe student'); }
});

// GET /api/transport/subscriptions
router.get('/subscriptions', async (req, res) => {
  try {
    const subs = await db('transport_subscriptions as ts')
      .join('students as s', 'ts.student_id', 's.id')
      .join('transport_routes as tr', 'ts.route_id', 'tr.id')
      .where('ts.school_id', req.schoolId)
      .where('ts.status', 'active')
      .select('ts.*', 's.first_name', 's.last_name', 's.admission_no',
        'tr.route_name', 'tr.vehicle_number')
      .orderBy('tr.route_name');
    return success(res, subs);
  } catch (err) { return error(res, 'Failed to fetch subscriptions'); }
});

module.exports = router;
