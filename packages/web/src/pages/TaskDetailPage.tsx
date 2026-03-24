import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Nav } from '../components/Nav';

function PriorityBadge({ priority }: { priority: string }) {
  return <span className={`badge badge-${priority.toLowerCase()}`}>{priority}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return <span className={`status-badge status-${status}`}>{label}</span>;
}

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');

  const loadTask = () => {
    if (!id) return;
    api.getTask(id)
      .then((r) => setTask(r.data))
      .catch((err) => setError(err.message || 'Failed to load task'))
      .finally(() => setLoading(false));
  };

  useEffect(loadTask, [id]);

  const handleComment = async () => {
    if (!id || !commentText.trim()) return;
    setSubmitting(true);
    setCommentError('');
    try {
      await api.addComment(id, commentText);
      setCommentText('');
      loadTask();
    } catch {
      setCommentError('Failed to post comment');
    }
    setSubmitting(false);
  };

  if (loading) return <div className="app"><Nav /><div className="main"><div className="loading">Loading...</div></div></div>;
  if (!task) return <div className="app"><Nav /><div className="main"><div className="error">{error || 'Task not found'}</div></div></div>;

  return (
    <div className="app">
      <Nav />
      <div className="main">
        <div className="task-detail">
          {task.project && (
            <div style={{ marginBottom: '0.5rem' }}>
              <Link to={`/projects/${task.project.slug}`} className="back-link">
                {task.project.name}
              </Link>
            </div>
          )}
          <h1>{task.title}</h1>

          <div style={{ display: 'flex', gap: '1.5rem', margin: '1rem 0' }}>
            <div className="field">
              <div className="field-label">Status</div>
              <div><StatusBadge status={task.status} /></div>
            </div>
            <div className="field">
              <div className="field-label">Priority</div>
              <div><PriorityBadge priority={task.priority} /></div>
            </div>
            <div className="field">
              <div className="field-label">Assignee</div>
              <div style={{ fontSize: '0.875rem' }}>{task.assignee?.name || '—'}</div>
            </div>
            <div className="field">
              <div className="field-label">Labels</div>
              <div style={{ fontSize: '0.875rem' }}>{task.labels?.length > 0 ? task.labels.join(', ') : '—'}</div>
            </div>
          </div>

          {task.description && (
            <div className="description">{task.description}</div>
          )}

          {task.subtasks && task.subtasks.length > 0 && (
            <div style={{ margin: '1.5rem 0' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.5rem' }}>Sub-tasks ({task.subtasks.length})</h3>
              {task.subtasks.map((st: any) => (
                <Link key={st.id} to={`/tasks/${st.id}`} style={{ display: 'block', padding: '0.375rem 0', fontSize: '0.8125rem', textDecoration: 'none', color: 'inherit' }}>
                  <StatusBadge status={st.status} />
                  <span style={{ marginLeft: '0.5rem' }}>{st.title}</span>
                </Link>
              ))}
            </div>
          )}

          <div className="comments">
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.75rem' }}>Comments ({task.comments?.length || 0})</h3>
            {(task.comments || []).map((c: any) => (
              <div key={c.id} className="comment">
                <div className="author">{new Date(c.createdAt).toLocaleString()}</div>
                <div style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>{c.body}</div>
              </div>
            ))}
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                className="input"
                style={{ flex: 1 }}
              />
              <button
                onClick={handleComment}
                disabled={submitting || !commentText.trim()}
                className="btn-primary"
              >
                Comment
              </button>
            </div>
            {commentError && <div style={{ color: 'var(--red)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>{commentError}</div>}
          </div>

          {task.activities && task.activities.length > 0 && (
            <div className="activity">
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.5rem' }}>Activity ({task.activities.length})</h3>
              {task.activities.slice(0, 15).map((a: any) => (
                <div key={a.id} className="activity-item">
                  {a.action}
                  {a.fieldChanged && ` ${a.fieldChanged}: ${a.oldValue} → ${a.newValue}`}
                  {' — '}
                  {new Date(a.timestamp).toLocaleString()}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
