import React, { useMemo, useState } from "react";
import "./WeeklyMonthlyCalendar.css";

const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const FULL_DAY_NAMES = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];
const MONTH_NAMES = [
  "tháng 1",
  "tháng 2",
  "tháng 3",
  "tháng 4",
  "tháng 5",
  "tháng 6",
  "tháng 7",
  "tháng 8",
  "tháng 9",
  "tháng 10",
  "tháng 11",
  "tháng 12",
];

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekDays(baseDate) {
  const current = startOfDay(baseDate);
  const day = current.getDay();
  const start = addDays(current, -day);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function getMonthDays(baseDate) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const start = addDays(firstDay, -firstDay.getDay());
  const end = addDays(lastDay, 6 - lastDay.getDay());

  const days = [];
  let cursor = new Date(start);

  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }

  return days;
}

function formatHeaderDate(date) {
  return `${MONTH_NAMES[date.getMonth()]} năm ${date.getFullYear()}`;
}

function formatSelectedDate(date) {
  return `${FULL_DAY_NAMES[date.getDay()]}, ${String(date.getDate()).padStart(
    2,
    "0"
  )}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

export default function WeeklyMonthlyCalendar({
  items = [],
  loading = false,
  error = "",
}) {
  const today = startOfDay(new Date());
  const [view, setView] = useState("week");
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);

  const itemsByDate = useMemo(() => {
    return items.reduce((acc, item) => {
      if (!item.date) return acc;
      if (!acc[item.date]) acc[item.date] = [];
      acc[item.date].push(item);
      return acc;
    }, {});
  }, [items]);

  const visibleDays = useMemo(() => {
    return view === "week" ? getWeekDays(currentDate) : getMonthDays(currentDate);
  }, [view, currentDate]);

  const selectedKey = formatKey(selectedDate);
  const selectedItems = (itemsByDate[selectedKey] || []).sort((a, b) => {
    const ta = a.rawDateTime ? new Date(a.rawDateTime).getTime() : 0;
    const tb = b.rawDateTime ? new Date(b.rawDateTime).getTime() : 0;
    return ta - tb;
  });

  const goPrev = () => {
    if (view === "week") {
      setCurrentDate((prev) => addDays(prev, -7));
    } else {
      setCurrentDate(
        (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
      );
    }
  };

  const goNext = () => {
    if (view === "week") {
      setCurrentDate((prev) => addDays(prev, 7));
    } else {
      setCurrentDate(
        (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
      );
    }
  };

  const goToday = () => {
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const handleSelectDay = (day) => {
    setSelectedDate(day);

    if (view === "month" && day.getMonth() !== currentDate.getMonth()) {
      setCurrentDate(new Date(day.getFullYear(), day.getMonth(), 1));
    }
  };

  return (
    <section className={`calendar-card ${view === "month" ? "is-month" : "is-week"}`}>
      <div className="calendar-top">
        <h2 className="calendar-title">Lịch tuần / tháng</h2>

        <div className="calendar-switch">
          <button
            type="button"
            className={view === "week" ? "active" : ""}
            onClick={() => setView("week")}
          >
            Tuần
          </button>

          <button
            type="button"
            className={view === "month" ? "active" : ""}
            onClick={() => setView("month")}
          >
            Tháng
          </button>
        </div>
      </div>

      <div className="calendar-toolbar">
        <button
          type="button"
          className="nav-btn"
          onClick={goPrev}
          aria-label="Trước đó"
        >
          ←
        </button>

        <div className="calendar-heading">
          <span>{formatHeaderDate(currentDate)}</span>

          <button
            type="button"
            className="today-btn"
            onClick={goToday}
          >
            Hôm nay
          </button>
        </div>

        <button
          type="button"
          className="nav-btn"
          onClick={goNext}
          aria-label="Kế tiếp"
        >
          →
        </button>
      </div>

      <div className={`calendar-grid ${view === "month" ? "month-view" : "week-view"}`}>
        {visibleDays.map((day) => {
          const key = formatKey(day);
          const dayItems = itemsByDate[key] || [];
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDate);
          const isOutsideMonth =
            view === "month" && day.getMonth() !== currentDate.getMonth();

          return (
            <button
              key={key}
              type="button"
              className={[
                "calendar-day",
                isToday ? "today" : "",
                isSelected ? "selected" : "",
                isOutsideMonth ? "muted" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => handleSelectDay(day)}
              aria-pressed={isSelected}
            >
              <span className="day-name">{DAY_NAMES[day.getDay()]}</span>
              <span className="day-number">{day.getDate()}</span>

              <div className="day-meta">
                {dayItems.length > 0 ? (
                  <>
                    <span className="dot" />
                    <span className="count">{dayItems.length}</span>
                  </>
                ) : (
                  <span className="empty-mark">—</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="calendar-detail">
        <div className="detail-header">
          <h3>{formatSelectedDate(selectedDate)}</h3>
          <span className="detail-badge">{selectedItems.length} mục</span>
        </div>

        {loading ? (
          <p className="empty-text">Đang tải dữ liệu lịch...</p>
        ) : error ? (
          <p className="empty-text">{error}</p>
        ) : selectedItems.length === 0 ? (
          <p className="empty-text">Không có task hoặc event trong ngày này.</p>
        ) : (
          <ul className="detail-list">
            {selectedItems.map((item) => (
              <li key={`${item.type}-${item.id}`} className="detail-item">
                <div className={`item-type ${item.type}`}>
                  {item.type === "event" ? "Event" : "Task"}
                </div>

                <div className="item-content">
                  <strong>{item.title}</strong>
                  <span>
                    {item.time ? `${item.time} • ` : ""}
                    {item.meta || "Không có mô tả thêm"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}