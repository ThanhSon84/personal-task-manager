import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './lib/api';
import HeaderBar from './components/HeaderBar';
import FilterBar from './components/FilterBar';
import CategoryColumn from './components/CategoryColumn';
import EventsPanel from './components/EventsPanel';
import DashboardCategoryStats from './components/DashboardCategoryStats';
import DetailModal from './components/DetailModal';
import WeeklyMonthlyCalendar from './WeeklyMonthlyCalendar';
import './app.css';

const FALLBACK_CATEGORIES = [
  { id: 1, name: 'Dự kiến', type: 'planned', sort_order: 1 },
  { id: 2, name: 'Công việc', type: 'work', sort_order: 2 },
  { id: 3, name: 'Cá nhân', type: 'personal', sort_order: 3 },
  { id: 4, name: 'Dự án', type: 'project', sort_order: 4 },
];

const DEFAULT_FILTERS = {
  keyword: '',
  date: '',
  sort_by: 'due_asc',
  overdue_only: false,
  completed_only: false,
};

const PRIORITY_RANK = { high: 3, medium: 2, low: 1 };

function normalizeTask(item) {
  return {
    id: item.id,
    user_id: item.user_id ?? null,
    category_id: item.category_id ?? null,
    title: item.title || 'Task không có tiêu đề',
    description: item.description || '',
    priority: ['low', 'medium', 'high'].includes(item.priority) ? item.priority : 'medium',
    start_time: item.start_time || null,
    duration_minutes: item.duration_minutes ?? null,
    due_at: item.due_at || null,
    completed: Boolean(item.completed),
    overdue: Boolean(item.overdue),
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  };
}

function normalizeEvent(item) {
  return {
    id: item.id,
    user_id: item.user_id ?? null,
    category_id: item.category_id ?? null,
    title: item.title || 'Sự kiện không có tiêu đề',
    description: item.description || '',
    start_time: item.start_time || null,
    duration_minutes: Number(item.duration_minutes) || 60,
    location: item.location || '',
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  };
}

function isSameDate(value, selectedDate) {
  if (!value || !selectedDate) return false;
  const a = new Date(value);
  const b = new Date(selectedDate);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getTaskSortValue(task) {
  return new Date(task.due_at || task.start_time || '2999-12-31T00:00:00').getTime();
}

function toDateKey(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toTimeLabel(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function Todo() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [modal, setModal] = useState({ open: false, type: null, item: null });
  const [saving_modal, setSavingModal] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [categoriesRes, tasksRes, eventsRes] = await Promise.all([
        api.get('/api/categories').catch(() => ({ data: [] })),
        api.get('/api/tasks'),
        api.get('/api/events'),
      ]);

      const nextCategories = Array.isArray(categoriesRes.data) && categoriesRes.data.length
        ? categoriesRes.data
        : FALLBACK_CATEGORIES;

      setCategories([...nextCategories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      setTasks((Array.isArray(tasksRes.data) ? tasksRes.data : []).map(normalizeTask));
      setEvents(
        (Array.isArray(eventsRes.data) ? eventsRes.data : [])
          .map(normalizeEvent)
          .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
      );
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Không thể tải dữ liệu.');
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }
    loadAll();
  }, [navigate, loadAll]);

  const createTask = async (payload) => {
    const res = await api.post('/api/tasks', payload);
    const created = normalizeTask(res.data);
    setTasks((prev) => [created, ...prev]);
  };

  const updateTask = async (id, payload) => {
    const res = await api.patch(`/api/tasks/${id}`, payload);
    const updated = normalizeTask(res.data);
    setTasks((prev) => prev.map((task) => (task.id === id ? updated : task)));
    setModal((prev) => (prev.item?.id === id ? { ...prev, item: updated } : prev));
  };

  const deleteTask = async (id) => {
    await api.delete(`/api/tasks/${id}`);
    setTasks((prev) => prev.filter((task) => task.id !== id));
    setModal((prev) => (prev.item?.id === id ? { open: false, type: null, item: null } : prev));
  };

  const toggleTask = async (id, completed) => {
    const res = await api.patch(`/api/tasks/${id}/complete`, { completed });
    const updated = normalizeTask(res.data);
    setTasks((prev) => prev.map((task) => (task.id === id ? updated : task)));
    setModal((prev) => (prev.item?.id === id ? { ...prev, item: updated } : prev));
  };

  const moveTaskToCategory = async (taskId, categoryId) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.category_id === categoryId) return;
    await updateTask(taskId, {
      title: task.title,
      description: task.description,
      category_id: categoryId,
      priority: task.priority,
      start_time: task.start_time,
      duration_minutes: task.duration_minutes,
      due_at: task.due_at,
      completed: task.completed,
    });
  };

  const createEvent = async (payload) => {
    const res = await api.post('/api/events', payload);
    const created = normalizeEvent(res.data);
    setEvents((prev) => [...prev, created].sort((a, b) => new Date(a.start_time) - new Date(b.start_time)));
  };

  const updateEvent = async (id, payload) => {
    const res = await api.patch(`/api/events/${id}`, payload);
    const updated = normalizeEvent(res.data);
    setEvents((prev) => prev.map((event) => (event.id === id ? updated : event)).sort((a, b) => new Date(a.start_time) - new Date(b.start_time)));
    setModal((prev) => (prev.item?.id === id ? { ...prev, item: updated } : prev));
  };

  const deleteEvent = async (id) => {
    await api.delete(`/api/events/${id}`);
    setEvents((prev) => prev.filter((event) => event.id !== id));
    setModal((prev) => (prev.item?.id === id ? { open: false, type: null, item: null } : prev));
  };

  const openTaskModal = async (task) => {
    const res = await api.get(`/api/tasks/${task.id}`);
    setModal({ open: true, type: 'task', item: normalizeTask(res.data) });
  };

  const openEventModal = async (event) => {
    const res = await api.get(`/api/events/${event.id}`);
    setModal({ open: true, type: 'event', item: normalizeEvent(res.data) });
  };

  const handleSaveTask = async (payload) => {
    try {
      setSavingModal(true);
      await updateTask(modal.item.id, payload);
    } finally {
      setSavingModal(false);
    }
  };

  const handleSaveEvent = async (payload) => {
    try {
      setSavingModal(true);
      await updateEvent(modal.item.id, payload);
    } finally {
      setSavingModal(false);
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      setSavingModal(true);
      await deleteTask(id);
    } finally {
      setSavingModal(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    try {
      setSavingModal(true);
      await deleteEvent(id);
    } finally {
      setSavingModal(false);
    }
  };

  const filteredTasks = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();
    const result = tasks.filter((task) => {
      const sourceDate = task.due_at || task.start_time;
      const haystack = `${task.title} ${task.description}`.toLowerCase();
      if (keyword && !haystack.includes(keyword)) return false;
      if (filters.date && !isSameDate(sourceDate, filters.date)) return false;
      if (filters.overdue_only && !task.overdue) return false;
      if (filters.completed_only && !task.completed) return false;
      return true;
    });

    return result.sort((a, b) => {
      if (filters.sort_by === 'priority_high') {
        return (PRIORITY_RANK[b.priority] || 0) - (PRIORITY_RANK[a.priority] || 0) || getTaskSortValue(a) - getTaskSortValue(b);
      }
      if (filters.sort_by === 'priority_low') {
        return (PRIORITY_RANK[a.priority] || 0) - (PRIORITY_RANK[b.priority] || 0) || getTaskSortValue(a) - getTaskSortValue(b);
      }
      if (filters.sort_by === 'due_desc') {
        return getTaskSortValue(b) - getTaskSortValue(a);
      }
      return getTaskSortValue(a) - getTaskSortValue(b);
    });
  }, [tasks, filters]);

  const filteredEvents = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();
    return events
      .filter((event) => {
        const haystack = `${event.title} ${event.description} ${event.location}`.toLowerCase();
        if (keyword && !haystack.includes(keyword)) return false;
        if (filters.date && !isSameDate(event.start_time, filters.date)) return false;
        return true;
      })
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  }, [events, filters]);

  const groupedTasks = useMemo(() => {
    const map = {};
    categories.forEach((category) => {
      map[category.id] = filteredTasks.filter((task) => task.category_id === category.id);
    });
    return map;
  }, [categories, filteredTasks]);

  const topStats = useMemo(() => {
    return {
      total_tasks: tasks.length,
      completed_tasks: tasks.filter((task) => task.completed).length,
      overdue_tasks: tasks.filter((task) => task.overdue).length,
      total_events: events.length,
    };
  }, [tasks, events]);

  const calendarItems = useMemo(() => {
    const taskItems = filteredTasks.map((task) => {
      const rawDateTime = task.due_at || task.start_time || task.created_at;
      return {
        id: task.id,
        type: 'task',
        title: task.title,
        date: toDateKey(rawDateTime),
        rawDateTime,
        time: toTimeLabel(rawDateTime),
        meta: task.description || (task.completed ? 'Đã hoàn thành' : 'Chưa hoàn thành'),
      };
    });

    const eventItems = filteredEvents.map((event) => {
      const rawDateTime = event.start_time || event.created_at;
      return {
        id: event.id,
        type: 'event',
        title: event.title,
        date: toDateKey(rawDateTime),
        rawDateTime,
        time: toTimeLabel(rawDateTime),
        meta: [event.location, event.duration_minutes ? `${event.duration_minutes} phút` : '', event.description]
          .filter(Boolean)
          .join(' • '),
      };
    });

    return [...taskItems, ...eventItems].filter((item) => item.date);
  }, [filteredTasks, filteredEvents]);

  if (loading) {
    return <div className="screen-message">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="app-shell">
      <HeaderBar
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        onRefresh={loadAll}
        onLogout={() => {
          localStorage.clear();
          navigate('/');
        }}
      />

      <section className="summary-grid">
        <article className="summary-card"><span>Tổng việc</span><strong>{topStats.total_tasks}</strong></article>
        <article className="summary-card"><span>Đã xong</span><strong>{topStats.completed_tasks}</strong></article>
        <article className="summary-card"><span>Quá hạn</span><strong>{topStats.overdue_tasks}</strong></article>
        <article className="summary-card"><span>Sự kiện</span><strong>{topStats.total_events}</strong></article>
      </section>

      <FilterBar filters={filters} onChange={setFilters} onReset={() => setFilters(DEFAULT_FILTERS)} />
      <DashboardCategoryStats categories={categories} tasks={filteredTasks} events={filteredEvents} />
      {error ? <div className="error-box">{error}</div> : null}

      <main className="dashboard-grid">
        <section className="category-grid">
          {categories.map((category) => (
            <CategoryColumn
              key={category.id}
              category={category}
              tasks={groupedTasks[category.id] || []}
              onCreateTask={createTask}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              onOpenTask={openTaskModal}
              onDropTask={moveTaskToCategory}
              onDragStart={(event, task) => event.dataTransfer.setData('text/plain', String(task.id))}
              onDragEnd={() => {}}
              draggedTaskId={null}
              activeFilters={filters}
            />
          ))}
        </section>

        <aside className="sidebar-grid">
          <WeeklyMonthlyCalendar items={calendarItems} loading={false} error={error} />
          <EventsPanel events={filteredEvents} categories={categories} onCreateEvent={createEvent} onOpenEvent={openEventModal} />
        </aside>
      </main>

      <DetailModal
        open={modal.open}
        type={modal.type}
        item={modal.item}
        categories={categories}
        onClose={() => setModal({ open: false, type: null, item: null })}
        onSaveTask={handleSaveTask}
        onDeleteTask={handleDeleteTask}
        onSaveEvent={handleSaveEvent}
        onDeleteEvent={handleDeleteEvent}
        saving={saving_modal}
      />
    </div>
  );
}
