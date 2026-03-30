'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: '' };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: '' });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex items-center justify-center h-full min-h-[200px] p-8">
          <div className="bg-bg-card border border-red-500/30 rounded-xl p-6 max-w-md text-center">
            <div className="text-2xl mb-3">⚠</div>
            <h3 className="text-white font-semibold mb-2">Something went wrong</h3>
            <p className="text-text-dim text-sm mb-4">{this.state.error}</p>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-white text-black font-medium rounded-lg text-sm hover:bg-accent-hover transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
