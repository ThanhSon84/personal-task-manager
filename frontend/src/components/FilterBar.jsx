import React from 'react';

function FilterBar({ filters, onChange, onReset }) {
  return (
    <section className="filter-bar panel">
      <div className="panel-head compact">
        <h2>BỘ LỌC CÔNG VIỆC</h2>
        <button className="ghost-btn" onClick={onReset}>Đặt lại</button>
      </div>

      <div className="filter-grid search-grid advanced-grid">
        <label className="search-field wide-field">
          <span>Từ khóa</span>
          <input
            type="text"
            value={filters.keyword}
            placeholder="Tìm theo tiêu đề hoặc mô tả..."
            onChange={(e) => onChange({ ...filters, keyword: e.target.value })}
          />
        </label>

        <label>
          <span>Ngày</span>
          <input
            type="date"
            value={filters.date}
            onChange={(e) => onChange({ ...filters, date: e.target.value })}
          />
        </label>

        <label>
          <span>Sắp xếp</span>
          <select
            value={filters.sortBy}
            onChange={(e) => onChange({ ...filters, sortBy: e.target.value })}
          >
            <option value="due_asc">Hạn gần nhất</option>
            <option value="due_desc">Hạn xa nhất</option>
            <option value="priority_high">Ưu tiên cao trước</option>
            <option value="priority_low">Ưu tiên thấp trước</option>
          </select>
        </label>

        <label className="toggle-chip">
          <input
            type="checkbox"
            checked={filters.overdueOnly}
            onChange={(e) => onChange({ ...filters, overdueOnly: e.target.checked })}
          />
          <span>Chỉ việc quá hạn</span>
        </label>

        <label className="toggle-chip">
          <input
            type="checkbox"
            checked={filters.completedOnly}
            onChange={(e) => onChange({ ...filters, completedOnly: e.target.checked })}
          />
          <span>Chỉ việc đã xong</span>
        </label>
      </div>
    </section>
  );
}

export default FilterBar;