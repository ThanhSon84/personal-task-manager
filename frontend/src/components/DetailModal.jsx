import React, { useEffect, useMemo, useState } from 'react';

const REMINDER_OPTIONS = [
  { value: 5, label: '5 phút trước' },
  { value: 10, label: '10 phút trước' },
  { value: 30, label: '30 phút trước' },
  { value: 60, label: '1 giờ trước' },
];

function toLocalInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function createTaskForm(item) {
  return {
    title: item?.title || '',
    description: item?.description || '',
    categoryid: item?.category_id || '',
    priority: item?.priority || 'medium',
    starttime: toLocalInputValue(item?.start_time),
    durationminutes: item?.duration_minutes || '',
    dueat: toLocalInputValue(item?.due_at),
    completed: Boolean(item?.completed),
  };
}

function createEventForm(item) {
  return {
    title: item?.title || '',
    description: item?.description || '',
    categoryid: item?.category_id || '',
    starttime: toLocalInputValue(item?.start_time),
    durationminutes: item?.duration_minutes || 60,
    location: item?.location || '',
    reminderOffsets: Array.isArray(item?.reminder_offsets) ? item.reminder_offsets : [],
  };
}

function AttachmentSection({ item, attachments, onUploadAttachment, onDeleteAttachment, uploading }) {
  return (
    <section className="attachment-section">
      <div className="attachment-head">
        <h4>Ảnh đính kèm</h4>
        <label className="upload-btn">
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadAttachment(item, file);
              e.target.value = '';
            }}
          />
          {uploading ? 'Đang tải ảnh...' : 'Tải ảnh lên'}
        </label>
      </div>

      {attachments.length === 0 ? (
        <p className="empty-state">Chưa có ảnh nào cho mục này.</p>
      ) : (
        <div className="attachment-grid">
          {attachments.map((attachment) => (
            <article key={attachment.id} className="attachment-card">
              <img src={attachment.file_url} alt={attachment.file_name} />
              <div className="attachment-meta">
                <span>{attachment.file_name}</span>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => onDeleteAttachment(attachment.id)}
                >
                  Xóa
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function TaskDetailForm({
  item,
  categories,
  onSave,
  onDelete,
  saving,
  onUploadAttachment,
  onDeleteAttachment,
  uploadingAttachment,
}) {
  const [form, setForm] = useState(() => createTaskForm(item));

  function submit(e) {
    e.preventDefault();
    onSave({
      title: form.title.trim(),
      description: form.description.trim() || null,
      category_id: form.categoryid ? Number(form.categoryid) : null,
      priority: form.priority,
      start_time: form.starttime || null,
      duration_minutes: form.durationminutes ? Number(form.durationminutes) : null,
      due_at: form.dueat || null,
      completed: Boolean(form.completed),
    });
  }

  return (
    <form className="detail-form" onSubmit={submit}>
      <div className="modal-grid two-col">
        <label>
          <span>Tiêu đề</span>
          <input
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            required
          />
        </label>

        <label>
          <span>Nhóm</span>
          <select
            value={form.categoryid}
            onChange={(e) => setForm((prev) => ({ ...prev, categoryid: e.target.value }))}
          >
            <option value="">Chưa phân nhóm</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        <span>Mô tả</span>
        <textarea
          rows={4}
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
        />
      </label>

      <div className="modal-grid three-col">
        <label>
          <span>Ưu tiên</span>
          <select
            value={form.priority}
            onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
          >
            <option value="low">Thấp</option>
            <option value="medium">Trung bình</option>
            <option value="high">Cao</option>
          </select>
        </label>

        <label>
          <span>Bắt đầu</span>
          <input
            type="datetime-local"
            value={form.starttime}
            onChange={(e) => setForm((prev) => ({ ...prev, starttime: e.target.value }))}
          />
        </label>

        <label>
          <span>Thời lượng (phút)</span>
          <input
            type="number"
            min={1}
            value={form.durationminutes}
            onChange={(e) => setForm((prev) => ({ ...prev, durationminutes: e.target.value }))}
          />
        </label>
      </div>

      <div className="modal-grid two-col">
        <label>
          <span>Hạn chót</span>
          <input
            type="datetime-local"
            value={form.dueat}
            onChange={(e) => setForm((prev) => ({ ...prev, dueat: e.target.value }))}
          />
        </label>

        <label className="toggle-field">
          <span>Hoàn thành</span>
          <input
            type="checkbox"
            checked={form.completed}
            onChange={(e) => setForm((prev) => ({ ...prev, completed: e.target.checked }))}
          />
        </label>
      </div>

      <AttachmentSection
        item={item}
        attachments={item.attachments || []}
        onUploadAttachment={onUploadAttachment}
        onDeleteAttachment={onDeleteAttachment}
        uploading={uploadingAttachment}
      />

      <div className="modal-meta">
        <span>Tạo lúc {new Date(item.created_at).toLocaleString('vi-VN')}</span>
        {item.overdue ? <span className="badge overdue-badge">Task đang quá hạn</span> : null}
      </div>

      <div className="modal-actions">
        <button type="button" className="ghost-btn danger" onClick={() => onDelete(item.id)}>
          Xóa task
        </button>
        <button type="submit" className="primary-btn" disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>
    </form>
  );
}

function EventDetailForm({
  item,
  categories,
  onSave,
  onDelete,
  saving,
  onUploadAttachment,
  onDeleteAttachment,
  uploadingAttachment,
}) {
  const [form, setForm] = useState(() => createEventForm(item));

  function toggleReminder(minutes) {
    setForm((prev) => ({
      ...prev,
      reminderOffsets: prev.reminderOffsets.includes(minutes)
        ? prev.reminderOffsets.filter((item) => item !== minutes)
        : [...prev.reminderOffsets, minutes].sort((a, b) => a - b),
    }));
  }

  function submit(e) {
    e.preventDefault();
    onSave({
      title: form.title.trim(),
      description: form.description.trim() || null,
      category_id: form.categoryid ? Number(form.categoryid) : null,
      start_time: form.starttime,
      duration_minutes: Number(form.durationminutes),
      location: form.location.trim() || null,
      reminder_offsets: form.reminderOffsets,
    });
  }

  return (
    <form className="detail-form" onSubmit={submit}>
      <div className="modal-grid two-col">
        <label>
          <span>Tiêu đề</span>
          <input
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            required
          />
        </label>

        <label>
          <span>Nhóm</span>
          <select
            value={form.categoryid}
            onChange={(e) => setForm((prev) => ({ ...prev, categoryid: e.target.value }))}
          >
            <option value="">Chưa phân nhóm</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        <span>Mô tả</span>
        <textarea
          rows={4}
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
        />
      </label>

      <div className="modal-grid three-col">
        <label>
          <span>Bắt đầu</span>
          <input
            type="datetime-local"
            value={form.starttime}
            onChange={(e) => setForm((prev) => ({ ...prev, starttime: e.target.value }))}
            required
          />
        </label>

        <label>
          <span>Thời lượng (phút)</span>
          <input
            type="number"
            min={1}
            value={form.durationminutes}
            onChange={(e) => setForm((prev) => ({ ...prev, durationminutes: e.target.value }))}
            required
          />
        </label>

        <label>
          <span>Địa điểm</span>
          <input
            value={form.location}
            onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
          />
        </label>
      </div>

      <div className="detail-section">
        <span className="detail-label">Mốc nhắc</span>
        <div className="chip-group">
          {REMINDER_OPTIONS.map((option) => (
            <label key={option.value} className="chip-toggle">
              <input
                type="checkbox"
                checked={form.reminderOffsets.includes(option.value)}
                onChange={() => toggleReminder(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <AttachmentSection
        item={item}
        attachments={item.attachments || []}
        onUploadAttachment={onUploadAttachment}
        onDeleteAttachment={onDeleteAttachment}
        uploading={uploadingAttachment}
      />

      <div className="modal-meta">
        <span>Tạo lúc {new Date(item.created_at).toLocaleString('vi-VN')}</span>
        <span>Cập nhật {new Date(item.updated_at).toLocaleString('vi-VN')}</span>
      </div>

      <div className="modal-actions">
        <button type="button" className="ghost-btn danger" onClick={() => onDelete(item.id)}>
          Xóa sự kiện
        </button>
        <button type="submit" className="primary-btn" disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>
    </form>
  );
}

function DetailModal({
  open,
  type,
  item,
  categories,
  onClose,
  onSaveTask,
  onDeleteTask,
  onSaveEvent,
  onDeleteEvent,
  onUploadAttachment,
  onDeleteAttachment,
  saving,
  uploadingAttachment,
}) {
  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
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
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <div>
            <p className="eyebrow">Chỉnh sửa trực tiếp</p>
            <h3>{title}</h3>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {type === 'task' ? (
          <TaskDetailForm
            key={`task-${item.id}`}
            item={item}
            categories={categories}
            onSave={onSaveTask}
            onDelete={onDeleteTask}
            saving={saving}
            onUploadAttachment={onUploadAttachment}
            onDeleteAttachment={onDeleteAttachment}
            uploadingAttachment={uploadingAttachment}
          />
        ) : (
          <EventDetailForm
            key={`event-${item.id}`}
            item={item}
            categories={categories}
            onSave={onSaveEvent}
            onDelete={onDeleteEvent}
            saving={saving}
            onUploadAttachment={onUploadAttachment}
            onDeleteAttachment={onDeleteAttachment}
            uploadingAttachment={uploadingAttachment}
          />
        )}
      </div>
    </div>
  );
}

export default DetailModal;