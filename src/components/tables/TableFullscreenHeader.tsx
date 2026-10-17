import React, { useState } from 'react';
import { 
  Maximize2, Minimize2, Copy, Check, ExternalLink, ChevronRight, 
  Folder, Database, FileText, Users, Receipt, Ship, ShieldCheck, 
  CreditCard, Compass, Anchor, X, CheckCircle2 
} from 'lucide-react';
import { SYSTEM_FOLDERS, buildFolderDirectUrl, copyFolderUrlToClipboard } from '../../navigation/tableNavigationRegistry';
import { AppRouteId } from '../../navigation/routeTypes';

export interface FolderFullscreenHeaderProps {
  tableName?: string;
  folderName?: string;
  tableCategory?: string;
  folderCategory?: string;
  recordCount?: number;
  tableId?: string;
  folderId?: string;
  routeId?: AppRouteId;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onClose: () => void;
  onNavigateToTable?: (targetId: string) => void;
  onNavigateToFolder?: (targetId: string) => void;
  actions?: React.ReactNode;
}

export const TableFullscreenHeader: React.FC<FolderFullscreenHeaderProps> = ({
  tableName,
  folderName,
  tableCategory,
  folderCategory,
  recordCount,
  tableId,
  folderId,
  routeId,
  isFullscreen,
  onToggleFullscreen,
  onClose,
  onNavigateToTable,
  onNavigateToFolder,
  actions,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  const activeId = folderId || tableId || 'quotations';
  const displayName = folderName || tableName || 'Thư Mục Dữ Liệu';
  const displayCategory = folderCategory || tableCategory || 'Hệ Thống Nghiệp Vụ';
  const navigateTarget = onNavigateToFolder || onNavigateToTable;

  const directUrl = buildFolderDirectUrl(activeId, isFullscreen);
  const displayHash = `#${activeId}${isFullscreen ? '?fullscreen=true' : ''}`;

  const handleCopy = async () => {
    try {
      await copyFolderUrlToClipboard(activeId, isFullscreen);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (e) {
      console.warn('Could not copy folder URL:', e);
    }
  };

  const handleOpenNewTab = () => {
    if (typeof window !== 'undefined') {
      window.open(directUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="bg-slate-900 border-b border-slate-700/80 text-white px-4 sm:px-6 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md shrink-0 z-30 select-none">
      {/* Left: Breadcrumbs, Title & Direct URL Pill */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-medium">
          <span className="hover:text-slate-200 transition-colors">Hệ Thống</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-400">Thư Mục Nghiệp Vụ</span>
          {displayCategory && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-300 font-semibold">{displayCategory}</span>
            </>
          )}
        </div>

        <div className="h-4 w-px bg-slate-700 hidden sm:block" />

        <div className="flex items-center space-x-2">
          <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span>{displayName}</span>
            {recordCount !== undefined && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                {recordCount} bản ghi
              </span>
            )}
          </h2>
        </div>

        {/* Dedicated URL Chip */}
        <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-lg px-2 py-1 space-x-1.5 text-[11px] font-mono text-cyan-300">
          <span className="text-slate-400 font-sans text-[10px]">URL:</span>
          <span className="truncate max-w-[140px] sm:max-w-[200px]" title={directUrl}>
            {displayHash}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className={`p-0.5 rounded hover:bg-slate-700 transition-colors cursor-pointer ${copied ? 'text-emerald-400' : 'text-slate-400 hover:text-white'}`}
            title="Sao chép URL riêng của thư mục này"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {copied && (
          <span className="text-[11px] font-medium text-emerald-400 animate-in fade-in flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Đã chép URL!
          </span>
        )}
      </div>

      {/* Right: Custom Actions + Universal Toolbar */}
      <div className="flex items-center flex-wrap gap-1.5 justify-end">
        {actions && <div className="flex items-center gap-1.5 mr-1">{actions}</div>}

        {/* Quick Folder Switcher Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition-colors cursor-pointer"
            title="Chuyển nhanh sang thư mục dữ liệu khác"
          >
            <Folder className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Chuyển Thư Mục</span>
            <span className="text-[10px] text-slate-400">▾</span>
          </button>

          {isSwitcherOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsSwitcherOpen(false)} 
              />
              <div className="absolute right-0 top-full mt-1.5 w-76 max-h-96 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-1.5 space-y-0.5">
                <div className="px-2.5 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase border-b border-slate-800 flex items-center justify-between">
                  <span>Chọn Thư Mục Toàn Màn Hình</span>
                  <span className="text-[9px] text-slate-500 font-mono">14 thư mục</span>
                </div>
                {SYSTEM_FOLDERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setIsSwitcherOpen(false);
                      if (navigateTarget) {
                        navigateTarget(f.id);
                      }
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center space-x-2 transition-colors cursor-pointer ${
                      f.id === activeId 
                        ? 'bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-semibold' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{f.nameVi}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">{f.hash}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Open in New Tab Button */}
        <button
          type="button"
          onClick={handleOpenNewTab}
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition-colors cursor-pointer"
          title="Mở thư mục này trong một tab trình duyệt riêng biệt hoàn chỉnh"
        >
          <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">Mở Tab Mới</span>
        </button>

        {/* Toggle Fullscreen / Windowed Button */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            isFullscreen
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-xs'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
          title={isFullscreen ? 'Thu nhỏ lại chế độ cửa sổ' : 'Phóng to toàn màn hình không viền'}
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-3.5 h-3.5 text-cyan-200" />
              <span>Thu Nhỏ</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Toàn Màn Hình</span>
            </>
          )}
        </button>

        {/* Close / Return Button */}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1 cursor-pointer"
          title="Đóng thư mục và quay lại Bàn làm việc"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export const FolderFullscreenHeader = TableFullscreenHeader;
