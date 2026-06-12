// @ts-nocheck
import React, { ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  extensionName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ExtensionErrorBoundary extends React.Component<Props, State> {
  public state: State = { hasError: false, error: null };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Extension Error [${this.props.extensionName || 'Unknown'}]:`, error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }
      return (
        <div className="p-4 m-2 bg-red-900/20 border border-red-500/50 rounded flex flex-col items-start gap-2">
            <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                <span>⚠️ Extension Error</span>
            </div>
            <p className="text-xs text-red-300">
                The {this.props.extensionName || 'extension'} encountered an error and was isolated to prevent crashing the editor.
            </p>
            <p className="text-[10px] text-red-200/70 font-mono break-all line-clamp-3">
                {this.state.error?.message}
            </p>
            <button 
                onClick={this.resetError} 
                className="mt-2 px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs rounded transition-colors"
            >
                Try Again
            </button>
        </div>
      );
    }
    return this.props.children;
  }
}
