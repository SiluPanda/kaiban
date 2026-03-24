import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from './lib/api';
import { Nav } from './components/Nav';

export function App() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listProjects()
      .then((r) => setProjects(r.data || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="app">
      <Nav />
      <div className="main">
        <h2 style={{ marginBottom: '1rem' }}>Projects</h2>
        {loading && <div className="loading">Loading...</div>}
        {!loading && projects.length === 0 && <div className="loading">No projects found. Configure your API key or create a project.</div>}
        {projects.map((p) => (
          <Link key={p.id} to={`/projects/${p.slug}`} style={{ display: 'block', marginBottom: '0.5rem' }}>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
              <strong>{p.name}</strong>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{p.slug}</div>
              {p.description && <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{p.description}</div>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
