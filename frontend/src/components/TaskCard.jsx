import React from 'react';

function TaskCard({ task, onToggle, onDelete, onOpen, onDragStart, onDragEnd, isDragging }) {
  function handleOpen() {
    onOpen(task);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(task);
    }
  }

  function handleDragStart(e) {
    e.stopPropagation();
    onDragStart(e, task);
  }

  function handleDelete(e) {
    e.stopPropagation();
    onDelete(task.id);
  }

  return (
    <div
      className={`task-card ${task.completed ? 'done' : ''} ${task.overdue ? 'overdue' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={handleOpen}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="task-card-head">
        <label className="task-checkbox" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={Boolean(task.completed)}
            onChange={(e) => onToggle(task.id, e.target.checked)}
          />
          <span>{task.title}</span>
        </label>

        <div className="task-actions">
          <button
            type="button"
            className="drag-handle"
            draggable
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
            onClick={(e) => e.stopPropagation()}
            aria-label="Kéo thả task"
            title="Kéo để đổi category"
          >
            ⋮⋮
          </button>

          <button
            type="button"
            className="icon-btn"
            onClick={handleDelete}
            aria-label="Xóa task"
          >
            ×
          </button>
        </div>
      </div>

      {task.description ? <p className="task-description">{task.description}</p> : null}

      <div className="meta-row">
        <span className={`badge priority-${task.priority || 'medium'}`}>
          {task.priority || 'medium'}
        </span>
        {task.overdue ? <span className="badge overdue-badge">Quá hạn</span> : null}
        {task.completed ? <span className="badge success-badge">Đã xong</span> : null}
      </div>

      <div className="task-time">
        {task.starttime ? (
          <span>Bắt đầu: {new Date(task.starttime).toLocaleString('vi-VN')}</span>
        ) : null}
        {task.dueat ? (
          <span>Hạn: {new Date(task.dueat).toLocaleString('vi-VN')}</span>
        ) : null}
      </div>
    </div>
  );
}

export default TaskCard;