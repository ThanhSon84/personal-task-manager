import React from 'react';

export default function FilterBar({ filters, onChange, onReset }) {
  return (
    <section className="panel">
      <div className="panel-head compact">
        <h2>BỘ LỌC</h2>
      </div>

      <div className="modal-grid three-col">
        <label>
          <span>Từ khóa</span>
          <input value={filters.keyword} onChange={(e) => onChange((prev) => ({ ...prev, keyword: e.target.value }))} placeholder="Tìm task hoặc sự kiện" />
        </label>
        <label>
          <span>Ngày</span>
          <input type="date" value={filters.date} onChange={(e) => onChange((prev) => ({ ...prev, date: e.target.value }))} />
        </label>
        <label>
          <span>Sắp xếp task</span>
          <select value={filters.sort_by} onChange={(e) => onChange((prev) => ({ ...prev, sort_by: e.target.value }))}>
            <option value="due_asc">Hạn gần nhất</option>
            <option value="due_desc">Hạn xa nhất</option>
            <option value="priority_high">Ưu tiên cao</option>
            <option value="priority_low">Ưu tiên thấp</option>
          </select>
        </label>
      </div>

      <div className="modal-grid two-col">
        <label className="toggle-field">
          <span>Chỉ task quá hạn</span>
          <input type="checkbox" checked={filters.overdue_only} onChange={(e) => onChange((prev) => ({ ...prev, overdue_only: e.target.checked }))} />
        </label>
        <label className="toggle-field">
          <span>Chỉ task hoàn thành</span>
          <input type="checkbox" checked={filters.completed_only} onChange={(e) => onChange((prev) => ({ ...prev, completed_only: e.target.checked }))} />
        </label>
      </div>

      <div className="modal-actions">
        <button type="button" className="ghost-btn" onClick={onReset}>Đặt lại bộ lọc</button>
      </div>
    </section>
  );
}
