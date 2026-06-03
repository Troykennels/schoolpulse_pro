import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'var(--sp-bg, #f5f5f0)',
          color: 'var(--sp-slate-900, #1a1d23)',
          fontFamily: 'var(--font-body, system-ui, sans-serif)',
        }}>
          <div style={{
            width: '100%',
            maxWidth: 560,
            background: 'white',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: 24,
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
          }}>
            <h1 style={{ fontSize: 22, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ color: '#636977', marginBottom: 16 }}>
              The page hit a rendering error. Refresh once; if it remains, share this message.
            </p>
            <pre style={{
              whiteSpace: 'pre-wrap',
              background: '#fff5f5',
              color: '#991b1b',
              borderRadius: 8,
              padding: 12,
              fontSize: 13,
            }}>{this.state.error.message}</pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                marginTop: 16,
                padding: '10px 16px',
                border: 0,
                borderRadius: 8,
                background: '#115740',
                color: 'white',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
