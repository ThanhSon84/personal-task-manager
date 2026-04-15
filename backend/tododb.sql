CREATE DATABASE IF NOT EXISTS tododb
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE tododb;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  display_name VARCHAR(150) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  type ENUM('planned', 'work', 'personal', 'project') NOT NULL,
  color VARCHAR(20) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_categories_user_sort (user_id, sort_order),
  CONSTRAINT fk_categories_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tasks (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  start_time DATETIME NULL,
  duration_minutes INT NULL,
  due_at DATETIME NULL,
  priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  completed TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tasks_user_due (user_id, due_at),
  KEY idx_tasks_user_category (user_id, category_id),
  CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_tasks_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_tasks_duration_minutes CHECK (duration_minutes IS NULL OR duration_minutes > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE events (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  start_time DATETIME NOT NULL,
  duration_minutes INT NOT NULL,
  location VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_events_user_start (user_id, start_time),
  KEY idx_events_user_category (user_id, category_id),
  CONSTRAINT fk_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_events_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_events_duration_minutes CHECK (duration_minutes > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO users (id, username, password, display_name)
VALUES (1, 'sondemo', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHi9pG4A8GdGQ8K/uxMxDPZWS9Vyuk3e', 'Sơn Demo');

INSERT INTO categories (id, user_id, name, type, color, sort_order)
VALUES
  (1, 1, 'Dự kiến', 'planned', '#8b5cf6', 1),
  (2, 1, 'Công việc', 'work', '#2563eb', 2),
  (3, 1, 'Cá nhân', 'personal', '#16a34a', 3),
  (4, 1, 'Dự án', 'project', '#f59e0b', 4);

INSERT INTO tasks (id, user_id, category_id, title, description, start_time, duration_minutes, due_at, priority, completed)
VALUES
  (1, 1, 1, 'Chuẩn bị kế hoạch tuần mới', 'Tổng hợp công việc cho 7 ngày tới.', DATE_ADD(NOW(), INTERVAL 2 HOUR), 60, DATE_ADD(NOW(), INTERVAL 3 HOUR), 'medium', 0),
  (2, 1, 2, 'Hoàn thành báo cáo giữa kỳ', 'Rà soát nội dung và nộp bản cuối.', DATE_SUB(NOW(), INTERVAL 1 DAY), 120, DATE_SUB(NOW(), INTERVAL 22 HOUR), 'high', 1),
  (3, 1, 3, 'Đi siêu thị', 'Mua đồ dùng cá nhân.', DATE_SUB(NOW(), INTERVAL 5 HOUR), 90, DATE_SUB(NOW(), INTERVAL 3 HOUR), 'low', 0),
  (4, 1, 4, 'Thiết kế wireframe dashboard', 'Hoàn thiện layout demo.', DATE_ADD(NOW(), INTERVAL 1 DAY), 180, DATE_ADD(NOW(), INTERVAL 1 DAY) + INTERVAL 3 HOUR, 'high', 0);

INSERT INTO events (id, user_id, category_id, title, description, start_time, duration_minutes, location)
VALUES
  (1, 1, 2, 'Họp nhóm đồ án', 'Trao đổi tiến độ backend và frontend.', DATE_ADD(NOW(), INTERVAL 1 DAY), 90, 'Phòng tự học A2'),
  (2, 1, 3, 'Khám răng định kỳ', 'Lịch hẹn nha khoa cá nhân.', DATE_ADD(NOW(), INTERVAL 3 DAY), 45, 'Nha khoa Quận 10'),
  (3, 1, 4, 'Demo thử giao diện', 'Nhờ bạn bè góp ý trước khi nộp.', DATE_ADD(NOW(), INTERVAL 5 DAY), 60, 'Google Meet / Offline');
