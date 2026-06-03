const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize, schoolScope } = require('../middleware/auth');
const { success, error } = require('../utils/response');

router.use(authenticate, schoolScope);

// GET /api/inventory
router.get('/', authorize('super_admin', 'school_admin', 'accountant', 'staff'), async (req, res) => {
  try {
    const { category, low_stock } = req.query;
    let query = db('inventory_items').where({ school_id: req.schoolId, is_active: true });
    if (category) query = query.where('category', category);
    if (low_stock === 'true') query = query.whereRaw('quantity <= minimum_stock');
    const items = await query.orderBy('item_name');
    return success(res, items);
  } catch (err) { return error(res, 'Failed to fetch inventory'); }
});

// POST /api/inventory
router.post('/', authorize('super_admin', 'school_admin', 'accountant'), async (req, res) => {
  try {
    const { item_name, category, location, quantity, minimum_stock, unit_cost,
      supplier, condition, purchase_date, warranty_expiry, serial_number, notes } = req.body;
    if (!item_name) return error(res, 'Item name is required', 400);
    const [item] = await db('inventory_items').insert({
      school_id: req.schoolId, item_name, category: category || 'other',
      location, quantity: quantity || 0, minimum_stock: minimum_stock || 0,
      unit_cost: unit_cost || 0, supplier, condition, purchase_date,
      warranty_expiry, serial_number, notes,
    }).returning('*');
    return success(res, item, 201);
  } catch (err) { return error(res, 'Failed to add inventory item'); }
});

// PUT /api/inventory/:id
router.put('/:id', authorize('super_admin', 'school_admin', 'accountant'), async (req, res) => {
  try {
    const allowed = ['item_name', 'category', 'location', 'quantity', 'minimum_stock',
      'unit_cost', 'supplier', 'condition', 'purchase_date', 'warranty_expiry', 'serial_number', 'notes', 'is_active'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    updates.updated_at = db.fn.now();
    const [item] = await db('inventory_items').where({ id: req.params.id, school_id: req.schoolId })
      .update(updates).returning('*');
    return success(res, item);
  } catch (err) { return error(res, 'Failed to update inventory item'); }
});

// DELETE /api/inventory/:id
router.delete('/:id', authorize('super_admin', 'school_admin'), async (req, res) => {
  try {
    await db('inventory_items').where({ id: req.params.id, school_id: req.schoolId })
      .update({ is_active: false });
    return success(res, { message: 'Item removed' });
  } catch (err) { return error(res, 'Failed to remove item'); }
});

module.exports = router;
