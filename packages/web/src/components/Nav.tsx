import { Link } from 'react-router-dom';

export function Nav() {
  return (
    <nav className="nav">
      <Link to="/" className="nav-logo">Pith</Link>
      <Link to="/">Projects</Link>
      <Link to="/activity">Agent Activity</Link>
    </nav>
  );
}
