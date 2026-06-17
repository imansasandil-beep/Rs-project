import { Component } from 'react';

/**
 * Catches render-time crashes so one broken chart does not blank the whole app.
 * Class syntax is not a style choice — React has no hook equivalent of
 * componentDidCatch.
 */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ui] render error', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="empty empty--error" role="alert">
        <h3 className="empty__title">This section stopped working</h3>
        <p className="empty__message">
          {this.state.error.message || 'An unexpected error occurred while rendering.'}
        </p>
        <div className="empty__action">
          <button type="button" className="btn btn--secondary btn--md" onClick={this.reset}>
            Try again
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--md"
            onClick={() => window.location.reload()}
          >
            Reload the page
          </button>
        </div>
      </div>
    );
  }
}
