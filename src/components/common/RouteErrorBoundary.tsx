import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, ChevronDown, ChevronUp, ShieldAlert, Sparkles, WifiOff } from 'lucide-react';

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
  isChunkLoadError: boolean;
}

export class RouteErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      isChunkLoadError: false,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    const isChunkLoadError = 
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Importing a module script failed') ||
      error?.message?.includes('error loading dynamically imported module') ||
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('dynamically imported module');

    return { 
      hasError: true, 
      error,
      isChunkLoadError: Boolean(isChunkLoadError),
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[RouteErrorBoundary] Uncaught module error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    if (this.state.isChunkLoadError) {
      // Chunk load error means the browser cached an outdated chunk hash from a previous deployment
      // Force reload page to fetch the latest index.html and assets from server
      window.location.reload();
      return;
    }

    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleHardReload = () => {
    // Clear all chunk retry session tokens and hard reload
    try {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('retry-chunk-reload-')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch {
      // Ignore sessionStorage access errors
    }
    window.location.reload();
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
      const { isChunkLoadError } = this.state;

      return (
        <div 
          id="route-error-boundary-container"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 text-slate-800 text-left">
            <div className="flex items-center gap-3.5 mb-4">
              <div className={`p-3 rounded-xl ${isChunkLoadError ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                {isChunkLoadError ? <WifiOff className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {isChunkLoadError ? 'Cần Tải Lại Phiên Bản Mới' : 'Gặp Sự Cố Khi Tải Module'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {routeName ? `Module: ${routeName}` : 'Thành phần giao diện gặp lỗi runtime'}
                </p>
              </div>
            </div>

            {isChunkLoadError ? (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 leading-relaxed">
                <div className="flex items-center gap-1.5 font-semibold text-blue-900 mb-1">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Hệ thống vừa cập nhật phiên bản mới
                </div>
                Máy chủ vừa triển khai bản cập nhật mới nên mã nguồn module tạm thời không khớp với bộ nhớ đệm trình duyệt của bạn. Dữ liệu báo giá đang soạn thảo đã được tự động lưu an toàn vào cơ sở dữ liệu.
              </div>
            ) : (
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                Hệ thống đã tự động cách ly lỗi để bảo toàn dữ liệu báo giá đang soạn thảo. Bạn có thể thử tải lại module hoặc quay về màn hình chính.
              </p>
            )}

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
                {isChunkLoadError ? 'Tải Lại Ứng Dụng' : 'Thử Lại'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
