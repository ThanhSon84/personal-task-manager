function pick(row, ...keys) {
  for (const key of keys) {
    if (row && row[key] !== undefined) return row[key];
  }
  return null;
}

function mapTask(row) {
  if (!row) return null;

  const completed = Boolean(pick(row, 'completed'));
  const dueAtValue = pick(row, 'due_at', 'dueat');
  const dueAt = dueAtValue ? new Date(dueAtValue) : null;
  const overdue = Boolean(dueAt && dueAt.getTime() < Date.now() && !completed);

  return {
    id: pick(row, 'id'),
    user_id: pick(row, 'user_id', 'userid'),
    userId: pick(row, 'user_id', 'userid'),

    category_id: pick(row, 'category_id', 'categoryid'),
    categoryid: pick(row, 'category_id', 'categoryid'),

    title: pick(row, 'title'),
    description: pick(row, 'description') || '',

    start_time: pick(row, 'start_time', 'starttime'),
    starttime: pick(row, 'start_time', 'starttime'),

    duration_minutes: pick(row, 'duration_minutes', 'durationminutes'),
    durationminutes: pick(row, 'duration_minutes', 'durationminutes'),

    due_at: pick(row, 'due_at', 'dueat'),
    dueat: pick(row, 'due_at', 'dueat'),

    priority: pick(row, 'priority') || 'medium',
    status: completed ? 'completed' : (pick(row, 'status') || 'pending'),
    completed,

    completed_at: pick(row, 'completed_at', 'completedat'),
    completedat: pick(row, 'completed_at', 'completedat'),

    created_at: pick(row, 'created_at', 'createdat'),
    createdat: pick(row, 'created_at', 'createdat'),

    updated_at: pick(row, 'updated_at', 'updatedat'),
    updatedat: pick(row, 'updated_at', 'updatedat'),

    overdue,
  };
}

function mapTasks(rows = []) {
  return rows.map(mapTask);
}

module.exports = mapTask;
module.exports.mapTask = mapTask;
module.exports.mapTasks = mapTasks;