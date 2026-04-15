const express = require('express');
const { query } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { start, end, category_id, q } = req.query;
    let sql = 'SELECT * FROM events WHERE user_id = ?';
    const params = [req.user.id];

    if (category_id) {
      sql += ' AND category_id = ?';
      params.push(category_id);
    }

    if (start) {
      sql += ' AND start_time >= ?';
      params.push(start);
    }

    if (end) {
      sql += ' AND start_time <= ?';
      params.push(end);
    }

    if (q) {
      sql += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }

    sql += ' ORDER BY start_time ASC';

    const rows = await query(sql, params);
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi lấy danh sách event', detail: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM events WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy event!' });
    }

    const attachments = await query(
      'SELECT * FROM attachments WHERE user_id = ? AND target_type = ? AND target_id = ? ORDER BY created_at DESC',
      [req.user.id, 'event', req.params.id]
    );

    return res.json({ ...rows[0], attachments });
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi lấy chi tiết event', detail: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { category_id, title, description, start_time, duration_minutes, location } = req.body;
    if (!title || !start_time || !duration_minutes) {
      return res.status(400).json({ error: 'title, start_time, duration_minutes là bắt buộc!' });
    }

    const result = await query(
      `INSERT INTO events (user_id, category_id, title, description, start_time, duration_minutes, location)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, category_id || null, title, description || null, start_time, duration_minutes, location || null]
    );

    const inserted = await query('SELECT * FROM events WHERE id = ?', [result.insertId]);
    return res.status(201).json(inserted[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi tạo event', detail: error.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM events WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy event!' });
    }

    const current = rows[0];

    await query(
      `UPDATE events SET
        category_id = ?,
        title = ?,
        description = ?,
        start_time = ?,
        duration_minutes = ?,
        location = ?
      WHERE id = ? AND user_id = ?`,
      [
        req.body.category_id !== undefined ? req.body.category_id : current.category_id,
        req.body.title !== undefined ? req.body.title : current.title,
        req.body.description !== undefined ? req.body.description : current.description,
        req.body.start_time !== undefined ? req.body.start_time : current.start_time,
        req.body.duration_minutes !== undefined ? req.body.duration_minutes : current.duration_minutes,
        req.body.location !== undefined ? req.body.location : current.location,
        req.params.id,
        req.user.id,
      ]
    );

    const updated = await query('SELECT * FROM events WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    return res.json(updated[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi cập nhật event', detail: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM events WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    return res.json({ message: 'Đã xóa event thành công', affectedRows: result.affectedRows });
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi xóa event', detail: error.message });
  }
});

module.exports = router;