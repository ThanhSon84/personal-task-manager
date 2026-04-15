import React, { useMemo, useState } from 'react';

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfWeek(date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return startOfDay(addDays(date, diff));
}

function buildWeekDays(currentDate) {
  const start = startOfWeek(currentDate);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function buildMonthCells(currentDate) {
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const gridStart = startOfWeek(monthStart);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

function formatDayLabel(date) {
  return date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function CalendarPanel({ tasks, events, onOpenTask, onOpenEvent }) {
  const [view, setView] = useState('week');
  const [focusDate, setFocusDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));

  const normalizedTasks = useMemo(
    () => tasks.filter((task) => task.start_time || task.due_at),
    [tasks]
  );

  const periodDays = useMemo(
    () => (view === 'week' ? buildWeekDays(focusDate) : buildMonthCells(focusDate)),
    [view, focusDate]
  );

  const selectedItems = useMemo(() => {
    const selected = startOfDay(selectedDate);
    const taskItems = normalizedTasks
      .filter((task) => {
        const source = task.due_at || task.start_time;
        return source && sameDay(new Date(source), selected);
      })
      .map((task) => ({ ...task, itemType: 'task', time: task.start_time || task.due_at }));

    const eventItems = events
      .filter((event) => sameDay(new Date(event.start_time), selected))
      .map((event) => ({ ...event, itemType: 'event', time: event.start_time }));

    return [...eventItems, ...taskItems].sort((a, b) => new Date(a.time) - new Date(b.time));
  }, [events, normalizedTasks, selectedDate]);

  function getDayStats(day) {
    const taskCount = normalizedTasks.filter((task) => {
      const source = task.due_at || task.start_time;
      return source && sameDay(new Date(source), day);
    }).length;

    const eventCount = events.filter((event) => sameDay(new Date(event.start_time), day)).length;
    return { taskCount, eventCount };
  }

  function moveCalendar(direction) {
    const next = new Date(focusDate);
    if (view === 'week') {
      next.setDate(next.getDate() + direction * 7);
    } else {
      next.setMonth(next.getMonth() + direction);
    }
    setFocusDate(next);
  }

  return (
    <section className="panel side-panel">
      <div className="panel-head">
        <h2>LỊCH TUẦN / THÁNG</h2>
        <div className="segmented-control">
          <button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>Tuần</button>
          <button className={view === 'month' ? 'active' : ''} onClick={() => setView('month')}>Tháng</button>
        </div>
      </div>

      <div className="calendar-toolbar">
        <button className="icon-btn" onClick={() => moveCalendar(-1)}>←</button>
        <strong>{focusDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</strong>
        <button className="icon-btn" onClick={() => moveCalendar(1)}>→</button>
      </div>

      <div className={`calendar-grid ${view}`}>
        {periodDays.map((day) => {
          const stats = getDayStats(day);
          const inCurrentMonth = day.getMonth() === focusDate.getMonth();
          const isToday = sameDay(day, new Date());
          const isSelected = sameDay(day, selectedDate);

          return (
            <button
              key={day.toISOString()}
              className={`calendar-cell ${inCurrentMonth ? '' : 'muted-cell'} ${isToday ? 'today-cell' : ''} ${isSelected ? 'selected-cell' : ''}`}
              onClick={() => setSelectedDate(startOfDay(day))}
            >
              <span className="calendar-date">{day.getDate()}</span>
              <small>{formatDayLabel(day)}</small>
              <div className="calendar-dots">
                {stats.eventCount ? <span className="event-dot">{stats.eventCount} sự kiện</span> : null}
                {stats.taskCount ? <span className="task-dot">{stats.taskCount} việc</span> : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="calendar-detail">
        <div className="panel-head compact">
          <h3>{selectedDate.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</h3>
        </div>

        {selectedItems.length === 0 ? (
          <p className="empty-state">Không có task hoặc event trong ngày này.</p>
        ) : (
          <div className="calendar-agenda">
            {selectedItems.map((item) => (
              <button
                key={`${item.itemType}-${item.id}`}
                className="agenda-item"
                onClick={() => (item.itemType === 'event' ? onOpenEvent(item) : onOpenTask(item))}
              >
                <span className={`agenda-type ${item.itemType}`}>{item.itemType === 'event' ? 'Event' : 'Task'}</span>
                <strong>{item.title}</strong>
                <small>{new Date(item.time).toLocaleString('vi-VN')}</small>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default CalendarPanel;