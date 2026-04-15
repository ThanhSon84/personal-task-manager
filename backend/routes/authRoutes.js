const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { username, password, display_name } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Thiếu username hoặc password!' });
    }

    const existing = await query('SELECT id FROM users WHERE username = ?', [username.trim()]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username đã tồn tại!' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (username, password, display_name) VALUES (?, ?, ?)',
      [username.trim(), hashedPassword, display_name || null]
    );

    return res.status(201).json({
      message: 'Đăng ký thành công',
      user: {
        id: result.insertId,
        username: username.trim(),
        display_name: display_name || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi hệ thống khi đăng ký', detail: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Thiếu username hoặc password!' });
    }

    const users = await query('SELECT * FROM users WHERE username = ?', [username.trim()]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu!' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu!' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || 'secret_key_cua_son',
      { expiresIn: '1h' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi hệ thống khi đăng nhập', detail: error.message });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const users = await query(
      'SELECT id, username, display_name, created_at, updated_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng!' });
    }

    return res.json(users[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Không thể lấy thông tin người dùng', detail: error.message });
  }
});

module.exports = router;