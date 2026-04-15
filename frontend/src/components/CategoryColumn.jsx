import React, { useState } from 'react';
import TaskCard from './TaskCard';

const emptyMessages = {
  planned: {
    title: 'Chưa có việc dự kiến',
    text: 'Thêm các việc bạn đang lên kế hoạch để bắt đầu tuần mới rõ ràng hơn.',
  },
  work: {
    title: 'Cột công việc đang trống',
    text: 'Bạn có thể thêm đầu việc học tập, deadline hoặc các việc cần xử lý ngay.',
  },
  personal: {
    title: 'Chưa có việc cá nhân',
    text: 'Những việc như chăm sóc bản thân, mua sắm hay việc nhà có thể nằm ở đây.',
  },
  project: {
    title: 'Chưa có task dự án',
    text: 'Hãy kéo task vào đây hoặc tạo mới để theo dõi tiến độ dự án rõ hơn.',
  },
};

function CategoryColumn({
  category,
  tasks,
  onCreateTask,
  onToggleTask,
  onDeleteTask,
  onOpenTask,
  onDropTask,
  onDragStart,
  onDragEnd,
  draggedTaskId,
  activeFilters,
}) {
  const [title, setTitle] = useState('');
  const [isDropActive, setIsDropActive] = useState(false);

  async function submitTask(e) {
    e.preventDefault();
    if (!title.trim()) return;
    await onCreateTask({ title: title.trim(), category_id: category.id, priority: 'medium' });
    setTitle('');
  }

  async function handleDrop(e) {
    e.preventDefault();
    setIsDropActive(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;
    await onDropTask(Number(taskId), category.id);
  }

  const hasFilters = Boolean(activeFilters.keyword || activeFilters.date || activeFilters.overdueOnly || activeFilters.completedOnly);
  const message = emptyMessages[category.type] || emptyMessages.planned;

  return (
    <section
      className={`panel category-panel ${isDropActive ? 'drop-active' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDropActive(true);
      }}
      onDragLeave={() => setIsDropActive(false)}
      onDrop={handleDrop}
    >
      <div className="panel-head">
        <h2>{category.name.toUpperCase()}</h2>
        <span className="count-pill">{tasks.length}</span>
      </div>

      <form className="inline-form" onSubmit={submitTask}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`+ Thêm vào ${category.name}`}
        />
        <button type="submit">+ Thêm</button>
      </form>

      <div className="drop-hint">Kéo task vào cột này để đổi category.</div>

      <div className="task-list">
        {tasks.length === 0 ? (
          <div className="empty-column-state">
            <div className="empty-icon">✨</div>
            <strong>{hasFilters ? 'Không có task khớp bộ lọc' : message.title}</strong>
            <p>{hasFilters ? 'Hãy đổi từ khóa hoặc bỏ bớt điều kiện để xem thêm dữ liệu.' : message.text}</p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={onToggleTask}
              onDelete={onDeleteTask}
              onOpen={onOpenTask}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              isDragging={draggedTaskId === task.id}
            />
          ))
        )}
      </div>
    </section>
  );
}

export default CategoryColumn;