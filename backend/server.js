const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '30mb' }));
app.use(cors());

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'tododb',
});

db.connect((err) => {
  if (err) {
    console.error('Lỗi kết nối MySQL:', err.stack);
    return;
  }
  console.log('Kết nối MySQL thành công!');
});

const SECRET_KEY = process.env.JWT_SECRET || 'yoursecretkeyhere';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(403).json({ error: 'Không có token, quyền truy cập bị từ chối!' });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token không hợp lệ hoặc hết hạn!' });
    }
    req.user = decoded;
    next();
  });
}

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

function parseReminderOffsets(value) {
  if (Array.isArray(value)) {
    return [...new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item >= 0)
    )].sort((a, b) => a - b);
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parseReminderOffsets(parsed);
    } catch (err) {
      return [];
    }
  }

  return [];
}

function normalizeAttachment(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    target_type: row.target_type,
    target_id: row.target_id,
    file_name: row.file_name,
    file_url: row.file_url,
    mime_type: row.mime_type,
    created_at: row.created_at,
  };
}

function normalizeTask(row, attachments = []) {
  const overdue =
    !!row.due_at &&
    !row.completed &&
    new Date(row.due_at).getTime() < Date.now();

  return {
    id: row.id,
    user_id: row.user_id,
    category_id: row.category_id,
    title: row.title,
    description: row.description || '',
    start_time: row.start_time,
    duration_minutes: row.duration_minutes,
    due_at: row.due_at,
    priority: row.priority || 'medium',
    status: row.status || (row.completed ? 'completed' : 'pending'),
    completed: !!row.completed,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    overdue,
    attachments,
  };
}

function normalizeEvent(row, attachments = []) {
  return {
    id: row.id,
    user_id: row.user_id,
    category_id: row.category_id,
    title: row.title,
    description: row.description || '',
    start_time: row.start_time,
    duration_minutes: row.duration_minutes,
    location: row.location || '',
    reminder_offsets: parseReminderOffsets(row.reminder_offsets),
    created_at: row.created_at,
    updated_at: row.updated_at,
    attachments,
  };
}

function normalizeNote(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title || '',
    content: row.content,
    color: row.color || '',
    pinned: !!row.pinned,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function ensureDefaultCategories(userId) {
  const rows = await query(
    'SELECT id FROM categories WHERE user_id = ? LIMIT 1',
    [userId]
  );

  if (rows.length) return;

  const defaults = [
    ['Dự kiến', 'planned', '#94a3b8', 1],
    ['Công việc', 'work', '#38bdf8', 2],
    ['Cá nhân', 'personal', '#f472b6', 3],
    ['Dự án', 'project', '#a78bfa', 4],
  ];

  for (const [name, type, color, sortOrder] of defaults) {
    await query(
      `
      INSERT INTO categories (user_id, name, type, color, sort_order)
      VALUES (?, ?, ?, ?, ?)
      `,
      [userId, name, type, color, sortOrder]
    );
  }
}

async function getAttachments(userId, targetType, targetId) {
  const rows = await query(
    `
    SELECT id, user_id, target_type, target_id, file_name, file_url, mime_type, created_at
    FROM attachments
    WHERE user_id = ? AND target_type = ? AND target_id = ?
    ORDER BY created_at DESC
    `,
    [userId, targetType, targetId]
  );

  return rows.map(normalizeAttachment);
}

async function getTaskById(userId, taskId) {
  const rows = await query(
    `
    SELECT
      id, user_id, category_id, title, description,
      start_time, duration_minutes, due_at, priority,
      status, completed, completed_at, created_at, updated_at
    FROM tasks
    WHERE id = ? AND user_id = ?
    LIMIT 1
    `,
    [taskId, userId]
  );

  if (!rows.length) return null;

  const attachments = await getAttachments(userId, 'task', taskId);
  return normalizeTask(rows[0], attachments);
}

async function getEventById(userId, eventId) {
  const rows = await query(
    `
    SELECT
      id, user_id, category_id, title, description,
      start_time, duration_minutes, location, reminder_offsets,
      created_at, updated_at
    FROM events
    WHERE id = ? AND user_id = ?
    LIMIT 1
    `,
    [eventId, userId]
  );

  if (!rows.length) return null;

  const attachments = await getAttachments(userId, 'event', eventId);
  return normalizeEvent(rows[0], attachments);
}

/* AUTH */

app.post('/api/register', async (req, res) => {
  try {
    const { username, password, display_name } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Thiếu thông tin!' });
    }

    const existing = await query(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      [username]
    );

    if (existing.length) {
      return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại!' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      `
      INSERT INTO users (username, password, display_name)
      VALUES (?, ?, ?)
      `,
      [username, hashedPassword, display_name || null]
    );

    await ensureDefaultCategories(result.insertId);

    res.status(201).json({ message: 'Đăng ký thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể đăng ký tài khoản.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const rows = await query(
      'SELECT * FROM users WHERE username = ? LIMIT 1',
      [username]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Sai tên đăng nhập' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Sai mật khẩu' });
    }

    await ensureDefaultCategories(user.id);

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        display_name: user.display_name || null,
      },
      SECRET_KEY,
      { expiresIn: '1h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể đăng nhập.' });
  }
});

/* CATEGORIES */

app.get('/api/categories', authMiddleware, async (req, res) => {
  try {
    await ensureDefaultCategories(req.user.id);

    const rows = await query(
      `
      SELECT id, user_id, name, type, color, sort_order, created_at, updated_at
      FROM categories
      WHERE user_id = ?
      ORDER BY sort_order ASC, id ASC
      `,
      [req.user.id]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể tải categories.' });
  }
});

/* TASKS */

app.get('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT
        id, user_id, category_id, title, description,
        start_time, duration_minutes, due_at, priority,
        status, completed, completed_at, created_at, updated_at
      FROM tasks
      WHERE user_id = ?
      ORDER BY
        CASE WHEN due_at IS NULL THEN 1 ELSE 0 END,
        due_at ASC,
        created_at DESC
      `,
      [req.user.id]
    );

    const ids = rows.map((row) => row.id);
    let attachmentRows = [];

    if (ids.length) {
      attachmentRows = await query(
        `
        SELECT
          id, user_id, target_type, target_id, file_name, file_url, mime_type, created_at
        FROM attachments
        WHERE user_id = ?
          AND target_type = 'task'
          AND target_id IN (?)
        ORDER BY created_at DESC
        `,
        [req.user.id, ids]
      );
    }

    const attachmentMap = attachmentRows.reduce((acc, item) => {
      if (!acc[item.target_id]) acc[item.target_id] = [];
      acc[item.target_id].push(normalizeAttachment(item));
      return acc;
    }, {});

    res.json(rows.map((row) => normalizeTask(row, attachmentMap[row.id] || [])));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể tải danh sách task.' });
  }
});

app.post('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const {
      title,
      description = '',
      category_id = null,
      start_time = null,
      duration_minutes = null,
      due_at = null,
      priority = 'medium',
      completed = false,
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Tiêu đề task không được để trống.' });
    }

    const safePriority = ['low', 'medium', 'high'].includes(priority)
      ? priority
      : 'medium';

    const safeCompleted = !!completed;
    const safeStatus = safeCompleted ? 'completed' : 'pending';
    const safeCompletedAt = safeCompleted ? new Date() : null;

    const result = await query(
      `
      INSERT INTO tasks (
        user_id, category_id, title, description, start_time,
        duration_minutes, due_at, priority, status, completed, completed_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        req.user.id,
        category_id,
        String(title).trim(),
        description || '',
        start_time,
        duration_minutes,
        due_at,
        safePriority,
        safeStatus,
        safeCompleted ? 1 : 0,
        safeCompletedAt,
      ]
    );

    const task = await getTaskById(req.user.id, result.insertId);
    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể tạo task.' });
  }
});

app.get('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const task = await getTaskById(req.user.id, req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Không tìm thấy task.' });
    }

    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể tải chi tiết task.' });
  }
});

app.patch('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const existing = await getTaskById(req.user.id, req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy task.' });
    }

    const nextCompleted =
      req.body.completed !== undefined ? !!req.body.completed : existing.completed;

    const nextStatus = nextCompleted ? 'completed' : 'pending';
    const nextCompletedAt =
      req.body.completed !== undefined
        ? nextCompleted
          ? new Date()
          : null
        : existing.completed_at;

    const payload = {
      title: req.body.title !== undefined ? String(req.body.title).trim() : existing.title,
      description: req.body.description !== undefined ? req.body.description : existing.description,
      category_id: req.body.category_id !== undefined ? req.body.category_id : existing.category_id,
      start_time: req.body.start_time !== undefined ? req.body.start_time : existing.start_time,
      duration_minutes:
        req.body.duration_minutes !== undefined ? req.body.duration_minutes : existing.duration_minutes,
      due_at: req.body.due_at !== undefined ? req.body.due_at : existing.due_at,
      priority: req.body.priority !== undefined ? req.body.priority : existing.priority,
      completed: nextCompleted,
      status: nextStatus,
      completed_at: nextCompletedAt,
    };

    if (!payload.title) {
      return res.status(400).json({ error: 'Tiêu đề task không được để trống.' });
    }

    if (!['low', 'medium', 'high'].includes(payload.priority)) {
      payload.priority = 'medium';
    }

    await query(
      `
      UPDATE tasks
      SET
        category_id = ?,
        title = ?,
        description = ?,
        start_time = ?,
        duration_minutes = ?,
        due_at = ?,
        priority = ?,
        status = ?,
        completed = ?,
        completed_at = ?
      WHERE id = ? AND user_id = ?
      `,
      [
        payload.category_id,
        payload.title,
        payload.description,
        payload.start_time,
        payload.duration_minutes,
        payload.due_at,
        payload.priority,
        payload.status,
        payload.completed ? 1 : 0,
        payload.completed_at,
        req.params.id,
        req.user.id,
      ]
    );

    const task = await getTaskById(req.user.id, req.params.id);
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể cập nhật task.' });
  }
});

app.patch('/api/tasks/:id/complete', authMiddleware, async (req, res) => {
  try {
    const completed = !!req.body.completed;
    const status = completed ? 'completed' : 'pending';
    const completedAt = completed ? new Date() : null;

    await query(
      `
      UPDATE tasks
      SET completed = ?, status = ?, completed_at = ?
      WHERE id = ? AND user_id = ?
      `,
      [completed ? 1 : 0, status, completedAt, req.params.id, req.user.id]
    );

    const task = await getTaskById(req.user.id, req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Không tìm thấy task.' });
    }

    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể cập nhật trạng thái task.' });
  }
});

app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    await query(
      `DELETE FROM attachments
      WHERE user_id = ? AND target_type = 'task' AND target_id = ?`,
      [req.user.id, req.params.id]
    );

    await query(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    res.json({ message: 'Đã xóa task thành công.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể xóa task.' });
  }
});

/* EVENTS */

app.get('/api/events', authMiddleware, async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT
        id, user_id, category_id, title, description,
        start_time, duration_minutes, location, reminder_offsets, created_at, updated_at
      FROM events
      WHERE user_id = ?
      ORDER BY start_time ASC, created_at DESC
      `,
      [req.user.id]
    );

    const ids = rows.map((row) => row.id);
    let attachmentRows = [];

    if (ids.length) {
      attachmentRows = await query(
        `
        SELECT
          id, user_id, target_type, target_id, file_name, file_url, mime_type, created_at
        FROM attachments
        WHERE user_id = ?
          AND target_type = 'event'
          AND target_id IN (?)
        ORDER BY created_at DESC
        `,
        [req.user.id, ids]
      );
    }

    const attachmentMap = attachmentRows.reduce((acc, item) => {
      if (!acc[item.target_id]) acc[item.target_id] = [];
      acc[item.target_id].push(normalizeAttachment(item));
      return acc;
    }, {});

    res.json(rows.map((row) => normalizeEvent(row, attachmentMap[row.id] || [])));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể tải danh sách sự kiện.' });
  }
});

app.post('/api/events', authMiddleware, async (req, res) => {
  try {
    const {
      title,
      description = '',
      category_id = null,
      start_time,
      duration_minutes,
      location = '',
      reminder_offsets = [],
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Tên sự kiện không được để trống.' });
    }

    if (!start_time || !duration_minutes) {
      return res.status(400).json({ error: 'Thiếu thời gian bắt đầu hoặc thời lượng.' });
    }

    const safeReminderOffsets = JSON.stringify(parseReminderOffsets(reminder_offsets));

    const result = await query(
      `
      INSERT INTO events (
        user_id, category_id, title, description, start_time, duration_minutes, location, reminder_offsets
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        req.user.id,
        category_id,
        String(title).trim(),
        description || '',
        start_time,
        duration_minutes,
        location || '',
        safeReminderOffsets,
      ]
    );

    const event = await getEventById(req.user.id, result.insertId);
    res.status(201).json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể tạo sự kiện.' });
  }
});

app.get('/api/events/:id', authMiddleware, async (req, res) => {
  try {
    const event = await getEventById(req.user.id, req.params.id);

    if (!event) {
      return res.status(404).json({ error: 'Không tìm thấy sự kiện.' });
    }

    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể tải chi tiết sự kiện.' });
  }
});

app.patch('/api/events/:id', authMiddleware, async (req, res) => {
  try {
    const existing = await getEventById(req.user.id, req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy sự kiện.' });
    }

    const payload = {
      title: req.body.title !== undefined ? String(req.body.title).trim() : existing.title,
      description: req.body.description !== undefined ? req.body.description : existing.description,
      category_id: req.body.category_id !== undefined ? req.body.category_id : existing.category_id,
      start_time: req.body.start_time !== undefined ? req.body.start_time : existing.start_time,
      duration_minutes:
        req.body.duration_minutes !== undefined ? req.body.duration_minutes : existing.duration_minutes,
      location: req.body.location !== undefined ? req.body.location : existing.location,
      reminder_offsets:
        req.body.reminder_offsets !== undefined ? req.body.reminder_offsets : existing.reminder_offsets,
    };

    if (!payload.title) {
      return res.status(400).json({ error: 'Tên sự kiện không được để trống.' });
    }

    if (!payload.start_time || !payload.duration_minutes) {
      return res.status(400).json({ error: 'Thiếu thời gian bắt đầu hoặc thời lượng.' });
    }

    await query(
      `
      UPDATE events
      SET
        category_id = ?,
        title = ?,
        description = ?,
        start_time = ?,
        duration_minutes = ?,
        location = ?,
        reminder_offsets = ?
      WHERE id = ? AND user_id = ?
      `,
      [
        payload.category_id,
        payload.title,
        payload.description,
        payload.start_time,
        payload.duration_minutes,
        payload.location,
        JSON.stringify(parseReminderOffsets(payload.reminder_offsets)),
        req.params.id,
        req.user.id,
      ]
    );

    const event = await getEventById(req.user.id, req.params.id);
    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể cập nhật sự kiện.' });
  }
});

app.delete('/api/events/:id', authMiddleware, async (req, res) => {
  try {
    await query(
      `DELETE FROM attachments
      WHERE user_id = ? AND target_type = 'event' AND target_id = ?`,
      [req.user.id, req.params.id]
    );

    await query(
      'DELETE FROM events WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    res.json({ message: 'Đã xóa sự kiện thành công.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể xóa sự kiện.' });
  }
});

/* NOTES */

app.get('/api/notes', authMiddleware, async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT id, user_id, title, content, color, pinned, created_at, updated_at
      FROM notes
      WHERE user_id = ?
      ORDER BY pinned DESC, created_at DESC
      `,
      [req.user.id]
    );

    res.json(rows.map(normalizeNote));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể tải ghi chú.' });
  }
});

app.post('/api/notes', authMiddleware, async (req, res) => {
  try {
    const {
      title = '',
      content,
      color = '',
      pinned = false,
    } = req.body;

    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: 'Nội dung ghi chú không được để trống.' });
    }

    const result = await query(
      `
      INSERT INTO notes (user_id, title, content, color, pinned)
      VALUES (?, ?, ?, ?, ?)
      `,
      [req.user.id, title || '', content, color || '', pinned ? 1 : 0]
    );

    const rows = await query(
      `
      SELECT id, user_id, title, content, color, pinned, created_at, updated_at
      FROM notes
      WHERE id = ? AND user_id = ?
      LIMIT 1
      `,
      [result.insertId, req.user.id]
    );

    res.status(201).json(normalizeNote(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể tạo ghi chú.' });
  }
});

app.delete('/api/notes/:id', authMiddleware, async (req, res) => {
  try {
    await query(
      'DELETE FROM notes WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    res.json({ message: 'Đã xóa ghi chú thành công.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể xóa ghi chú.' });
  }
});

/* ATTACHMENTS */

app.post('/api/attachments/upload-base64', authMiddleware, async (req, res) => {
  try {
    const {
      target_type,
      target_id,
      file_name,
      mime_type,
      data,
    } = req.body;

    if (!['task', 'event'].includes(target_type)) {
      return res.status(400).json({ error: 'target_type không hợp lệ.' });
    }

    if (!target_id || !file_name || !data) {
      return res.status(400).json({ error: 'Thiếu dữ liệu attachment.' });
    }

    if (target_type === 'task') {
      const task = await getTaskById(req.user.id, target_id);
      if (!task) {
        return res.status(404).json({ error: 'Task không tồn tại.' });
      }
    }

    if (target_type === 'event') {
      const event = await getEventById(req.user.id, target_id);
      if (!event) {
        return res.status(404).json({ error: 'Sự kiện không tồn tại.' });
      }
    }

    const result = await query(
      `
      INSERT INTO attachments (
        user_id, target_type, target_id, file_name, file_url, mime_type
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [req.user.id, target_type, target_id, file_name, data, mime_type || null]
    );

    const rows = await query(
      `
      SELECT id, user_id, target_type, target_id, file_name, file_url, mime_type, created_at
      FROM attachments
      WHERE id = ? AND user_id = ?
      LIMIT 1
      `,
      [result.insertId, req.user.id]
    );

    res.status(201).json(normalizeAttachment(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể tải attachment lên.' });
  }
});

app.delete('/api/attachments/:id', authMiddleware, async (req, res) => {
  try {
    await query(
      'DELETE FROM attachments WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    res.json({ message: 'Đã xóa attachment thành công.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể xóa attachment.' });
  }
});

/* HEALTH */

app.get('/health', async (req, res) => {
  try {
    await query('SELECT 1 AS ok');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});