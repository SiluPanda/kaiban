import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Nav } from '../components/Nav';
import { api } from '../lib/api';

export function ActivityFeedPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listSessions()
      .then(r => setSessions(r.data || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const agentFilter = searchParams.get('agent') || '';
  const filtered = agentFilter
    ? sessions.filter(s => (s.agentName || '').toLowerCase().includes(agentFilter.toLowerCase()))
    : sessions;

  return (
    <div className="app">
      <Nav />
      <div className="main">
        <h2 className="page-title">Agent Activity Feed</h2>

        <div className="toolbar">
          <input
            type="text"
            placeholder="Filter by agent name..."
            value={agentFilter}
            onChange={e => {
              const val = e.target.value;
              if (val) setSearchParams({ agent: val });
              else setSearchParams({});
            }}
            className="input"
            style={{ width: '300px' }}
          />
        </div>

        {loading && <div className="loading">Loading sessions...</div>}
        {error && <div className="error">{error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div className="loading">No agent sessions found.</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map(session => (
            <Link key={session.id} to={`/sessions/${session.id}`} className="session-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.9375rem' }}>{session.agentName}</strong>
                  <span style={{ marginLeft: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {new Date(session.startedAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  {session.endedAt ? (
                    <span className="session-status-badge completed">completed</span>
                  ) : (
                    <span className="session-status-badge active">active</span>
                  )}
                </div>
              </div>
              {session.summary && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.375rem' }}>
                  {session.summary}
                </div>
              )}
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                Tasks touched: {session.tasksTouched?.length || 0}
                {session.endedAt && ` · Duration: ${formatDuration(session.startedAt, session.endedAt)}`}
              </div>
            </Link>
          ))}
        </div>
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
