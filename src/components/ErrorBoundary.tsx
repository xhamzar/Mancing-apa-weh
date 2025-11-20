import React from 'react';
import { RotateCcw, AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Game Crash Caught:", error, errorInfo);
  }

  private handleReset = () => {
    if (window.confirm("WARNING: This will delete your save file to fix corruption. Are you sure?")) {
        localStorage.removeItem('fg_state_react_v3');
        window.location.reload();
    }
  };

  private handleReload = () => {
      this.setState({ hasError: false, error: null });
      window.location.reload();
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center font-sans">
          <div className="bg-red-500/10 p-6 rounded-full mb-6 ring-1 ring-red-500/50">
             <AlertTriangle size={64} className="text-red-500" />
          </div>
          
          <h1 className="text-3xl font-bold mb-2 tracking-tight">Game Paused (Error)</h1>
          <p className="text-slate-400 mb-8 max-w-md leading-relaxed">
            The game encountered an unexpected issue. We've paused execution to prevent any data loss.
          </p>
          
          <div className="bg-black/30 p-4 rounded-xl mb-8 w-full max-w-lg overflow-hidden border border-white/10 text-left">
             <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1 font-bold">Error Log</div>
             <code className="text-xs text-red-300 font-mono break-words block">
                 {this.state.error?.toString() || "Unknown Error"}
             </code>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <button 
                onClick={this.handleReload}
                className="flex-1 px-6 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
            >
                <RefreshCw size={18} /> Reload Game
            </button>
            
            <button 
                onClick={this.handleReset}
                className="flex-1 px-6 py-3 bg-red-600/10 border border-red-500/30 text-red-400 rounded-xl font-bold hover:bg-red-600/20 transition flex items-center justify-center gap-2"
            >
                <RotateCcw size={18} /> Reset Data
            </button>
          </div>
          
          <div className="mt-8 text-xs text-slate-600">
             If this persists, try clearing your browser cache.
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}