import React from 'react';

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

export class AppErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[EstateFlow Error Boundary]', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                    <div className="size-20 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined text-4xl">error_outline</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Algo deu errado</h1>
                    <p className="text-slate-500 mb-2 max-w-md">O sistema encontrou um erro inesperado. Tente recarregar a página.</p>
                    <p className="text-xs text-slate-400 mb-8 font-mono bg-slate-100 p-3 rounded-lg max-w-lg break-all">
                        {this.state.error?.message}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                    >
                        Recarregar Sistema
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
