import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Nav } from '../components/Nav';
import { BoardView } from '../components/BoardView';
import { ListView } from '../components/ListView';

type ViewMode = 'board' | 'list';

export function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tasks, setTasks] = useState<any[]>([]);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<ViewMode>('board');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    const params: Record<string, string> = { limit: '100' };
    if (statusFilter) params.status = statusFilter;
    if (priorityFilter) params.priority = priorityFilter;

    setError('');
    Promise.all([
      api.getProject(slug),
      api.listTasks(slug, params),
    ]).then(([proj, tasksRes]) => {
      setProject(proj.data);
      setTasks(tasksRes.data || []);
    }).catch(err => setError(err.message || 'Failed to load project'))
      .finally(() => setLoading(false));
  }, [slug, statusFilter, priorityFilter]);

  return (
    <div className="app">
      <Nav />
      <div className="main">
        {project && <h2 className="page-title">{project.name}</h2>}
        <div className="toolbar">
          <div className="tabs">
            <button className={`tab ${view === 'board' ? 'active' : ''}`} onClick={() => setView('board')}>Board</button>
            <button className={`tab ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>List</button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="backlog">Backlog</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="done">Done</option>
            </select>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="">All priorities</option>
              <option value="P0">P0 - Critical</option>
              <option value="P1">P1 - High</option>
              <option value="P2">P2 - Medium</option>
              <option value="P3">P3 - Low</option>
            </select>
          </div>
        </div>
        {loading && <div className="loading">Loading tasks...</div>}
        {error && <div className="error">{error}</div>}
        {!loading && view === 'board' && <BoardView tasks={tasks} />}
        {!loading && view === 'list' && <ListView tasks={tasks} />}
      </div>
    </div>
  );
}
