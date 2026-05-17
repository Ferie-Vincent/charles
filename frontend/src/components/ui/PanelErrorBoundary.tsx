import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  title?: string;
  children: ReactNode;
}
interface State { error: Error | null }

export default class PanelErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[PanelErrorBoundary]', this.props.title ?? 'panel', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="panel-error-boundary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>Erreur dans <strong>{this.props.title ?? 'ce panneau'}</strong> — rechargez la page.</span>
        </div>
      );
    }
    return this.props.children;
  }
}
