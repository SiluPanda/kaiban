import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Nav } from '../components/Nav';

function PriorityBadge({ priority }: { priority: string }) {
  return <span className={`badge badge-${priority.toLowerCase()}`}>{priority}</span>;
}

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');

  const loadTask = () => {
    if (!id) return;
    api.getTask(id)
      .then((r) => setTask(r.data))
      .catch(() => {})
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
  if (!task) return <div className="app"><Nav /><div className="main"><div className="error">Task not found</div></div></div>;

  return (
    <div className="app">
      <Nav />
      <div className="main">
        <div className="task-detail">
          {task.project && (
            <div style={{ marginBottom: '0.5rem' }}>
              <Link to={`/projects/${task.project.slug}`} style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {task.project.name}
              </Link>
            </div>
          )}
          <h1>{task.title}</h1>

          <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0' }}>
            <div className="field">
              <div className="field-label">Status</div>
              <div>{task.status}</div>
            </div>
            <div className="field">
              <div className="field-label">Priority</div>
              <div><PriorityBadge priority={task.priority} /></div>
            </div>
            <div className="field">
              <div className="field-label">Assignee</div>
              <div>{task.assignee?.name || '—'}</div>
            </div>
            <div className="field">
              <div className="field-label">Labels</div>
              <div>{task.labels?.length > 0 ? task.labels.join(', ') : '—'}</div>
            </div>
          </div>

          {task.description && (
            <div className="description">{task.description}</div>
          )}

          {task.subtasks && task.subtasks.length > 0 && (
            <div style={{ margin: '1.5rem 0' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Sub-tasks ({task.subtasks.length})</h3>
              {task.subtasks.map((st: any) => (
                <Link key={st.id} to={`/tasks/${st.id}`} style={{ display: 'block', padding: '0.375rem 0', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-secondary)', marginRight: '0.5rem' }}>{st.status}</span>
                  {st.title}
                </Link>
              ))}
            </div>
          )}

          <div className="comments">
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Comments ({task.comments?.length || 0})</h3>
            {(task.comments || []).map((c: any) => (
              <div key={c.id} className="comment">
                <div className="author">{new Date(c.createdAt).toLocaleString()}</div>
                <div style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>{c.body}</div>
              </div>
            ))}
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)' }}
              />
              <button
                onClick={handleComment}
                disabled={submitting || !commentText.trim()}
                style={{ background: 'var(--accent)', color: 'var(--bg)', border: 'none', padding: '0.5rem 1rem', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 500 }}
              >
                Comment
              </button>
            </div>
            {commentError && <div style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{commentError}</div>}
          </div>

          {task.activities && task.activities.length > 0 && (
            <div className="activity">
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Activity ({task.activities.length})</h3>
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
