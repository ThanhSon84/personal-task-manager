const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '5mb' }));
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

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

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

function normalizeTask(row) {
  const overdue = !!row.due_at && !row.completed && new Date(row.due_at).getTime() < Date.now();
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
    completed: !!row.completed,
    overdue,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeEvent(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    category_id: row.category_id,
    title: row.title,
    description: row.description || '',
    start_time: row.start_time,
    duration_minutes: row.duration_minutes,
    location: row.location || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function ensureDefaultCategories(userId) {
  const rows = await query('SELECT id FROM categories WHERE user_id = ? LIMIT 1', [userId]);
  if (rows.length) return;

  const defaults = [
    ['Dự kiến', 'planned', '#94a3b8', 1],
    ['Công việc', 'work', '#38bdf8', 2],
    ['Cá nhân', 'personal', '#f472b6', 3],
    ['Dự án', 'project', '#a78bfa', 4],
  ];

  for (const [name, type, color, sortOrder] of defaults) {
    await query(
      'INSERT INTO categories (user_id, name, type, color, sort_order) VALUES (?, ?, ?, ?, ?)',
      [userId, name, type, color, sortOrder]
    );
  }
}

async function getTaskById(userId, taskId) {
  const rows = await query(
    `SELECT id, user_id, category_id, title, description, start_time, duration_minutes, due_at, priority, completed, created_at, updated_at
     FROM tasks WHERE id = ? AND user_id = ? LIMIT 1`,
    [taskId, userId]
  );
  if (!rows.length) return null;
  return normalizeTask(rows[0]);
}

async function getEventById(userId, eventId) {
  const rows = await query(
    `SELECT id, user_id, category_id, title, description, start_time, duration_minutes, location, created_at, updated_at
     FROM events WHERE id = ? AND user_id = ? LIMIT 1`,
    [eventId, userId]
  );
  if (!rows.length) return null;
  return normalizeEvent(rows[0]);
}

app.post('/api/register', async (req, res) => {
  try {
    const { username, password, display_name } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Thiếu thông tin!' });
    }

    const existing = await query('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
    if (existing.length) {
      return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại!' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await query('INSERT INTO users (username, password, display_name) VALUES (?, ?, ?)', [username, hashedPassword, display_name || null]);
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
    const rows = await query('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
    if (!rows.length) {
      return res.status(401).json({ error: 'Sai tên đăng nhập' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Sai mật khẩu' });
    }

    await ensureDefaultCategories(user.id);

    const token = jwt.sign({ id: user.id, username: user.username, display_name: user.display_name || null }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, username: user.username, display_name: user.display_name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể đăng nhập.' });
  }
});

app.get('/api/categories', authMiddleware, async (req, res) => {
  try {
    await ensureDefaultCategories(req.user.id);
    const rows = await query(
      'SELECT id, user_id, name, type, color, sort_order, created_at, updated_at FROM categories WHERE user_id = ? ORDER BY sort_order ASC, id ASC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể tải categories.' });
  }
});

app.get('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, user_id, category_id, title, description, start_time, duration_minutes, due_at, priority, completed, created_at, updated_at
       FROM tasks WHERE user_id = ?
       ORDER BY CASE WHEN due_at IS NULL THEN 1 ELSE 0 END, due_at ASC, created_at DESC`,
      [req.user.id]
    );
    res.json(rows.map(normalizeTask));
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

    const safePriority = ['low', 'medium', 'high'].includes(priority) ? priority : 'medium';
    const result = await query(
      `INSERT INTO tasks (user_id, category_id, title, description, start_time, duration_minutes, due_at, priority, completed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, category_id, String(title).trim(), description || '', start_time, duration_minutes, due_at, safePriority, completed ? 1 : 0]
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
    if (!task) return res.status(404).json({ error: 'Không tìm thấy task.' });
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể tải chi tiết task.' });
  }
});

app.patch('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const existing = await getTaskById(req.user.id, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy task.' });

    const payload = {
      title: req.body.title !== undefined ? String(req.body.title).trim() : existing.title,
      description: req.body.description !== undefined ? req.body.description : existing.description,
      category_id: req.body.category_id !== undefined ? req.body.category_id : existing.category_id,
      start_time: req.body.start_time !== undefined ? req.body.start_time : existing.start_time,
      duration_minutes: req.body.duration_minutes !== undefined ? req.body.duration_minutes : existing.duration_minutes,
      due_at: req.body.due_at !== undefined ? req.body.due_at : existing.due_at,
      priority: req.body.priority !== undefined ? req.body.priority : existing.priority,
      completed: req.body.completed !== undefined ? !!req.body.completed : existing.completed,
    };

    if (!payload.title) {
      return res.status(400).json({ error: 'Tiêu đề task không được để trống.' });
    }

    await query(
      `UPDATE tasks
       SET category_id = ?, title = ?, description = ?, start_time = ?, duration_minutes = ?, due_at = ?, priority = ?, completed = ?
       WHERE id = ? AND user_id = ?`,
      [payload.category_id, payload.title, payload.description, payload.start_time, payload.duration_minutes, payload.due_at, payload.priority, payload.completed ? 1 : 0, req.params.id, req.user.id]
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
    await query('UPDATE tasks SET completed = ? WHERE id = ? AND user_id = ?', [completed ? 1 : 0, req.params.id, req.user.id]);
    const task = await getTaskById(req.user.id, req.params.id);
    if (!task) return res.status(404).json({ error: 'Không tìm thấy task.' });
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể cập nhật trạng thái task.' });
  }
});

app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    await query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Đã xóa task thành công.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể xóa task.' });
  }
});

app.get('/api/events', authMiddleware, async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, user_id, category_id, title, description, start_time, duration_minutes, location, created_at, updated_at
       FROM events WHERE user_id = ? ORDER BY start_time ASC, created_at DESC`,
      [req.user.id]
    );
    res.json(rows.map(normalizeEvent));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể tải danh sách sự kiện.' });
  }
});

app.post('/api/events', authMiddleware, async (req, res) => {
  try {
    const { title, description = '', category_id = null, start_time, duration_minutes, location = '' } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Tên sự kiện không được để trống.' });
    }
    if (!start_time || !duration_minutes) {
      return res.status(400).json({ error: 'Thiếu thời gian bắt đầu hoặc thời lượng.' });
    }

    const result = await query(
      `INSERT INTO events (user_id, category_id, title, description, start_time, duration_minutes, location)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, category_id, String(title).trim(), description || '', start_time, duration_minutes, location || '']
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
    if (!event) return res.status(404).json({ error: 'Không tìm thấy sự kiện.' });
    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể tải chi tiết sự kiện.' });
  }
});

app.patch('/api/events/:id', authMiddleware, async (req, res) => {
  try {
    const existing = await getEventById(req.user.id, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy sự kiện.' });

    const payload = {
      title: req.body.title !== undefined ? String(req.body.title).trim() : existing.title,
      description: req.body.description !== undefined ? req.body.description : existing.description,
      category_id: req.body.category_id !== undefined ? req.body.category_id : existing.category_id,
      start_time: req.body.start_time !== undefined ? req.body.start_time : existing.start_time,
      duration_minutes: req.body.duration_minutes !== undefined ? req.body.duration_minutes : existing.duration_minutes,
      location: req.body.location !== undefined ? req.body.location : existing.location,
    };

    if (!payload.title) {
      return res.status(400).json({ error: 'Tên sự kiện không được để trống.' });
    }
    if (!payload.start_time || !payload.duration_minutes) {
      return res.status(400).json({ error: 'Thiếu thời gian bắt đầu hoặc thời lượng.' });
    }

    await query(
      `UPDATE events
       SET category_id = ?, title = ?, description = ?, start_time = ?, duration_minutes = ?, location = ?
       WHERE id = ? AND user_id = ?`,
      [payload.category_id, payload.title, payload.description, payload.start_time, payload.duration_minutes, payload.location, req.params.id, req.user.id]
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
    await query('DELETE FROM events WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Đã xóa sự kiện thành công.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể xóa sự kiện.' });
  }
});

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
