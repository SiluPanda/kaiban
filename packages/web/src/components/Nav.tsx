import { Link } from 'react-router-dom';

export function Nav() {
  return (
    <nav className="nav">
      <Link to="/"><h1>Pith</h1></Link>
      <Link to="/">Projects</Link>
      <Link to="/activity">Agent Activity</Link>
    </nav>
  );
}
