import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  routeName?: string;
  onReset?: () => void;
  onNavigateHome?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class RouteErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[RouteErrorBoundary] Uncaught module error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onNavigateHome) {
      this.props.onNavigateHome();
    } else {
      window.location.hash = '';
    }
  };

  public render() {
    if (this.state.hasError) {
      const { routeName } = this.props;
      return (
        <div 
          id="route-error-boundary-container"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 text-slate-800 text-left">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Gặp Sự Cố Khi Tải Module
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {routeName ? `Module: ${routeName}` : 'Thành phần giao diện gặp lỗi runtime'}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Hệ thống đã tự động cách ly lỗi để bảo toàn dữ liệu báo giá đang soạn thảo. Bạn có thể thử tải lại module hoặc quay về màn hình chính.
            </p>

            {/* Collapsible Error Trace */}
            <div className="mb-5 border border-slate-200 rounded-xl overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition-colors"
              >
                <span className="flex items-center gap-1.5 font-mono text-[11px]">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                  {this.state.error?.name || 'Chi tiết lỗi kỹ thuật'}
                </span>
                {this.state.showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {this.state.showDetails && (
                <div className="p-3 bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-48 whitespace-pre-wrap">
                  <div className="text-red-400 font-bold mb-1">
                    {this.state.error?.message || 'Unknown runtime error'}
                  </div>
                  <div className="text-slate-400 text-[10px] leading-tight">
                    {this.state.error?.stack || this.state.errorInfo?.componentStack || 'No stack trace available'}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                id="btn-error-boundary-home"
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Về Bàn Làm Việc
              </button>
              <button
                type="button"
                id="btn-error-boundary-retry"
                onClick={this.handleRetry}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Thử Lại
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
