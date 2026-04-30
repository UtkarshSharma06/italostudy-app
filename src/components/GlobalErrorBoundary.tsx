import React, { ErrorInfo, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class GlobalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.logErrorToSupabase(error, errorInfo);
  }

  logErrorToSupabase = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      const metadata = {
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      };

      // Using RPC for secure logging
      await supabase.rpc('log_site_health_event' as any, {
        p_event_type: 'error',
        p_severity: 'high',
        p_url: window.location.pathname,
        p_message: error.message || 'Unknown React Rendering Error',
        p_metadata: metadata
      });
      
      console.error("Logged crash to stability monitor:", error);
    } catch (loggingError) {
      console.error("Failed to log crash to stability monitor:", loggingError);
    }
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 font-sans">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-[3rem] p-12 shadow-2xl border border-slate-100 dark:border-slate-800 text-center space-y-8"
          >
            <div className="relative inline-block">
                <div className="absolute inset-0 bg-rose-500/20 blur-3xl rounded-full" />
                <div className="relative w-24 h-24 bg-rose-50 dark:bg-rose-900/20 rounded-3xl flex items-center justify-center mx-auto border-2 border-rose-100 dark:border-rose-800/50">
                    <AlertTriangle className="w-12 h-12 text-rose-500" />
                </div>
            </div>

            <div className="space-y-4">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">Something snapped.</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-sm mx-auto">
                    The component you're viewing encountered a technical glitch. Our stability monitor has been notified and we're on it.
                </p>
                {this.state.error && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-left overflow-hidden">
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Diagnostic Info</p>
                        <p className="text-xs font-mono text-rose-500 font-bold break-all line-clamp-2">
                           {this.state.error.name}: {this.state.error.message}
                        </p>
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button 
                    onClick={this.handleReset}
                    className="h-14 px-8 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[11px] gap-3 shadow-xl shadow-slate-100 dark:shadow-none transition-all hover:scale-105"
                >
                    <RefreshCw className="w-4 h-4" />
                    Attempt Recovery
                </Button>
                <Button 
                    variant="outline"
                    onClick={() => window.location.href = '/'}
                    className="h-14 px-8 rounded-2xl border-slate-200 dark:border-slate-800 font-black uppercase tracking-widest text-[11px] gap-3"
                >
                    <Home className="w-4 h-4" />
                    Back Home
                </Button>
            </div>
            
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pt-4">
                Incident ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
            </p>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
