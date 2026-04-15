import React, { useMemo, useState } from 'react';

const EMPTY_FORM = {
  title: '',
  description: '',
  category_id: '',
  start_time: '',
  duration_minutes: 60,
  location: '',
};

export default function EventsPanel({ events = [], categories = [], onCreateEvent, onOpenEvent }) {
  const [keyword, setKeyword] = useState('');
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    category_id: categories[0]?.id || '',
  });

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

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.start_time) return;
    await onCreateEvent({
      title: form.title.trim(),
      description: form.description.trim(),
      category_id: form.category_id ? Number(form.category_id) : null,
      start_time: form.start_time,
      duration_minutes: Number(form.duration_minutes) || 60,
      location: form.location.trim(),
    });
    setForm({ ...EMPTY_FORM, category_id: categories[0]?.id || '' });
  };

  return (
    <section className="panel">
      <div className="panel-head compact">
        <h2>SỰ KIỆN</h2>
        <span className="count-pill">{filteredEvents.length}</span>
      </div>

      <form className="note-form" onSubmit={submit}>
        <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Tên sự kiện" />
        <textarea rows="3" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Mô tả ngắn" />
        <div className="modal-grid two-col">
          <select value={form.category_id} onChange={(e) => setForm((prev) => ({ ...prev, category_id: e.target.value }))}>
            <option value="">Chưa phân nhóm</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <input type="text" value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} placeholder="Địa điểm" />
        </div>
        <div className="modal-grid two-col">
          <input type="datetime-local" value={form.start_time} onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))} />
          <input type="number" min="1" value={form.duration_minutes} onChange={(e) => setForm((prev) => ({ ...prev, duration_minutes: e.target.value }))} placeholder="Thời lượng phút" />
        </div>
        <button type="submit">Tạo sự kiện</button>
      </form>

      <label className="event-search-field">
        <span>Tìm sự kiện</span>
        <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Tìm theo tên, mô tả hoặc địa điểm..." />
      </label>

      <div className="event-list">
        {filteredEvents.length === 0 ? (
          <div className="empty-column-state compact-empty-state">
            <div className="empty-icon" />
            <strong>Chưa có sự kiện phù hợp</strong>
            <p>Hãy tạo sự kiện mới hoặc đổi từ khóa tìm kiếm.</p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <article key={event.id} className="event-card clickable-card" onClick={() => onOpenEvent(event)}>
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
