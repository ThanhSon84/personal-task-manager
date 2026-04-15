import React, { useState } from 'react';

function NotesPanel({ notes, onCreateNote, onDeleteNote }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  async function submitNote(e) {
    e.preventDefault();
    if (!content.trim()) return;
    await onCreateNote({ title: title.trim(), content: content.trim(), pinned: false, color: '#FEF3C7' });
    setTitle('');
    setContent('');
  }

  return (
    <section className="panel side-panel">
      <div className="panel-head">
        <h2>GHI CHÚ 📝</h2>
      </div>

      <form className="note-form" onSubmit={submitNote}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tiêu đề ghi chú"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Ghi lại ý tưởng, checklist, lời nhắc..."
          rows={4}
        />
        <button type="submit">Lưu ghi chú</button>
      </form>

      <div className="note-list">
        {notes.length === 0 ? (
          <p className="empty-state">Chưa có ghi chú nào.</p>
        ) : (
          notes.map((note) => (
            <article key={note.id} className="note-card" style={{ backgroundColor: note.color || '#FEF3C7' }}>
              <div className="note-head">
                <strong>{note.title || 'Ghi chú'}</strong>
                <button className="icon-btn" onClick={() => onDeleteNote(note.id)}>✕</button>
              </div>
              <p>{note.content}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export default NotesPanel;