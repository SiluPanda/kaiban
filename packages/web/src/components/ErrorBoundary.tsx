import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          <h2 style={{ color: 'var(--red, #DC2626)', fontSize: '1.25rem', fontWeight: 600 }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-secondary, #78716C)', marginTop: '0.5rem' }}>{this.state.error?.message}</p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              background: 'var(--accent, #2563EB)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 500,
              fontFamily: 'inherit',
            }}
          >
            Go to home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
