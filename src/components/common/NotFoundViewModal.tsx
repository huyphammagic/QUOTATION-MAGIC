import React from 'react';
import { Compass, ArrowLeft, Home } from 'lucide-react';

interface NotFoundViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestedPath?: string;
}

export const NotFoundViewModal: React.FC<NotFoundViewModalProps> = ({
  isOpen,
  onClose,
  requestedPath,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      id="not-found-route-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 text-slate-800 text-center">
        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
          <Compass className="w-7 h-7 animate-pulse" />
        </div>

        <h3 className="text-xl font-black text-slate-900 mb-1">
          404 - Tuyến Đường Không Tồn Tại
        </h3>
        
        {requestedPath && (
          <div className="font-mono text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg mb-3 inline-block max-w-full truncate">
            {requestedPath}
          </div>
        )}

        <p className="text-xs text-slate-600 mb-6 leading-relaxed">
          Đường dẫn bạn vừa truy cập không thuộc danh mục chức năng hoặc đã được di chuyển. Mời bạn quay về Bàn làm việc báo giá hoặc chọn chức năng từ Sidebar.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            id="btn-not-found-home"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Về Bàn Làm Việc Báo Giá
          </button>
        </div>
      </div>
    </div>
  );
};
