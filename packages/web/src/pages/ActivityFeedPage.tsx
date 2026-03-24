import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Nav } from '../components/Nav';

export function ActivityFeedPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const apiKey = localStorage.getItem('pith_api_key') || '';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  useEffect(() => {
    fetch('/api/v1/sessions?limit=50', { headers })
      .then(r => r.json())
      .then(r => setSessions(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const agentFilter = searchParams.get('agent') || '';
  const filtered = agentFilter
    ? sessions.filter(s => s.agentName.toLowerCase().includes(agentFilter.toLowerCase()))
    : sessions;

  return (
    <div className="app">
      <Nav />
      <div className="main">
        <h2 style={{ marginBottom: '1rem' }}>Agent Activity Feed</h2>

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
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)', width: '300px' }}
          />
        </div>

        {loading && <div className="loading">Loading sessions...</div>}

        {!loading && filtered.length === 0 && (
          <div className="loading">No agent sessions found.</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map(session => (
            <Link key={session.id} to={`/sessions/${session.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '1rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{session.agentName}</strong>
                    <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {new Date(session.startedAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    {session.endedAt ? (
                      <span className="badge" style={{ background: 'var(--green)', color: 'var(--bg)', padding: '0.125rem 0.5rem', borderRadius: '10px', fontSize: '0.75rem' }}>
                        completed
                      </span>
                    ) : (
                      <span className="badge" style={{ background: 'var(--yellow)', color: 'var(--bg)', padding: '0.125rem 0.5rem', borderRadius: '10px', fontSize: '0.75rem' }}>
                        active
                      </span>
                    )}
                  </div>
                </div>
                {session.summary && (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.375rem' }}>
                    {session.summary}
                  </div>
                )}
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  Tasks touched: {session.tasksTouched?.length || 0}
                  {session.endedAt && ` · Duration: ${formatDuration(session.startedAt, session.endedAt)}`}
                </div>
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
