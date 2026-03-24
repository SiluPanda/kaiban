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
        <h2 className="page-title">Projects</h2>
        {loading && <div className="loading">Loading...</div>}
        {!loading && projects.length === 0 && <div className="loading">No projects found. Configure your API key or create a project.</div>}
        {projects.map((p) => (
          <Link key={p.id} to={`/projects/${p.slug}`} className="project-card">
            <strong>{p.name}</strong>
            <div className="slug">{p.slug}</div>
            {p.description && <div className="desc">{p.description}</div>}
          </Link>
        ))}
      </div>
    </div>
  );
}
