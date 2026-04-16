import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './lib/api';
import HeaderBar from './components/HeaderBar';
import CategoryColumn from './components/CategoryColumn';
import NotesPanel from './components/NotesPanel';
import FilterBar from './components/FilterBar';
import DashboardCategoryStats from './components/DashboardCategoryStats';
import ToastStack from './components/ToastStack';
import WeeklyMonthlyCalendar from './WeeklyMonthlyCalendar';
import './app.css';

const fallbackCategories = [
  { id: 1, name: 'Dự kiến', type: 'planned', sort_order: 1 },
  { id: 2, name: 'Công việc', type: 'work', sort_order: 2 },
  { id: 3, name: 'Cá nhân', type: 'personal', sort_order: 3 },
  { id: 4, name: 'Dự án', type: 'project', sort_order: 4 },
];

const priorityRank = {
  high: 3,
  medium: 2,
  low: 1,
};

const reminderOptions = [
  { value: 5, label: '5 phút trước' },
  { value: 10, label: '10 phút trước' },
  { value: 30, label: '30 phút trước' },
  { value: 60, label: '1 giờ trước' },
];

function isSameDate(value, selectedDate) {
  if (!value || !selectedDate) return false;
  const a = new Date(value);
  const b = new Date(selectedDate);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getTaskSortValue(task) {
  return new Date(task.due_at || task.start_time || '2999-12-31T00:00:00').getTime();
}

function toDateKey(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toTimeLabel(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeReminderOffsets(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item >= 0)
  )].sort((a, b) => a - b);
}

function prevTaskAttachments(tasks, id, nextAttachments) {
  if (Array.isArray(nextAttachments)) return nextAttachments;
  return tasks.find((task) => task.id === id)?.attachments || [];
}

function prevEventAttachments(events, id, nextAttachments) {
  if (Array.isArray(nextAttachments)) return nextAttachments;
  return events.find((event) => event.id === id)?.attachments || [];
}

function normalizeTask(item) {
  return {
    id: item.id,
    title: item.title || 'Task không có tiêu đề',
    description: item.description || '',
    category_id: item.category_id ?? 1,
    priority: item.priority || 'medium',
    start_time: item.start_time || null,
    duration_minutes: item.duration_minutes ?? null,
    due_at: item.due_at || null,
    completed: !!item.completed,
    overdue: !!item.overdue,
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
    attachments: Array.isArray(item.attachments) ? item.attachments : [],
  };
}

function normalizeEvent(item) {
  return {
    ...item,
    reminder_offsets: normalizeReminderOffsets(item.reminder_offsets),
    attachments: Array.isArray(item.attachments) ? item.attachments : [],
  };
}

function createInitialEventForm(categories) {
  return {
    title: '',
    description: '',
    category_id: categories[0]?.id || 1,
    start_time: '',
    duration_minutes: 60,
    location: '',
    reminder_offsets: [5],
  };
}

function toLocalInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function createTaskForm(item) {
  return {
    title: item?.title || '',
    description: item?.description || '',
    category_id: item?.category_id || '',
    priority: item?.priority || 'medium',
    start_time: toLocalInputValue(item?.start_time),
    duration_minutes: item?.duration_minutes || '',
    due_at: toLocalInputValue(item?.due_at),
    completed: Boolean(item?.completed),
  };
}

function createEventForm(item) {
  return {
    title: item?.title || '',
    description: item?.description || '',
    category_id: item?.category_id || '',
    start_time: toLocalInputValue(item?.start_time),
    duration_minutes: item?.duration_minutes || 60,
    location: item?.location || '',
    reminder_offsets: normalizeReminderOffsets(item?.reminder_offsets?.length ? item.reminder_offsets : [5]),
  };
}

function EventsPanel({ events, categories, onCreateEvent, onOpenEvent }) {
  const [form, setForm] = useState(() => createInitialEventForm(categories));
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    setForm((prev) => {
      if (prev.category_id) return prev;
      return { ...prev, category_id: categories[0]?.id || 1 };
    });
  }, [categories]);

  const filteredEvents = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return [...events]
      .filter((event) => {
        if (!q) return true;
        const haystack = `${event.title || ''} ${event.description || ''} ${event.location || ''}`.toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  }, [events, keyword]);

  function toggleReminder(offset) {
    setForm((prev) => ({
      ...prev,
      reminder_offsets: prev.reminder_offsets.includes(offset)
        ? prev.reminder_offsets.filter((item) => item !== offset)
        : [...prev.reminder_offsets, offset].sort((a, b) => a - b),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.start_time) return;

    await onCreateEvent({
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      category_id: Number(form.category_id),
      duration_minutes: Number(form.duration_minutes),
      location: form.location.trim(),
      reminder_offsets: normalizeReminderOffsets(form.reminder_offsets),
    });

    setForm(createInitialEventForm(categories));
  }

  return (
    <section className="panel">
      <div className="panel-head compact">
        <h2>SỰ KIỆN</h2>
        <span className="count-pill">{filteredEvents.length}</span>
      </div>

      <form className="note-form" onSubmit={handleSubmit}>
        <input
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Tên sự kiện"
        />

        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Mô tả ngắn"
        />

        <div className="modal-grid two-col">
          <select
            value={form.category_id}
            onChange={(e) => setForm((prev) => ({ ...prev, category_id: e.target.value }))}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
            placeholder="Địa điểm"
          />
        </div>

        <div className="modal-grid two-col">
          <input
            type="datetime-local"
            value={form.start_time}
            onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
          />

          <input
            type="number"
            min={15}
            value={form.duration_minutes}
            onChange={(e) => setForm((prev) => ({ ...prev, duration_minutes: e.target.value }))}
            placeholder="Thời lượng phút"
          />
        </div>

        <div className="reminder-picker">
          <span className="reminder-title">Mốc nhắc</span>
          <div className="reminder-grid">
            {reminderOptions.map((option) => (
              <label key={option.value} className="toggle-chip">
                <input
                  type="checkbox"
                  checked={form.reminder_offsets.includes(option.value)}
                  onChange={() => toggleReminder(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <button type="submit">Tạo sự kiện</button>
      </form>

      <label className="event-search-field">
        <span>Tìm sự kiện</span>
        <input
          type="text"
          value={keyword}
          placeholder="Tìm theo tên, mô tả hoặc địa điểm..."
          onChange={(e) => setKeyword(e.target.value)}
        />
      </label>

      <div className="event-list">
        {filteredEvents.length === 0 ? (
          <div className="empty-column-state compact-empty-state">
            <div className="empty-icon">✨</div>
            <strong>Chưa có sự kiện phù hợp</strong>
            <p>Thử từ khóa khác hoặc tạo một sự kiện mới để kiểm tra lịch tuần/tháng.</p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <article
              key={event.id}
              className="event-card clickable-card"
              onClick={() => onOpenEvent(event)}
            >
              <div className="note-head">
                <strong>{event.title}</strong>
                <span className="event-dot">EVENT</span>
              </div>

              {event.description ? <p>{event.description}</p> : null}

              <div className="task-time">
                <span>{new Date(event.start_time).toLocaleString('vi-VN')}</span>
                <span>{event.duration_minutes} phút</span>
                {event.location ? <span>{event.location}</span> : null}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
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
              <img
                src={attachment.file_url || attachment.fileUrl}
                alt={attachment.file_name || attachment.fileName}
              />
              <div className="attachment-meta">
                <span>{attachment.file_name || attachment.fileName}</span>
                <button type="button" className="icon-btn" onClick={() => onDeleteAttachment(attachment.id)}>
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

function TaskDetailForm({ item, categories, onSave, onDelete, saving, onUploadAttachment, onDeleteAttachment, uploadingAttachment }) {
  const [form, setForm] = useState(() => createTaskForm(item));

  function submit(e) {
    e.preventDefault();
    onSave({
      title: form.title.trim(),
      description: form.description.trim() || null,
      category_id: form.category_id ? Number(form.category_id) : null,
      priority: form.priority,
      start_time: form.start_time || null,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      due_at: form.due_at || null,
      completed: Boolean(form.completed),
    });
  }

  return (
    <form className="detail-form" onSubmit={submit}>
      <div className="modal-grid two-col">
        <label>
          <span>Tiêu đề</span>
          <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} required />
        </label>

        <label>
          <span>Nhóm</span>
          <select value={form.category_id} onChange={(e) => setForm((prev) => ({ ...prev, category_id: e.target.value }))}>
            <option value="">Chưa phân nhóm</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
      </div>

      <label>
        <span>Mô tả</span>
        <textarea rows={4} value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
      </label>

      <div className="modal-grid three-col">
        <label>
          <span>Ưu tiên</span>
          <select value={form.priority} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}>
            <option value="low">Thấp</option>
            <option value="medium">Trung bình</option>
            <option value="high">Cao</option>
          </select>
        </label>

        <label>
          <span>Bắt đầu</span>
          <input type="datetime-local" value={form.start_time} onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))} />
        </label>

        <label>
          <span>Thời lượng phút</span>
          <input type="number" min={1} value={form.duration_minutes} onChange={(e) => setForm((prev) => ({ ...prev, duration_minutes: e.target.value }))} />
        </label>
      </div>

      <div className="modal-grid two-col">
        <label>
          <span>Hạn chót</span>
          <input type="datetime-local" value={form.due_at} onChange={(e) => setForm((prev) => ({ ...prev, due_at: e.target.value }))} />
        </label>

        <label className="toggle-field">
          <span>Hoàn thành</span>
          <input type="checkbox" checked={form.completed} onChange={(e) => setForm((prev) => ({ ...prev, completed: e.target.checked }))} />
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
        {item.created_at ? <span>Tạo lúc {new Date(item.created_at).toLocaleString('vi-VN')}</span> : null}
        {item.overdue ? <span className="badge overdue-badge">Task đang quá hạn</span> : null}
      </div>

      <div className="modal-actions">
        <button type="button" className="ghost-btn danger" onClick={() => onDelete(item.id)}>Xóa task</button>
        <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
      </div>
    </form>
  );
}

function EventDetailForm({ item, categories, onSave, onDelete, saving, onUploadAttachment, onDeleteAttachment, uploadingAttachment }) {
  const [form, setForm] = useState(() => createEventForm(item));

  function toggleReminder(offset) {
    setForm((prev) => ({
      ...prev,
      reminder_offsets: prev.reminder_offsets.includes(offset)
        ? prev.reminder_offsets.filter((value) => value !== offset)
        : [...prev.reminder_offsets, offset].sort((a, b) => a - b),
    }));
  }

  function submit(e) {
    e.preventDefault();
    onSave({
      title: form.title.trim(),
      description: form.description.trim() || null,
      category_id: form.category_id ? Number(form.category_id) : null,
      start_time: form.start_time,
      duration_minutes: Number(form.duration_minutes),
      location: form.location.trim() || null,
      reminder_offsets: normalizeReminderOffsets(form.reminder_offsets),
    });
  }

  return (
    <form className="detail-form" onSubmit={submit}>
      <div className="modal-grid two-col">
        <label>
          <span>Tiêu đề</span>
          <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} required />
        </label>

        <label>
          <span>Nhóm</span>
          <select value={form.category_id} onChange={(e) => setForm((prev) => ({ ...prev, category_id: e.target.value }))}>
            <option value="">Chưa phân nhóm</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
      </div>

      <label>
        <span>Mô tả</span>
        <textarea rows={4} value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
      </label>

      <div className="modal-grid three-col">
        <label>
          <span>Bắt đầu</span>
          <input type="datetime-local" value={form.start_time} onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))} required />
        </label>

        <label>
          <span>Thời lượng phút</span>
          <input type="number" min={1} value={form.duration_minutes} onChange={(e) => setForm((prev) => ({ ...prev, duration_minutes: e.target.value }))} required />
        </label>

        <label>
          <span>Địa điểm</span>
          <input value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} />
        </label>
      </div>

      <div className="reminder-picker">
        <span className="reminder-title">Mốc nhắc</span>
        <div className="reminder-grid">
          {reminderOptions.map((option) => (
            <label key={option.value} className="toggle-chip">
              <input
                type="checkbox"
                checked={form.reminder_offsets.includes(option.value)}
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
        {item.created_at ? <span>Tạo lúc {new Date(item.created_at).toLocaleString('vi-VN')}</span> : null}
        {item.updated_at ? <span>Cập nhật {new Date(item.updated_at).toLocaleString('vi-VN')}</span> : null}
      </div>

      <div className="modal-actions">
        <button type="button" className="ghost-btn danger" onClick={() => onDelete(item.id)}>Xóa sự kiện</button>
        <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
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
      <div className="modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">Chỉnh sửa trực tiếp</p>
            <h3>{title}</h3>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>✕</button>
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

function Todo() {
  const navigate = useNavigate();
  const toastIdRef = useRef(0);
  const notifiedReminderRef = useRef(new Set());

  const [categories, setCategories] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [modal, setModal] = useState({ open: false, type: null, item: null });
  const [savingModal, setSavingModal] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [filters, setFilters] = useState({
    keyword: '',
    date: '',
    sortBy: 'due_asc',
    overdueOnly: false,
    completedOnly: false,
  });

  function pushToast(title, message = '', type = 'success') {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 2600);
  }

  async function ensureNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [categoriesRes, tasksRes, eventsRes, notesRes] = await Promise.all([
        api.get('/api/categories').catch(() => ({ data: [] })),
        api.get('/api/tasks'),
        api.get('/api/events'),
        api.get('/api/notes'),
      ]);

      const loadedCategories = Array.isArray(categoriesRes.data) && categoriesRes.data.length
        ? categoriesRes.data
        : fallbackCategories;

      setCategories(
        [...loadedCategories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      );
      setTasks((Array.isArray(tasksRes.data) ? tasksRes.data : []).map(normalizeTask));
      setEvents(
        (Array.isArray(eventsRes.data) ? eventsRes.data : [])
          .map(normalizeEvent)
          .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
      );
      setNotes(Array.isArray(notesRes.data) ? notesRes.data : []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Không thể tải dữ liệu.');
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }
    loadAll();
  }, [navigate, loadAll]);

  useEffect(() => {
    ensureNotificationPermission().catch(() => false);
  }, []);

  useEffect(() => {
    const validKeys = new Set();
    events.forEach((event) => {
      const startMs = new Date(event.start_time).getTime();
      if (Number.isNaN(startMs)) return;
      (event.reminder_offsets || []).forEach((offset) => {
        validKeys.add(`${event.id}-${offset}-${startMs}`);
      });
    });
    notifiedReminderRef.current = new Set(
      [...notifiedReminderRef.current].filter((key) => validKeys.has(key))
    );
  }, [events]);

  useEffect(() => {
    const intervalId = window.setInterval(async () => {
      const now = Date.now();

      for (const event of events) {
        const startMs = new Date(event.start_time).getTime();
        if (Number.isNaN(startMs)) continue;

        for (const offset of event.reminder_offsets || []) {
          const triggerMs = startMs - offset * 60 * 1000;
          const reminderKey = `${event.id}-${offset}-${startMs}`;
          const diffMs = now - triggerMs;

          if (diffMs < 0 || diffMs > 30000) continue;
          if (notifiedReminderRef.current.has(reminderKey)) continue;

          notifiedReminderRef.current.add(reminderKey);

          const timeLabel = new Date(event.start_time).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          });
          const offsetLabel = offset === 0 ? 'ngay bây giờ' : `${offset} phút nữa`;
          const message = `${event.title} sẽ diễn ra lúc ${timeLabel} (${offsetLabel})${event.location ? ` tại ${event.location}` : ''}.`;

          pushToast('Nhắc sự kiện sắp diễn ra', message, 'info');

          if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'default') {
              try {
                await ensureNotificationPermission();
              } catch (err) {
                console.error(err);
              }
            }

            if (Notification.permission === 'granted') {
              new Notification('Sự kiện sắp diễn ra', {
                body: message,
                tag: `event-reminder-${event.id}-${offset}`,
              });
            }
          }
        }
      }
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [events]);

  async function createTask(payload) {
    const res = await api.post('/api/tasks', payload);
    const task = normalizeTask(res.data);
    setTasks((prev) => [task, ...prev]);
    pushToast('Đã tạo task', task.title || 'Task mới đã được thêm.');
  }

  async function updateTask(id, payload) {
    const res = await api.patch(`/api/tasks/${id}`, payload);
    const updatedTask = normalizeTask({
      ...res.data,
      attachments: prevTaskAttachments(tasks, id, res.data.attachments),
    });
    setTasks((prev) => prev.map((task) => (task.id === id ? updatedTask : task)));
    setModal((prev) => (prev.item?.id === id ? { ...prev, item: { ...prev.item, ...updatedTask } } : prev));
    pushToast('Đã cập nhật task', updatedTask.title || 'Thông tin task đã được lưu.');
  }

  async function toggleTask(id, completed) {
    const res = await api.patch(`/api/tasks/${id}/complete`, { completed });
    const updatedTask = normalizeTask({
      ...res.data,
      attachments: prevTaskAttachments(tasks, id, res.data.attachments),
    });
    setTasks((prev) => prev.map((task) => (task.id === id ? updatedTask : task)));
    setModal((prev) => (prev.item?.id === id ? { ...prev, item: { ...prev.item, ...updatedTask } } : prev));
    pushToast(completed ? 'Đã hoàn thành task' : 'Đã mở lại task', updatedTask.title || 'Trạng thái đã được cập nhật.');
  }

  async function deleteTask(id) {
    const task = tasks.find((item) => item.id === id);
    await api.delete(`/api/tasks/${id}`);
    setTasks((prev) => prev.filter((taskItem) => taskItem.id !== id));
    setModal((prev) => (prev.item?.id === id ? { open: false, type: null, item: null } : prev));
    pushToast('Đã xóa task', task?.title || 'Task đã được xóa khỏi danh sách.');
  }

  async function moveTaskToCategory(taskId, categoryId) {
  const task = tasks.find((item) => item.id === taskId);
  const nextCategory = categories.find((item) => item.id === categoryId);

  if (!task || task.categoryid === categoryId) {
    setDraggedTaskId(null);
    return;
  }

  try {
    const res = await api.patch(`/api/tasks/${taskId}`, {
      categoryid: categoryId,
    });

    const updatedTask = normalizeTask({
      ...res.data,
      attachments: prevTaskAttachments(tasks, taskId, res.data.attachments),
    });

    setTasks((prev) =>
      prev.map((item) => (item.id === taskId ? updatedTask : item))
    );

    setModal((prev) =>
      prev.item?.id === taskId
        ? { ...prev, item: { ...prev.item, ...updatedTask } }
        : prev
    );

    pushToast('Chuyển category', task.title, nextCategory?.name || 'Nhóm mới');
  } catch (err) {
    alert(err.response?.data?.error || 'Không thể chuyển task sang cột mới.');
  } finally {
    setDraggedTaskId(null);
  }
}

  async function createNote(payload) {
    const res = await api.post('/api/notes', payload);
    setNotes((prev) => [res.data, ...prev]);
    pushToast('Đã tạo ghi chú', res.data.title || 'Ghi chú mới đã được thêm.');
  }

  async function deleteNote(id) {
    const note = notes.find((item) => item.id === id);
    await api.delete(`/api/notes/${id}`);
    setNotes((prev) => prev.filter((noteItem) => noteItem.id !== id));
    pushToast('Đã xóa ghi chú', note?.title || 'Ghi chú đã được xóa.');
  }

  async function createEvent(payload) {
    const safePayload = {
      ...payload,
      reminder_offsets: normalizeReminderOffsets(payload.reminder_offsets || []),
    };
    const res = await api.post('/api/events', safePayload);
    const createdEvent = normalizeEvent(res.data);
    setEvents((prev) => [...prev, createdEvent].sort((a, b) => new Date(a.start_time) - new Date(b.start_time)));
    pushToast('Đã tạo sự kiện', createdEvent.title || 'Sự kiện mới đã được thêm.');
  }

  async function updateEvent(id, payload) {
    const safePayload = {
      ...payload,
      reminder_offsets: normalizeReminderOffsets(payload.reminder_offsets || []),
    };
    const res = await api.patch(`/api/events/${id}`, safePayload);
    const updatedEvent = normalizeEvent({
      ...res.data,
      attachments: prevEventAttachments(events, id, res.data.attachments),
    });
    setEvents((prev) => prev
      .map((event) => (event.id === id ? updatedEvent : event))
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    );
    setModal((prev) => (prev.item?.id === id ? { ...prev, item: { ...prev.item, ...updatedEvent } } : prev));
    pushToast('Đã cập nhật sự kiện', updatedEvent.title || 'Thông tin sự kiện đã được lưu.');
  }

  async function deleteEvent(id) {
    const event = events.find((item) => item.id === id);
    await api.delete(`/api/events/${id}`);
    setEvents((prev) => prev.filter((eventItem) => eventItem.id !== id));
    setModal((prev) => (prev.item?.id === id ? { open: false, type: null, item: null } : prev));
    pushToast('Đã xóa sự kiện', event?.title || 'Sự kiện đã được xóa.');
  }

  async function clearCompleted() {
    const completedTasks = tasks.filter((task) => task.completed);
    await Promise.all(completedTasks.map((task) => api.delete(`/api/tasks/${task.id}`)));
    setTasks((prev) => prev.filter((task) => !task.completed));
    pushToast('Đã dọn task hoàn thành', `Đã xóa ${completedTasks.length} task hoàn thành.`);
  }

  function exportData() {
    const data = { categories, tasks, events, notes, exported_at: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'todo-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    pushToast('Đã export dữ liệu', 'File todo-backup.json đã được tải xuống.');
  }

  async function importData(file) {
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text);

    if (Array.isArray(data.notes)) {
      for (const note of data.notes) {
        if (note.content) {
          await api.post('/api/notes', {
            title: note.title,
            content: note.content,
            color: note.color,
            pinned: note.pinned,
          });
        }
      }
    }

    if (Array.isArray(data.tasks)) {
      for (const task of data.tasks) {
        if (task.title) {
          await api.post('/api/tasks', {
            title: task.title,
            description: task.description,
            category_id: task.category_id,
            start_time: task.start_time,
            duration_minutes: task.duration_minutes,
            due_at: task.due_at,
            priority: task.priority || 'medium',
            completed: !!task.completed,
          });
        }
      }
    }

    if (Array.isArray(data.events)) {
      for (const event of data.events) {
        if (event.title && event.start_time && event.duration_minutes) {
          await api.post('/api/events', {
            title: event.title,
            description: event.description,
            category_id: event.category_id,
            start_time: event.start_time,
            duration_minutes: event.duration_minutes,
            location: event.location,
            reminder_offsets: normalizeReminderOffsets(event.reminder_offsets || []),
          });
        }
      }
    }

    await loadAll();
    pushToast('Đã import dữ liệu', 'Danh sách task, event và ghi chú đã được nạp lại.');
  }

  function logout() {
    localStorage.clear();
    navigate('/');
  }

  async function openTaskModal(task) {
    try {
      const res = await api.get(`/api/tasks/${task.id}`);
      setModal({ open: true, type: 'task', item: normalizeTask(res.data) });
    } catch (err) {
      alert(err.response?.data?.error || 'Không thể mở chi tiết task.');
    }
  }

  async function openEventModal(event) {
    try {
      const res = await api.get(`/api/events/${event.id}`);
      setModal({ open: true, type: 'event', item: normalizeEvent(res.data) });
    } catch (err) {
      alert(err.response?.data?.error || 'Không thể mở chi tiết sự kiện.');
    }
  }

  async function handleSaveTask(payload) {
    try {
      setSavingModal(true);
      await updateTask(modal.item.id, payload);
    } catch (err) {
      alert(err.response?.data?.error || 'Không thể cập nhật task.');
    } finally {
      setSavingModal(false);
    }
  }

  async function handleDeleteTask(id) {
    try {
      setSavingModal(true);
      await deleteTask(id);
    } catch (err) {
      alert(err.response?.data?.error || 'Không thể xóa task.');
    } finally {
      setSavingModal(false);
    }
  }

  async function handleSaveEvent(payload) {
    try {
      setSavingModal(true);
      await updateEvent(modal.item.id, payload);
    } catch (err) {
      alert(err.response?.data?.error || 'Không thể cập nhật sự kiện.');
    } finally {
      setSavingModal(false);
    }
  }

  async function handleDeleteEvent(id) {
    try {
      setSavingModal(true);
      await deleteEvent(id);
    } catch (err) {
      alert(err.response?.data?.error || 'Không thể xóa sự kiện.');
    } finally {
      setSavingModal(false);
    }
  }

  async function handleUploadAttachment(item, file) {
    try {
      setUploadingAttachment(true);
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await api.post('/api/attachments/upload-base64', {
        target_type: modal.type,
        target_id: item.id,
        file_name: file.name,
        mime_type: file.type,
        data: base64,
      });

      setModal((prev) => ({
        ...prev,
        item: { ...prev.item, attachments: [res.data, ...(prev.item.attachments || [])] },
      }));

      if (modal.type === 'task') {
        setTasks((prev) => prev.map((task) => (
          task.id === item.id ? { ...task, attachments: [res.data, ...(task.attachments || [])] } : task
        )));
      }

      if (modal.type === 'event') {
        setEvents((prev) => prev.map((event) => (
          event.id === item.id ? { ...event, attachments: [res.data, ...(event.attachments || [])] } : event
        )));
      }

      pushToast('Đã tải ảnh đính kèm', file.name || 'Ảnh đã được thêm vào item.');
    } catch (err) {
      alert(err.response?.data?.error || 'Không thể tải ảnh lên.');
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function handleDeleteAttachment(attachmentId) {
    try {
      await api.delete(`/api/attachments/${attachmentId}`);

      setModal((prev) => ({
        ...prev,
        item: {
          ...prev.item,
          attachments: (prev.item.attachments || []).filter((attachment) => attachment.id !== attachmentId),
        },
      }));

      if (modal.type === 'task' && modal.item?.id) {
        setTasks((prev) => prev.map((task) => (
          task.id === modal.item.id
            ? { ...task, attachments: (task.attachments || []).filter((attachment) => attachment.id !== attachmentId) }
            : task
        )));
      }

      if (modal.type === 'event' && modal.item?.id) {
        setEvents((prev) => prev.map((event) => (
          event.id === modal.item.id
            ? { ...event, attachments: (event.attachments || []).filter((attachment) => attachment.id !== attachmentId) }
            : event
        )));
      }

      pushToast('Đã xóa attachment', 'Ảnh đính kèm đã được gỡ khỏi item.');
    } catch (err) {
      alert(err.response?.data?.error || 'Không thể xóa ảnh đính kèm.');
    }
  }

  function resetFilters() {
    setFilters({
      keyword: '',
      date: '',
      sortBy: 'due_asc',
      overdueOnly: false,
      completedOnly: false,
    });
  }

  function handleCalendarSelect(item) {
    if (item.type === 'task') {
      const task = tasks.find((entry) => entry.id === item.id);
      if (task) openTaskModal(task);
      return;
    }
    if (item.type === 'event') {
      const event = events.find((entry) => entry.id === item.id);
      if (event) openEventModal(event);
    }
  }

  const filteredTasks = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();
    const result = tasks.filter((task) => {
      const sourceDate = task.due_at || task.start_time;
      const haystack = `${task.title || ''} ${task.description || ''}`.toLowerCase();
      if (keyword && !haystack.includes(keyword)) return false;
      if (filters.date && !isSameDate(sourceDate, filters.date)) return false;
      if (filters.overdueOnly && !task.overdue) return false;
      if (filters.completedOnly && !task.completed) return false;
      return true;
    });

    return result.sort((a, b) => {
      if (filters.sortBy === 'priority_high') {
        return (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0) || getTaskSortValue(a) - getTaskSortValue(b);
      }
      if (filters.sortBy === 'priority_low') {
        return (priorityRank[a.priority] || 0) - (priorityRank[b.priority] || 0) || getTaskSortValue(a) - getTaskSortValue(b);
      }
      if (filters.sortBy === 'due_desc') {
        return getTaskSortValue(b) - getTaskSortValue(a);
      }
      return getTaskSortValue(a) - getTaskSortValue(b);
    });
  }, [tasks, filters]);

  const filteredEvents = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();
    const result = events.filter((event) => {
      const haystack = `${event.title || ''} ${event.description || ''} ${event.location || ''}`.toLowerCase();
      if (keyword && !haystack.includes(keyword)) return false;
      if (filters.date && !isSameDate(event.start_time, filters.date)) return false;
      return true;
    });
    return result.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  }, [events, filters]);

  const groupedTasks = useMemo(() => {
    const map = {};
    categories.forEach((category) => {
      map[category.id] = filteredTasks.filter((task) => task.category_id === category.id);
    });
    return map;
  }, [categories, filteredTasks]);

  const stats = useMemo(() => ({
    totalTasks: tasks.length,
    completed: tasks.filter((task) => task.completed).length,
    overdue: tasks.filter((task) => task.overdue).length,
    upcomingEvents: events.length,
  }), [tasks, events]);

  const calendarItems = useMemo(() => {
    const taskItems = filteredTasks.map((task) => {
      const rawDateTime = task.due_at || task.start_time || task.created_at;
      return {
        id: task.id,
        type: 'task',
        title: task.title || 'Task không có tiêu đề',
        date: toDateKey(rawDateTime),
        rawDateTime,
        time: toTimeLabel(rawDateTime),
        meta: task.description || (task.completed ? 'Đã hoàn thành' : 'Chưa hoàn thành'),
      };
    });

    const eventItems = filteredEvents.map((event) => {
      const rawDateTime = event.start_time || event.created_at;
      const durationText = event.duration_minutes ? `${event.duration_minutes} phút` : '';
      const locationText = event.location || '';
      const descriptionText = event.description || '';
      return {
        id: event.id,
        type: 'event',
        title: event.title || 'Sự kiện không có tiêu đề',
        date: toDateKey(rawDateTime),
        rawDateTime,
        time: toTimeLabel(rawDateTime),
        meta: [locationText, durationText, descriptionText].filter(Boolean).join(' • '),
      };
    });

    return [...taskItems, ...eventItems].filter((item) => item.date);
  }, [filteredTasks, filteredEvents]);

  if (loading) {
    return <div className="screen-message">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="app-shell">
      <ToastStack toasts={toasts} />

      <HeaderBar
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        onRefresh={loadAll}
        onExport={exportData}
        onImport={importData}
        onClearCompleted={clearCompleted}
        onLogout={logout}
      />

      <section className="summary-grid">
        <article className="summary-card"><span>Tổng việc</span><strong>{stats.totalTasks}</strong></article>
        <article className="summary-card"><span>Đã xong</span><strong>{stats.completed}</strong></article>
        <article className="summary-card"><span>Quá hạn</span><strong>{stats.overdue}</strong></article>
        <article className="summary-card"><span>Sự kiện</span><strong>{stats.upcomingEvents}</strong></article>
      </section>

      <FilterBar filters={filters} onChange={setFilters} onReset={resetFilters} />

      <DashboardCategoryStats categories={categories} tasks={filteredTasks} />

      {error ? <div className="error-box">{error}</div> : null}

      <main className="dashboard-grid">
        <section className="category-grid">
          {categories.map((category) => (
            <CategoryColumn
              key={category.id}
              category={category}
              tasks={groupedTasks[category.id] || []}
              onCreateTask={createTask}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              onOpenTask={openTaskModal}
              onDropTask={moveTaskToCategory}
              onDragStart={(e, task) => {
                e.dataTransfer.setData('text/plain', String(task.id));
                setDraggedTaskId(task.id);
              }}
              onDragEnd={() => setDraggedTaskId(null)}
              draggedTaskId={draggedTaskId}
              activeFilters={filters}
            />
          ))}
        </section>

        <aside className="sidebar-grid">
          <WeeklyMonthlyCalendar items={calendarItems} loading={false} error={error} onSelectItem={handleCalendarSelect} />
          <EventsPanel events={filteredEvents} categories={categories} onCreateEvent={createEvent} onOpenEvent={openEventModal} />
          <NotesPanel notes={notes} onCreateNote={createNote} onDeleteNote={deleteNote} />
        </aside>
      </main>

      <DetailModal
        open={modal.open}
        type={modal.type}
        item={modal.item}
        categories={categories}
        onClose={() => setModal({ open: false, type: null, item: null })}
        onSaveTask={handleSaveTask}
        onDeleteTask={handleDeleteTask}
        onSaveEvent={handleSaveEvent}
        onDeleteEvent={handleDeleteEvent}
        onUploadAttachment={handleUploadAttachment}
        onDeleteAttachment={handleDeleteAttachment}
        saving={savingModal}
        uploadingAttachment={uploadingAttachment}
      />
    </div>
  );
}

export default Todo;