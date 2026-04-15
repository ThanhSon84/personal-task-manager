const express = require('express');
const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

async function ensureTargetOwnership(userId, targetType, targetId) {
  if (targetType === 'task') {
    const rows = await query('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [targetId, userId]);
    return rows.length > 0;
  }
  if (targetType === 'event') {
    const rows = await query('SELECT id FROM events WHERE id = ? AND user_id = ?', [targetId, userId]);
    return rows.length > 0;
  }
  return false;
}

router.get('/', async (req, res) => {
  try {
    const { target_type, target_id } = req.query;
    let sql = 'SELECT * FROM attachments WHERE user_id = ?';
    const params = [req.user.id];

    if (target_type) {
      sql += ' AND target_type = ?';
      params.push(target_type);
    }
    if (target_id) {
      sql += ' AND target_id = ?';
      params.push(target_id);
    }

    sql += ' ORDER BY created_at DESC';
    const rows = await query(sql, params);
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi lấy attachments', detail: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { target_type, target_id, file_name, file_url, mime_type } = req.body;
    if (!target_type || !target_id || !file_name || !file_url) {
      return res.status(400).json({ error: 'Thiếu thông tin attachment!' });
    }

    if (!['task', 'event'].includes(target_type)) {
      return res.status(400).json({ error: 'target_type phải là task hoặc event!' });
    }

    const ok = await ensureTargetOwnership(req.user.id, target_type, target_id);
    if (!ok) {
      return res.status(404).json({ error: 'Target không tồn tại hoặc không thuộc về bạn!' });
    }

    const result = await query(
      `INSERT INTO attachments (user_id, target_type, target_id, file_name, file_url, mime_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, target_type, target_id, file_name, file_url, mime_type || null]
    );

    const inserted = await query('SELECT * FROM attachments WHERE id = ?', [result.insertId]);
    return res.status(201).json(inserted[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi tạo attachment', detail: error.message });
  }
});

router.post('/upload-base64', async (req, res) => {
  try {
    const { target_type, target_id, file_name, mime_type, data } = req.body;

    if (!target_type || !target_id || !file_name || !mime_type || !data) {
      return res.status(400).json({ error: 'Thiếu dữ liệu upload ảnh!' });
    }

    if (!['task', 'event'].includes(target_type)) {
      return res.status(400).json({ error: 'target_type phải là task hoặc event!' });
    }

    if (!mime_type.startsWith('image/')) {
      return res.status(400).json({ error: 'Chỉ hỗ trợ upload ảnh!' });
    }

    const ok = await ensureTargetOwnership(req.user.id, target_type, target_id);
    if (!ok) {
      return res.status(404).json({ error: 'Target không tồn tại hoặc không thuộc về bạn!' });
    }

    const ext = path.extname(file_name) || `.${mime_type.split('/')[1] || 'png'}`;
    const safeBase = path.basename(file_name, path.extname(file_name)).replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 50) || 'image';
    const finalName = `${Date.now()}-${req.user.id}-${safeBase}${ext}`;
    const finalPath = path.join(uploadsDir, finalName);
    const base64Data = data.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');

    fs.writeFileSync(finalPath, Buffer.from(base64Data, 'base64'));

    const result = await query(
      `INSERT INTO attachments (user_id, target_type, target_id, file_name, file_url, mime_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, target_type, target_id, file_name, `/uploads/${finalName}`, mime_type]
    );

    const inserted = await query('SELECT * FROM attachments WHERE id = ?', [result.insertId]);
    return res.status(201).json(inserted[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi upload ảnh', detail: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM attachments WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy attachment!' });
    }

    const attachment = rows[0];
    const filePath = attachment.file_url?.startsWith('/uploads/')
      ? path.join(process.cwd(), attachment.file_url.replace(/^\//, ''))
      : null;

    await query('DELETE FROM attachments WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);

    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return res.json({ message: 'Đã xóa attachment thành công' });
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi xóa attachment', detail: error.message });
  }
});

module.exports = router;