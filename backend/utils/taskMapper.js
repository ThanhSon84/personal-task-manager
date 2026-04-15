function mapTask(row) {
  if (!row) return null;

  const completed = Boolean(row.completed);
  const dueAt = row.due_at ? new Date(row.due_at) : null;
  const overdue = Boolean(dueAt && dueAt.getTime() < Date.now() && !completed);

  return {
    id: row.id,
    user_id: row.user_id,
    category_id: row.category_id,
    title: row.title,
    description: row.description,
    start_time: row.start_time,
    duration_minutes: row.duration_minutes,
    due_at: row.due_at,
    priority: row.priority || 'medium',
    status: completed ? 'completed' : (row.status || 'pending'),
    completed,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    overdue,
  };
}

function mapTasks(rows = []) {
  return rows.map(mapTask);
}

module.exports = mapTask;
module.exports.mapTask = mapTask;
module.exports.mapTasks = mapTasks;