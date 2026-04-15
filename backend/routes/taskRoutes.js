const express = require('express');
const { query } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const { mapTask } = require('../utils/taskMapper');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { category_id, completed, q } = req.query;
    let sql = 'SELECT * FROM tasks WHERE user_id = ?';
    const params = [req.user.id];

    if (category_id) {
      sql += ' AND category_id = ?';
      params.push(category_id);
    }

    if (completed === 'true' || completed === 'false') {
      sql += ' AND completed = ?';
      params.push(completed === 'true' ? 1 : 0);
    }

    if (q) {
      sql += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = await query(sql, params);
    return res.json(rows.map(mapTask));
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi lấy danh sách task', detail: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy task!' });
    }

    const attachments = await query(
      'SELECT * FROM attachments WHERE user_id = ? AND target_type = ? AND target_id = ? ORDER BY created_at DESC',
      [req.user.id, 'task', req.params.id]
    );

    return res.json({ ...mapTask(rows[0]), attachments });
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi lấy chi tiết task', detail: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      category_id,
      title,
      description,
      start_time,
      duration_minutes,
      due_at,
      priority,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title là bắt buộc!' });
    }

    const result = await query(
      `INSERT INTO tasks 
      (user_id, category_id, title, description, start_time, duration_minutes, due_at, priority, status, completed, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, NULL)`,
      [
        req.user.id,
        category_id || null,
        title,
        description || null,
        start_time || null,
        duration_minutes || null,
        due_at || null,
        priority || 'medium',
      ]
    );

    const inserted = await query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
    return res.status(201).json(mapTask(inserted[0]));
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi tạo task', detail: error.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const existing = await query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy task!' });
    }

    const current = existing[0];
    const completed = req.body.completed !== undefined ? Number(Boolean(req.body.completed)) : current.completed;
    const status = completed ? 'completed' : 'pending';
    const completedAt = completed ? (req.body.completed_at || new Date()) : null;

    await query(
      `UPDATE tasks SET
        category_id = ?,
        title = ?,
        description = ?,
        start_time = ?,
        duration_minutes = ?,
        due_at = ?,
        priority = ?,
        completed = ?,
        status = ?,
        completed_at = ?
      WHERE id = ? AND user_id = ?`,
      [
        req.body.category_id !== undefined ? req.body.category_id : current.category_id,
        req.body.title !== undefined ? req.body.title : current.title,
        req.body.description !== undefined ? req.body.description : current.description,
        req.body.start_time !== undefined ? req.body.start_time : current.start_time,
        req.body.duration_minutes !== undefined ? req.body.duration_minutes : current.duration_minutes,
        req.body.due_at !== undefined ? req.body.due_at : current.due_at,
        req.body.priority !== undefined ? req.body.priority : current.priority,
        completed,
        status,
        completedAt,
        req.params.id,
        req.user.id,
      ]
    );

    const updated = await query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    return res.json(mapTask(updated[0]));
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi cập nhật task', detail: error.message });
  }
});

router.patch('/:id/complete', async (req, res) => {
  try {
    const { completed } = req.body;
    if (typeof completed !== 'boolean') {
      return res.status(400).json({ error: 'completed phải là boolean!' });
    }

    await query(
      `UPDATE tasks SET completed = ?, status = ?, completed_at = ?
       WHERE id = ? AND user_id = ?`,
      [completed ? 1 : 0, completed ? 'completed' : 'pending', completed ? new Date() : null, req.params.id, req.user.id]
    );

    const rows = await query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy task!' });
    }

    return res.json(mapTask(rows[0]));
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi cập nhật trạng thái task', detail: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    return res.json({ message: 'Đã xóa task thành công', affectedRows: result.affectedRows });
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi xóa task', detail: error.message });
  }
});

module.exports = router;