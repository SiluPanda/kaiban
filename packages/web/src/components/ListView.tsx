import { Link } from 'react-router-dom';

function PriorityBadge({ priority }: { priority: string }) {
  return <span className={`badge badge-${priority.toLowerCase()}`}>{priority}</span>;
}

export function ListView({ tasks }: { tasks: any[] }) {
  return (
    <table className="task-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Status</th>
          <th>Priority</th>
          <th>Labels</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <tr key={task.id}>
            <td><Link to={`/tasks/${task.id}`}>{task.title}</Link></td>
            <td>{task.status}</td>
            <td><PriorityBadge priority={task.priority} /></td>
            <td>{task.labels.length > 0 ? task.labels.join(', ') : '—'}</td>
            <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{new Date(task.createdAt).toLocaleDateString()}</td>
          </tr>
        ))}
        {tasks.length === 0 && (
          <tr><td colSpan={5} style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No tasks</td></tr>
        )}
      </tbody>
    </table>
  );
}
