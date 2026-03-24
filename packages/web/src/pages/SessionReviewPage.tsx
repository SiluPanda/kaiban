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
  if (!session) return <div className="app"><Nav /><div className="main"><div className="error" style={{ color: 'var(--red)' }}>{error || 'Session not found'}</div></div></div>;

  return (
    <div className="app">
      <Nav />
      <div className="main">
        <Link to="/activity" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Back to Activity Feed
        </Link>

        <h2 style={{ marginTop: '0.75rem', marginBottom: '1rem' }}>Session Review</h2>

        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Agent</div>
              <div style={{ fontWeight: 600 }}>{session.agentName}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>User</div>
              <div>{session.user?.name || session.userId}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Started</div>
              <div>{new Date(session.startedAt).toLocaleString()}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Ended</div>
              <div>{session.endedAt ? new Date(session.endedAt).toLocaleString() : 'Still active'}</div>
            </div>
            {session.endedAt && (
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Duration</div>
                <div>{formatDuration(session.startedAt, session.endedAt)}</div>
              </div>
            )}
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Status</div>
              <div>
                {session.endedAt ? (
                  <span style={{ color: 'var(--green)' }}>Completed</span>
                ) : (
                  <span style={{ color: 'var(--yellow)' }}>Active</span>
                )}
              </div>
            </div>
          </div>

          {session.summary && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Summary</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{session.summary}</div>
            </div>
          )}
        </div>

        {taskDetails.length > 0 && (
          <>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Tasks Touched ({taskDetails.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {taskDetails.map(task => (
                <Link key={task.id} to={`/tasks/${task.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{task.title}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {task.project?.name} · {task.status}
                      </div>
                    </div>
                    <span className={`badge badge-${task.priority?.toLowerCase()}`}>{task.priority}</span>
                  </div>
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
