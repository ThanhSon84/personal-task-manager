const express = require('express');
const { query } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM notes WHERE user_id = ? ORDER BY pinned DESC, updated_at DESC',
      [req.user.id]
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi lấy ghi chú', detail: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, content, color, pinned } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'content là bắt buộc!' });
    }

    const result = await query(
      'INSERT INTO notes (user_id, title, content, color, pinned) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, title || null, content, color || null, pinned ? 1 : 0]
    );

    const inserted = await query('SELECT * FROM notes WHERE id = ?', [result.insertId]);
    return res.status(201).json(inserted[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi tạo ghi chú', detail: error.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy ghi chú!' });
    }

    const current = rows[0];
    await query(
      `UPDATE notes SET title = ?, content = ?, color = ?, pinned = ?
       WHERE id = ? AND user_id = ?`,
      [
        req.body.title !== undefined ? req.body.title : current.title,
        req.body.content !== undefined ? req.body.content : current.content,
        req.body.color !== undefined ? req.body.color : current.color,
        req.body.pinned !== undefined ? (req.body.pinned ? 1 : 0) : current.pinned,
        req.params.id,
        req.user.id,
      ]
    );

    const updated = await query('SELECT * FROM notes WHERE id = ?', [req.params.id]);
    return res.json(updated[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi cập nhật ghi chú', detail: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    return res.json({ message: 'Đã xóa ghi chú thành công', affectedRows: result.affectedRows });
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi xóa ghi chú', detail: error.message });
  }
});

module.exports = router;