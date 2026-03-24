import { Link } from 'react-router-dom';

const STATUS_ORDER = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];
const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress',
  in_review: 'In Review', done: 'Done', cancelled: 'Cancelled',
};

function PriorityBadge({ priority }: { priority: string }) {
  return <span className={`badge badge-${priority.toLowerCase()}`}>{priority}</span>;
}

export function BoardView({ tasks }: { tasks: any[] }) {
  const columns = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABELS[status] || status,
    tasks: tasks.filter((t) => t.status === status),
  })).filter((col) => col.tasks.length > 0 || ['backlog', 'todo', 'in_progress', 'done'].includes(col.status));

  return (
    <div className="board">
      {columns.map((col) => (
        <div key={col.status} className="board-column">
          <div className="board-column-header">
            <span>{col.label}</span>
            <span className="count">{col.tasks.length}</span>
          </div>
          {col.tasks.map((task) => (
            <Link key={task.id} to={`/tasks/${task.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="board-card">
                <h3>{task.title}</h3>
                <div className="meta">
                  <PriorityBadge priority={task.priority} />
                  {task.labels?.length > 0 && <span>{task.labels.join(', ')}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}
