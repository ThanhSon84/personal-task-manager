import React, { useEffect, useMemo, useState } from 'react';

function toLocalInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function createTaskForm(item) {
  return {
    title: item?.title || '',
    description: item?.description || '',
    category_id: item?.category_id ?? '',
    priority: item?.priority || 'medium',
    start_time: toLocalInputValue(item?.start_time),
    duration_minutes: item?.duration_minutes ?? '',
    due_at: toLocalInputValue(item?.due_at),
    completed: Boolean(item?.completed),
  };
}

function createEventForm(item) {
  return {
    title: item?.title || '',
    description: item?.description || '',
    category_id: item?.category_id ?? '',
    start_time: toLocalInputValue(item?.start_time),
    duration_minutes: item?.duration_minutes ?? 60,
    location: item?.location || '',
  };
}

function TaskDetailForm({ item, categories, onSave, onDelete, saving }) {
  const [form, setForm] = useState(createTaskForm(item));

  useEffect(() => setForm(createTaskForm(item)), [item]);

  const submit = (e) => {
    e.preventDefault();
    onSave({
      title: form.title.trim(),
      description: form.description.trim(),
      category_id: form.category_id ? Number(form.category_id) : null,
      priority: form.priority,
      start_time: form.start_time || null,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      due_at: form.due_at || null,
      completed: Boolean(form.completed),
    });
  };

  return (
    <form className="detail-form" onSubmit={submit}>
      <div className="modal-grid two-col">
        <label><span>Tiêu đề</span><input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} required /></label>
        <label>
          <span>Nhóm</span>
          <select value={form.category_id} onChange={(e) => setForm((prev) => ({ ...prev, category_id: e.target.value }))}>
            <option value="">Chưa phân nhóm</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
      </div>

      <label><span>Mô tả</span><textarea rows="4" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} /></label>

      <div className="modal-grid three-col">
        <label>
          <span>Ưu tiên</span>
          <select value={form.priority} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}>
            <option value="low">Thấp</option>
            <option value="medium">Trung bình</option>
            <option value="high">Cao</option>
          </select>
        </label>
        <label><span>Bắt đầu</span><input type="datetime-local" value={form.start_time} onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))} /></label>
        <label><span>Thời lượng phút</span><input type="number" min="1" value={form.duration_minutes} onChange={(e) => setForm((prev) => ({ ...prev, duration_minutes: e.target.value }))} /></label>
      </div>

      <div className="modal-grid two-col">
        <label><span>Hạn chót</span><input type="datetime-local" value={form.due_at} onChange={(e) => setForm((prev) => ({ ...prev, due_at: e.target.value }))} /></label>
        <label className="toggle-field"><span>Hoàn thành</span><input type="checkbox" checked={form.completed} onChange={(e) => setForm((prev) => ({ ...prev, completed: e.target.checked }))} /></label>
      </div>

      <div className="modal-meta">
        <span>Tạo lúc {new Date(item.created_at).toLocaleString('vi-VN')}</span>
        {item.overdue ? <span className="badge overdue-badge">Task đang quá hạn</span> : null}
      </div>

      <div className="modal-actions">
        <button type="button" className="ghost-btn danger" onClick={() => onDelete(item.id)}>Xóa task</button>
        <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
      </div>
    </form>
  );
}

function EventDetailForm({ item, categories, onSave, onDelete, saving }) {
  const [form, setForm] = useState(createEventForm(item));

  useEffect(() => setForm(createEventForm(item)), [item]);

  const submit = (e) => {
    e.preventDefault();
    onSave({
      title: form.title.trim(),
      description: form.description.trim(),
      category_id: form.category_id ? Number(form.category_id) : null,
      start_time: form.start_time,
      duration_minutes: Number(form.duration_minutes) || 60,
      location: form.location.trim(),
    });
  };

  return (
    <form className="detail-form" onSubmit={submit}>
      <div className="modal-grid two-col">
        <label><span>Tiêu đề</span><input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} required /></label>
        <label>
          <span>Nhóm</span>
          <select value={form.category_id} onChange={(e) => setForm((prev) => ({ ...prev, category_id: e.target.value }))}>
            <option value="">Chưa phân nhóm</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
      </div>

      <label><span>Mô tả</span><textarea rows="4" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} /></label>

      <div className="modal-grid three-col">
        <label><span>Bắt đầu</span><input type="datetime-local" value={form.start_time} onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))} required /></label>
        <label><span>Thời lượng phút</span><input type="number" min="1" value={form.duration_minutes} onChange={(e) => setForm((prev) => ({ ...prev, duration_minutes: e.target.value }))} required /></label>
        <label><span>Địa điểm</span><input value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} /></label>
      </div>

      <div className="modal-meta">
        <span>Tạo lúc {new Date(item.created_at).toLocaleString('vi-VN')}</span>
        <span>Cập nhật {new Date(item.updated_at).toLocaleString('vi-VN')}</span>
      </div>

      <div className="modal-actions">
        <button type="button" className="ghost-btn danger" onClick={() => onDelete(item.id)}>Xóa sự kiện</button>
        <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
      </div>
    </form>
  );
}

export default function DetailModal({ open, type, item, categories, onClose, onSaveTask, onDeleteTask, onSaveEvent, onDeleteEvent, saving }) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const title = useMemo(() => {
    if (type === 'task') return 'Chi tiết task';
    if (type === 'event') return 'Chi tiết sự kiện';
    return 'Chi tiết';
  }, [type]);

  if (!open || !item) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">Chỉnh sửa trực tiếp</p>
            <h3>{title}</h3>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>×</button>
        </div>

        {type === 'task' ? (
          <TaskDetailForm item={item} categories={categories} onSave={onSaveTask} onDelete={onDeleteTask} saving={saving} />
        ) : (
          <EventDetailForm item={item} categories={categories} onSave={onSaveEvent} onDelete={onDeleteEvent} saving={saving} />
        )}
      </div>
    </div>
  );
}
