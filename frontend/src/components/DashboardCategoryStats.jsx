import React from 'react';

function getEventStatus(event, now = new Date()) {
  const start = new Date(event.start_time);
  const durationMinutes = Number(event.duration_minutes) || 0;
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  if (Number.isNaN(start.getTime())) return 'upcoming';
  if (now < start) return 'upcoming';
  if (now >= start && now < end) return 'ongoing';
  return 'past';
}

function DashboardCategoryStats({ categories = [], tasks = [], events = [] }) {
  const now = new Date();

  return (
    <section className="panel category-stats-panel">
      <div className="panel-head compact">
        <h2>THỐNG KÊ THEO NHÓM</h2>
      </div>

      <div className="category-stats-grid">
        {categories.map((category) => {
          const categoryTasks = tasks.filter((task) => task.category_id === category.id || task.categoryId === category.id || task.categoryid === category.id);
          const categoryEvents = events.filter((event) => event.category_id === category.id || event.categoryId === category.id || event.categoryid === category.id);

          const completed = categoryTasks.filter((task) => task.completed).length;
          const overdue = categoryTasks.filter((task) => task.overdue).length;
          const upcomingEvents = categoryEvents.filter((event) => getEventStatus(event, now) === 'upcoming').length;
          const ongoingEvents = categoryEvents.filter((event) => getEventStatus(event, now) === 'ongoing').length;
          const pastEvents = categoryEvents.filter((event) => getEventStatus(event, now) === 'past').length;

          return (
            <article key={category.id} className="category-stat-card">
              <div>
                <p className="eyebrow">{category.type}</p>
                <h3>{category.name}</h3>
              </div>

              <div className="category-stat-metrics">
                <span>Tổng task <strong>{categoryTasks.length}</strong></span>
                <span>Đã xong <strong>{completed}</strong></span>
                <span>Task quá hạn <strong>{overdue}</strong></span>
                <span>Sự kiện sắp diễn ra <strong>{upcomingEvents}</strong></span>
                <span>Sự kiện đang diễn ra <strong>{ongoingEvents}</strong></span>
                <span>Sự kiện đã diễn ra <strong>{pastEvents}</strong></span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default DashboardCategoryStats;