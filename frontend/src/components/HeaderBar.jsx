import React from 'react';

export default function HeaderBar({ theme, onToggleTheme, onRefresh, onLogout }) {
  return (
    <header className="panel header-bar">
      <div className="panel-head compact">
        <div>
          <p className="eyebrow">PHASE 1 REFACTOR</p>
          <h1>Task & Event Manager</h1>
        </div>
        <div className="modal-actions">
          <button type="button" className="ghost-btn" onClick={onRefresh}>Làm mới</button>
          <button type="button" className="ghost-btn" onClick={onToggleTheme}>{theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}</button>
          <button type="button" className="ghost-btn danger" onClick={onLogout}>Đăng xuất</button>
        </div>
      </div>
    </header>
  );
}
