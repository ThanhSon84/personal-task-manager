import React, { useMemo, useState } from 'react';

const REMINDER_OPTIONS = [
  { value: 5, label: '5 phút trước' },
  { value: 10, label: '10 phút trước' },
  { value: 30, label: '30 phút trước' },
  { value: 60, label: '1 giờ trước' },
];

function EventsPanel({ events, categories, onCreateEvent, onOpenEvent }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    categoryid: categories[0]?.id || 1,
    starttime: '',
    durationminutes: 60,
    location: '',
    reminderOffsets: [],
  });
  const [keyword, setKeyword] = useState('');

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

  function toggleReminder(minutes) {
    setForm((prev) => ({
      ...prev,
      reminderOffsets: prev.reminderOffsets.includes(minutes)
        ? prev.reminderOffsets.filter((item) => item !== minutes)
        : [...prev.reminderOffsets, minutes].sort((a, b) => a - b),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title || !form.starttime) return;

    await onCreateEvent({
      title: form.title.trim(),
      description: form.description.trim(),
      category_id: Number(form.categoryid),
      start_time: form.starttime,
      duration_minutes: Number(form.durationminutes),
      location: form.location.trim(),
      reminder_offsets: form.reminderOffsets,
    });

    setForm({
      title: '',
      description: '',
      categoryid: categories[0]?.id || 1,
      starttime: '',
      durationminutes: 60,
      location: '',
      reminderOffsets: [],
    });
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
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Tên sự kiện"
        />

        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Mô tả ngắn"
        />

        <div className="modal-grid two-col">
          <select
            value={form.categoryid}
            onChange={(e) => setForm({ ...form, categoryid: e.target.value })}
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
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Địa điểm"
          />
        </div>

        <div className="modal-grid two-col">
          <input
            type="datetime-local"
            value={form.starttime}
            onChange={(e) => setForm({ ...form, starttime: e.target.value })}
          />

          <input
            type="number"
            min={15}
            value={form.durationminutes}
            onChange={(e) => setForm({ ...form, durationminutes: e.target.value })}
            placeholder="Thời lượng (phút)"
          />
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
            <div className="empty-icon">📅</div>
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

              {Array.isArray(event.reminder_offsets) && event.reminder_offsets.length ? (
                <div className="task-time">
                  <span>Nhắc: {event.reminder_offsets.join(', ')} phút trước</span>
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export default EventsPanel;