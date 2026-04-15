const express = require('express');
const { query } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM categories WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC',
      [req.user.id]
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi lấy categories', detail: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, type, color, sort_order } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'name và type là bắt buộc!' });
    }

    const allowedTypes = ['planned', 'work', 'personal', 'project'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ error: 'type không hợp lệ!' });
    }

    const result = await query(
      'INSERT INTO categories (user_id, name, type, color, sort_order) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, name, type, color || null, sort_order || 0]
    );

    const inserted = await query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    return res.status(201).json(inserted[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi tạo category', detail: error.message });
  }
});

module.exports = router;