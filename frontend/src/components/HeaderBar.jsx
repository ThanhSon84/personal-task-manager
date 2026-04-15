import React, { useRef } from 'react';

function HeaderBar({
  theme,
  onToggleTheme,
  onRefresh,
  onExport,
  onImport,
  onClearCompleted,
  onLogout,
}) {
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onImport) onImport(file);
    e.target.value = '';
  };

  return (
    <header className="topbar">
      <div className="topbar-copy">
        <p className="eyebrow">Quản lý công việc cá nhân</p>
        <h1 className="topbar-title">Không gian làm việc của bạn</h1>
      </div>

      <div className="toolbar">
        <button type="button" className="ghost-btn" onClick={onToggleTheme}>
          {theme === 'dark' ? 'Tối 🌙' : 'Sáng ☀️'}
        </button>

        <button type="button" className="ghost-btn" onClick={onExport}>
          Xuất 💾
        </button>

        <button
          type="button"
          className="ghost-btn"
          onClick={() => fileRef.current?.click()}
        >
          Nhập 📂
        </button>

        <button
          type="button"
          className="ghost-btn danger"
          onClick={onClearCompleted}
        >
          Xóa việc xong 🧹
        </button>

        <button type="button" className="ghost-btn" onClick={onRefresh}>
          Làm mới ↻
        </button>

        <button type="button" className="primary-btn" onClick={onLogout}>
          Đăng xuất
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={handleFileChange}
        />
      </div>
    </header>
  );
}

export default HeaderBar;