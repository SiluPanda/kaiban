import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Nav } from '../components/Nav';
import { api } from '../lib/api';

export function SessionReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<any>(null);
  const [taskDetails, setTaskDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api.getSession(id)
      .then(async (r) => {
        const s = r.data;
        setSession(s);

        if (s.tasksTouched?.length > 0) {
          const details = await Promise.all(
            s.tasksTouched.slice(0, 20).map((taskId: string) =>
              api.getTask(taskId).then(r => r.data).catch(() => null)
            )
          );
          setTaskDetails(details.filter(Boolean));
        }
      })
      .catch((err) => setError(err.message || 'Failed to load session'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="app"><Nav /><div className="main"><div className="loading">Loading session...</div></div></div>;
  if (!session) return <div className="app"><Nav /><div className="main"><div className="error">{error || 'Session not found'}</div></div></div>;

  return (
    <div className="app">
      <Nav />
      <div className="main">
        <Link to="/activity" className="back-link">
          Back to Activity Feed
        </Link>

        <h2 className="page-title" style={{ marginTop: '0.75rem' }}>Session Review</h2>

        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}>
          <div className="info-grid">
            <div>
              <div className="info-item-label">Agent</div>
              <div className="info-item-value">{session.agentName}</div>
            </div>
            <div>
              <div className="info-item-label">User</div>
              <div className="info-item-value">{session.user?.name || session.userId}</div>
            </div>
            <div>
              <div className="info-item-label">Started</div>
              <div className="info-item-value">{new Date(session.startedAt).toLocaleString()}</div>
            </div>
            <div>
              <div className="info-item-label">Ended</div>
              <div className="info-item-value">{session.endedAt ? new Date(session.endedAt).toLocaleString() : 'Still active'}</div>
            </div>
            {session.endedAt && (
              <div>
                <div className="info-item-label">Duration</div>
                <div className="info-item-value">{formatDuration(session.startedAt, session.endedAt)}</div>
              </div>
            )}
            <div>
              <div className="info-item-label">Status</div>
              <div>
                {session.endedAt ? (
                  <span className="session-status-badge completed">Completed</span>
                ) : (
                  <span className="session-status-badge active">Active</span>
                )}
              </div>
            </div>
          </div>

          {session.summary && (
            <div className="summary-block">
              <div className="info-item-label" style={{ marginBottom: '0.25rem' }}>Summary</div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>{session.summary}</div>
            </div>
          )}
        </div>

        {taskDetails.length > 0 && (
          <>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.75rem' }}>Tasks Touched ({taskDetails.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {taskDetails.map(task => (
                <Link key={task.id} to={`/tasks/${task.id}`} className="task-row-card">
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{task.title}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                      {task.project?.name} · {task.status}
                    </div>
                  </div>
                  <span className={`badge badge-${task.priority?.toLowerCase()}`}>{task.priority}</span>
                </Link>
              ))}
            </div>
          </>
        )}

        {taskDetails.length === 0 && session.tasksTouched?.length === 0 && (
          <div className="loading">No tasks were touched in this session.</div>
        )}
      </div>
    </div>
  );
}

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m`;
}
