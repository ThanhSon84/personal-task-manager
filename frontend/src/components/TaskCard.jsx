import React from 'react';

function TaskCard({ task, onToggle, onDelete, onOpen, onDragStart, onDragEnd, isDragging }) {
  return (
    <div
      className={`task-card ${task.completed ? 'done' : ''} ${task.overdue ? 'overdue' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={() => onOpen(task)}
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(task);
        }
      }}
    >
      <div className="task-card-head">
        <label
          className="task-checkbox"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={Boolean(task.completed)}
            onChange={(e) => onToggle(task.id, e.target.checked)}
          />
          <span>{task.title}</span>
        </label>
        <button
          className="icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
        >
          ✕
        </button>
      </div>

      {task.description ? <p className="task-description">{task.description}</p> : null}

      <div className="meta-row">
        <span className={`badge priority-${task.priority || 'medium'}`}>{task.priority || 'medium'}</span>
        {task.overdue ? <span className="badge overdue-badge">Quá hạn</span> : null}
        {task.completed ? <span className="badge success-badge">Đã xong</span> : null}
      </div>

      <div className="task-time">
        {task.start_time ? <span>Bắt đầu: {new Date(task.start_time).toLocaleString('vi-VN')}</span> : null}
        {task.due_at ? <span>Hạn: {new Date(task.due_at).toLocaleString('vi-VN')}</span> : null}
      </div>
    </div>
  );
}

export default TaskCard;