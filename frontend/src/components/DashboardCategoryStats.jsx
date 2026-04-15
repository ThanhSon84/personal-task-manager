import React, { useEffect, useMemo, useState } from 'react';

function getEventStatus(event, now) {
  const start = new Date(event.start_time);
  if (Number.isNaN(start.getTime())) return 'upcoming';
  const duration = Number(event.duration_minutes) || 0;
  const end = new Date(start.getTime() + duration * 60 * 1000);
  if (now < start) return 'upcoming';
  if (now >= start && now < end) return 'ongoing';
  return 'past';
}

export default function DashboardCategoryStats({ categories = [], tasks = [], events = [] }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const statsByCategory = useMemo(() => {
    return categories.map((category) => {
      const categoryTasks = tasks.filter((task) => task.category_id === category.id);
      const categoryEvents = events.filter((event) => event.category_id === category.id);

      return {
        id: category.id,
        type: category.type,
        name: category.name,
        total_tasks: categoryTasks.length,
        completed_tasks: categoryTasks.filter((task) => task.completed).length,
        overdue_tasks: categoryTasks.filter((task) => task.overdue).length,
        upcoming_events: categoryEvents.filter((event) => getEventStatus(event, now) === 'upcoming').length,
        ongoing_events: categoryEvents.filter((event) => getEventStatus(event, now) === 'ongoing').length,
        past_events: categoryEvents.filter((event) => getEventStatus(event, now) === 'past').length,
      };
    });
  }, [categories, tasks, events, now]);

  return (
    <section className="panel category-stats-panel">
      <div className="panel-head compact">
        <h2>THỐNG KÊ THEO NHÓM</h2>
      </div>

      <div className="category-stats-grid">
        {statsByCategory.map((item) => (
          <article key={item.id} className="category-stat-card">
            <div>
              <p className="eyebrow">{item.type}</p>
              <h3>{item.name}</h3>
            </div>

            <div className="category-stat-metrics">
              <span>Tổng task <strong>{item.total_tasks}</strong></span>
              <span>Đã xong <strong>{item.completed_tasks}</strong></span>
              <span>Task quá hạn <strong>{item.overdue_tasks}</strong></span>
              <span>Sự kiện sắp diễn ra <strong>{item.upcoming_events}</strong></span>
              <span>Sự kiện đang diễn ra <strong>{item.ongoing_events}</strong></span>
              <span>Sự kiện đã diễn ra <strong>{item.past_events}</strong></span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
