import React, { useState } from 'react';
import { CompanyProfile, QuoteData } from '../types/logistics';
import { 
  Folder, 
  FolderOpen, 
  ChevronDown, 
  ChevronRight, 
  Building2, 
  ShieldCheck, 
  UserCheck, 
  CreditCard, 
  Eye, 
  Settings, 
  FileText, 
  Plus, 
  Printer, 
  Users, 
  Receipt, 
  Coins, 
  Database, 
  Ship, 
  ExternalLink,
  Sparkles,
  Layers,
  History,
  FileDown,
  Layout,
  Archive,
  Mail,
  Send,
  Calendar, 
  LayoutDashboard,
  TrendingUp,
  Sliders
} from 'lucide-react';

interface SidebarProps {
  company: CompanyProfile;
  savedQuotes: QuoteData[];
  customersCount?: number;
  surchargesCount?: number;
  rateMastersCount?: number;
  chargeMastersCount?: number;
  exchangeRate: number;
  lastAutoSaveTime: string | null;
  isAutoSaving?: boolean;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onNewQuote: () => void;
  onOpenSavedQuotes: () => void;
  onOpenCompanyProfile: (tab?: 'profile' | 'sales' | 'bank' | 'preview') => void;
  onOpenCustomers: () => void;
  onOpenSurchargeCatalog: () => void;
  onOpenMasterRateHub?: (tab?: 'RATES' | 'CHARGES' | 'AUDIT') => void;
  onOpenRateSearch?: () => void;
  onOpenSmartAssistant?: () => void;
  onOpenDataBackup: () => void;
  onOpenPreview?: () => void;
  onOpenDocumentHistory?: () => void;
  onOpenTemplateBuilder?: () => void;
  onOpenGeneratePdf?: () => void;
  onOpenSendModal?: () => void;
  onOpenCommunication?: () => void;
  onOpenEmailTemplates?: () => void;
  onOpenFollowUps?: () => void;
  onOpenDashboard?: () => void;
  onOpenContracts?: () => void;
  contractsCount?: number;
  onOpenProfitIntelligence?: () => void;
  onOpenPricingPolicies?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  company,
  savedQuotes,
  customersCount = 0,
  surchargesCount = 0,
  rateMastersCount = 0,
  chargeMastersCount = 0,
  exchangeRate,
  lastAutoSaveTime,
  isAutoSaving,
  isOpenMobile,
  onCloseMobile,
  onNewQuote,
  onOpenSavedQuotes,
  onOpenCompanyProfile,
  onOpenCustomers,
  onOpenSurchargeCatalog,
  onOpenMasterRateHub,
  onOpenRateSearch,
  onOpenSmartAssistant,
  onOpenDataBackup,
  onOpenPreview,
  onOpenDocumentHistory,
  onOpenTemplateBuilder,
  onOpenGeneratePdf,
  onOpenSendModal,
  onOpenCommunication,
  onOpenEmailTemplates,
  onOpenFollowUps,
  onOpenDashboard,
  onOpenContracts,
  contractsCount = 0,
  onOpenProfitIntelligence,
  onOpenPricingPolicies,
}) => {
  // Folder open/closed states
  const [openFolders, setOpenFolders] = useState<{ [key: string]: boolean }>({
    company: true,
    quotes: true,
    communication: true,
    masterData: true,
    system: true,
  });

  const toggleFolder = (folderKey: string) => {
    setOpenFolders(prev => ({
      ...prev,
      [folderKey]: !prev[folderKey]
    }));
  };

  const handleAction = (callback: () => void) => {
    callback();
    if (isOpenMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/70 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Main Sidebar Container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 lg:w-76 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto shrink-0 select-none ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top App Header */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md shrink-0">
              <Ship className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-xs text-white uppercase tracking-wider truncate">
                Thư Mục Quản Lý
              </h2>
              <p className="text-[10px] text-blue-400 font-medium truncate">
                {company.shortName || 'Logistics Pro'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleAction(onNewQuote)}
            className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold flex items-center space-x-1 shadow-2xs transition-colors"
            title="Tạo báo giá mới"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-[11px] pr-0.5">Mới</span>
          </button>
        </div>

        {/* Directory / Folder Tree Navigation Area */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2 text-xs custom-scrollbar">
          
          {/* Quick Launch: Business Intelligence & Analytics Dashboard (Phase 9) */}
          {onOpenDashboard && (
            <button
              type="button"
              onClick={() => handleAction(onOpenDashboard)}
              className="w-full flex items-center justify-between p-2.5 rounded-lg bg-gradient-to-r from-blue-900/60 via-indigo-900/50 to-blue-800/60 hover:from-blue-800/80 hover:to-indigo-800/80 text-white border border-blue-500/50 shadow-xs transition-all group mb-2"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-2xs group-hover:scale-105 transition-transform">
                  <LayoutDashboard className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                    <span>Dashboard & BI</span>
                    <span className="text-[9px] bg-blue-500/40 text-blue-200 px-1 rounded font-mono">Phase 9</span>
                  </div>
                  <p className="text-[10px] text-blue-300/80 truncate">Phân tích kinh doanh & KPIs</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-blue-300 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          )}

          {/* FOLDER 1: THÔNG TIN CÔNG TY (FORWARDER PROFILE) */}
          <div className="rounded-lg bg-slate-800/40 border border-slate-800/80 overflow-hidden">
            {/* Folder Header */}
            <button
              type="button"
              onClick={() => toggleFolder('company')}
              className="w-full flex items-center justify-between p-2.5 hover:bg-slate-800/70 text-slate-200 hover:text-white transition-colors text-left"
            >
              <div className="flex items-center space-x-2 min-w-0">
                {openFolders.company ? (
                  <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span className="font-semibold text-xs text-slate-100 truncate">
                  Thông Tin Doanh Nghiệp
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-[10px] text-slate-400 px-1.5 py-0.2 rounded bg-slate-800">
                  4 mục
                </span>
                {openFolders.company ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
            </button>

            {/* Folder Items */}
            {openFolders.company && (
              <div className="pl-3 pr-2 py-1.5 space-y-0.5 border-t border-slate-800/60 bg-slate-900/40">
                
                {/* Item 1: Pháp lý & Trụ sở */}
                <button
                  type="button"
                  onClick={() => handleAction(() => onOpenCompanyProfile('profile'))}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left group"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0 group-hover:text-blue-300" />
                    <span className="text-xs truncate">Pháp Lý & Trụ Sở</span>
                  </div>
                  <span className="text-[10px] text-slate-500 group-hover:text-slate-300 font-mono">
                    MST
                  </span>
                </button>

                {/* Item 2: Sales Rep */}
                <button
                  type="button"
                  onClick={() => handleAction(() => onOpenCompanyProfile('sales'))}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left group"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 group-hover:text-emerald-300" />
                    <span className="text-xs truncate">Người Lập Báo Giá</span>
                  </div>
                  <span className="text-[10px] text-slate-500 group-hover:text-slate-300 truncate max-w-[80px]">
                    {company.salesRepName ? company.salesRepName.split(' ').slice(-1)[0] : 'Sales'}
                  </span>
                </button>

                {/* Item 3: Banking Account */}
                <button
                  type="button"
                  onClick={() => handleAction(() => onOpenCompanyProfile('bank'))}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left group"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-400 shrink-0 group-hover:text-indigo-300" />
                    <span className="text-xs truncate">Tài Khoản Ngân Hàng</span>
                  </div>
                  <span className="text-[10px] text-slate-500 group-hover:text-slate-300 font-mono">
                    TK
                  </span>
                </button>

                {/* Item 4: Header & Preview */}
                <button
                  type="button"
                  onClick={() => handleAction(() => onOpenCompanyProfile('preview'))}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left group"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <Eye className="w-3.5 h-3.5 text-cyan-400 shrink-0 group-hover:text-cyan-300" />
                    <span className="text-xs truncate">Mẫu Header & Đóng Dấu</span>
                  </div>
                  <span className="text-[10px] text-slate-500 group-hover:text-slate-300">
                    Xem mẫu
                  </span>
                </button>

                {/* Item 5: Quản lý đầy đủ */}
                <button
                  type="button"
                  onClick={() => handleAction(() => onOpenCompanyProfile('profile'))}
                  className="w-full mt-1 flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-md bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white border border-blue-500/30 transition-colors text-xs font-medium"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Quản Lý Toàn Bộ Profile</span>
                </button>

              </div>
            )}
          </div>

          {/* FOLDER 2: QUẢN LÝ BÁO GIÁ (QUOTES MANAGEMENT) */}
          <div className="rounded-lg bg-slate-800/40 border border-slate-800/80 overflow-hidden">
            {/* Folder Header */}
            <button
              type="button"
              onClick={() => toggleFolder('quotes')}
              className="w-full flex items-center justify-between p-2.5 hover:bg-slate-800/70 text-slate-200 hover:text-white transition-colors text-left"
            >
              <div className="flex items-center space-x-2 min-w-0">
                {openFolders.quotes ? (
                  <FolderOpen className="w-4 h-4 text-blue-400 shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-blue-400 shrink-0" />
                )}
                <span className="font-semibold text-xs text-slate-100 truncate">
                  Quản Lý Báo Giá
                </span>
              </div>
              <div className="flex items-center space-x-1">
                {savedQuotes.length > 0 && (
                  <span className="text-[10px] font-bold text-white px-1.5 py-0.2 rounded-full bg-blue-600 font-mono">
                    {savedQuotes.length}
                  </span>
                )}
                {openFolders.quotes ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
            </button>

            {/* Folder Items */}
            {openFolders.quotes && (
              <div className="pl-3 pr-2 py-1.5 space-y-0.5 border-t border-slate-800/60 bg-slate-900/40">
                
                {/* Item: Tạo mới */}
                <button
                  type="button"
                  onClick={() => handleAction(onNewQuote)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left group"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0 group-hover:text-emerald-300" />
                    <span className="text-xs truncate">Tạo Báo Giá Mới</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-medium">
                    Ctrl+N
                  </span>
                </button>

                {/* Item: Danh sách đã lưu */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenSavedQuotes)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left group"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0 group-hover:text-blue-300" />
                    <span className="text-xs truncate">Báo Giá Đã Lưu</span>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono font-bold">
                    {savedQuotes.length}
                  </span>
                </button>

                {/* Item: Báo Cáo & Phân Tích BI */}
                {onOpenDashboard && (
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenDashboard)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left group bg-blue-950/20 border border-blue-800/30"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <LayoutDashboard className="w-3.5 h-3.5 text-blue-400 shrink-0 group-hover:text-blue-300" />
                      <span className="text-xs font-semibold text-blue-200 truncate">Báo Cáo & Phân Tích (BI)</span>
                    </div>
                    <span className="text-[9px] bg-blue-700 text-blue-100 font-bold px-1.5 py-0.2 rounded font-mono">
                      KPIs
                    </span>
                  </button>
                )}

                {/* Item: Phân Tích Lợi Nhuận & What-If Pricing (Phase 15) */}
                {onOpenProfitIntelligence && (
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenProfitIntelligence)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-emerald-200 hover:text-white transition-colors text-left group bg-emerald-950/20 border border-emerald-800/30"
                    id="sidebar-btn-profit-intelligence"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0 group-hover:text-emerald-300" />
                      <span className="text-xs font-semibold truncate">Biên Lãi & What-If</span>
                    </div>
                    <span className="text-[9px] bg-emerald-700 text-emerald-100 font-bold px-1.5 py-0.2 rounded font-mono">
                      Phase 15
                    </span>
                  </button>
                )}

                {/* Item: Xem trước A4 */}
                {onOpenPreview && (
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenPreview)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left group"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <Printer className="w-3.5 h-3.5 text-purple-400 shrink-0 group-hover:text-purple-300" />
                      <span className="text-xs truncate">Xem Trước Bản In (A4)</span>
                    </div>
                    <span className="text-[10px] text-purple-400 font-medium">
                      Xem
                    </span>
                  </button>
                )}

                {/* Item: Phát Hành PDF Chính Thức (Snapshot) */}
                {onOpenGeneratePdf && (
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenGeneratePdf)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 hover:text-white border border-rose-800/40 transition-colors text-left group"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <FileDown className="w-3.5 h-3.5 text-rose-400 shrink-0 group-hover:text-rose-300" />
                      <span className="text-xs font-semibold truncate">Phát Hành PDF (Chính Thức)</span>
                    </div>
                    <span className="text-[9px] bg-rose-800 text-rose-100 px-1.5 py-0.2 rounded font-bold">
                      A4 Pro
                    </span>
                  </button>
                )}

                {/* Item: Kho Tài Liệu PDF & Snapshot History */}
                {onOpenDocumentHistory && (
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenDocumentHistory)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left group"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <Archive className="w-3.5 h-3.5 text-purple-400 shrink-0 group-hover:text-purple-300" />
                      <span className="text-xs truncate">Kho PDF & Snapshots</span>
                    </div>
                    <span className="text-[10px] text-purple-400 font-mono">
                      Lịch sử
                    </span>
                  </button>
                )}

                {/* Item: Trình Thiết Kế Mẫu (Template Builder) */}
                {onOpenTemplateBuilder && (
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenTemplateBuilder)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left group"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <Layout className="w-3.5 h-3.5 text-cyan-400 shrink-0 group-hover:text-cyan-300" />
                      <span className="text-xs truncate">Mẫu Báo Giá (Templates)</span>
                    </div>
                    <span className="text-[10px] text-cyan-400 font-mono">
                      Builder
                    </span>
                  </button>
                )}

              </div>
            )}
          </div>

          {/* FOLDER: GIAO TIẾP & BẢO MẬT (COMMUNICATION & SECURITY) */}
          <div className="rounded-lg bg-slate-800/40 border border-slate-800/80 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleFolder('communication')}
              className="w-full flex items-center justify-between p-2.5 hover:bg-slate-800/70 text-slate-200 hover:text-white transition-colors text-left"
            >
              <div className="flex items-center space-x-2 min-w-0">
                {openFolders.communication ? (
                  <FolderOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-indigo-400 shrink-0" />
                )}
                <span className="font-semibold text-xs text-slate-100 truncate">
                  Giao Tiếp & Bảo Mật
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-[9px] font-bold text-white px-1.5 py-0.2 rounded-full bg-indigo-600 font-mono">
                  Phase 8
                </span>
                {openFolders.communication ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
            </button>

            {openFolders.communication && (
              <div className="pl-3 pr-2 py-1.5 space-y-0.5 border-t border-slate-800/60 bg-slate-900/40">
                {/* Item: Gửi Báo Giá */}
                {onOpenSendModal && (
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenSendModal)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md bg-blue-950/40 hover:bg-blue-900/60 text-blue-200 hover:text-white border border-blue-800/40 transition-colors text-left group"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <Send className="w-3.5 h-3.5 text-blue-400 shrink-0 group-hover:text-blue-300" />
                      <span className="text-xs font-semibold truncate">Gửi Email Khách Hàng</span>
                    </div>
                    <span className="text-[9px] bg-blue-800 text-blue-100 px-1.5 py-0.2 rounded font-bold">
                      Send
                    </span>
                  </button>
                )}

                {/* Item: Tiến Trình & Lịch Sử Gửi */}
                {onOpenCommunication && (
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenCommunication)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left group"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0 group-hover:text-indigo-300" />
                      <span className="text-xs truncate">Tiến Trình & Lịch Sử Gửi</span>
                    </div>
                    <span className="text-[10px] text-indigo-400 font-mono">
                      Timeline
                    </span>
                  </button>
                )}

                {/* Item: Mẫu Email Báo Giá */}
                {onOpenEmailTemplates && (
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenEmailTemplates)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left group"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0 group-hover:text-cyan-300" />
                      <span className="text-xs truncate">Mẫu Email (Templates)</span>
                    </div>
                    <span className="text-[10px] text-cyan-400 font-mono">
                      Mẫu
                    </span>
                  </button>
                )}

                {/* Item: Lịch Chăm Sóc Khách Hàng */}
                {onOpenFollowUps && (
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenFollowUps)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left group"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0 group-hover:text-emerald-300" />
                      <span className="text-xs truncate">Lịch Chăm Sóc (Follow-Up)</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      Hẹn
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* FOLDER 3: DỮ LIỆU NỀN TẢNG (MASTER RATES & DATA) */}
          <div className="rounded-lg bg-slate-800/40 border border-slate-800/80 overflow-hidden">
            {/* Folder Header */}
            <button
              type="button"
              onClick={() => toggleFolder('masterData')}
              className="w-full flex items-center justify-between p-2.5 hover:bg-slate-800/70 text-slate-200 hover:text-white transition-colors text-left"
            >
              <div className="flex items-center space-x-2 min-w-0">
                {openFolders.masterData ? (
                  <FolderOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span className="font-semibold text-xs text-slate-100 truncate">
                  Bảng Giá Master & Phụ Phí
                </span>
              </div>
              <div className="flex items-center space-x-1">
                {rateMastersCount > 0 && (
                  <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded font-mono">
                    {rateMastersCount}
                  </span>
                )}
                {openFolders.masterData ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
            </button>

            {/* Folder Items */}
            {openFolders.masterData && (
              <div className="pl-3 pr-2 py-1.5 space-y-0.5 border-t border-slate-800/60 bg-slate-900/40">
                
                {/* Item: Bảng Giá Master */}
                {onOpenMasterRateHub && (
                  <button
                    type="button"
                    onClick={() => handleAction(() => onOpenMasterRateHub('RATES'))}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left group"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <Database className="w-3.5 h-3.5 text-blue-400 shrink-0 group-hover:text-blue-300" />
                      <span className="text-xs font-semibold text-slate-200 truncate">Bảng Giá Master (Rates)</span>
                    </div>
                    {rateMastersCount > 0 && (
                      <span className="text-[10px] bg-blue-900/60 text-blue-300 border border-blue-700/50 px-1.5 py-0.5 rounded font-mono font-bold">
                        {rateMastersCount}
                      </span>
                    )}
                  </button>
                )}

                {/* Item: Hợp Đồng Khách Hàng & NCC (Phase 14) */}
                {onOpenContracts && (
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenContracts)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left group bg-gradient-to-r from-purple-950/40 to-indigo-950/40 border border-purple-800/40"
                    id="sidebar-btn-contracts"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0 group-hover:text-purple-300" />
                      <span className="text-xs font-semibold text-purple-200 truncate">Hợp Đồng KH & NCC</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {contractsCount > 0 && (
                        <span className="text-[10px] bg-purple-900/80 text-purple-200 border border-purple-700/50 px-1.5 py-0.2 rounded font-mono font-bold">
                          {contractsCount}
                        </span>
                      )}
                      <span className="text-[9px] bg-purple-600 text-white font-black px-1.5 py-0.2 rounded uppercase">
                        Phase 14
                      </span>
                    </div>
                  </button>
                )}

                {/* Item: Chính Sách Giá & Biên Lãi (Phase 15) */}
                {onOpenPricingPolicies && (
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenPricingPolicies)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left group bg-gradient-to-r from-emerald-950/40 to-teal-950/40 border border-emerald-800/40"
                    id="sidebar-btn-pricing-policies"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <Sliders className="w-3.5 h-3.5 text-emerald-400 shrink-0 group-hover:text-emerald-300" />
                      <span className="text-xs font-semibold text-emerald-200 truncate">Chính Sách Biên Lãi</span>
                    </div>
                    <span className="text-[9px] bg-emerald-600 text-white font-black px-1.5 py-0.2 rounded uppercase">
                      Phase 15
                    </span>
                  </button>
                )}

                {/* Item: Smart Rate Assistant */}
                {onOpenSmartAssistant && (
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenSmartAssistant)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left group bg-gradient-to-r from-blue-900/40 to-indigo-900/30 border border-blue-800/40"
                    id="sidebar-btn-smart-assistant"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0 group-hover:text-yellow-300" />
                      <span className="text-xs font-semibold text-blue-200 truncate">Smart Rate Assistant</span>
                    </div>
                    <span className="text-[9px] bg-blue-700 text-white font-bold px-1.5 py-0.2 rounded uppercase">
                      AI Auto
                    </span>
                  </button>
                )}

                {/* Item: Tra Cứu Nhanh Bảng Giá */}
                {onOpenRateSearch && (
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenRateSearch)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left group"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover:text-amber-300" />
                      <span className="text-xs truncate">Tra Cứu Bảng Giá Nhanh</span>
                    </div>
                    <span className="text-[10px] text-amber-400 font-medium">Search</span>
                  </button>
                )}

                {/* Item: Danh Mục Phí Chuẩn */}
                {onOpenMasterRateHub && (
                  <button
                    type="button"
                    onClick={() => handleAction(() => onOpenMasterRateHub('CHARGES'))}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left group"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0 group-hover:text-emerald-300" />
                      <span className="text-xs truncate">Danh Mục Phí Chuẩn</span>
                    </div>
                    {chargeMastersCount > 0 && (
                      <span className="text-[10px] bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                        {chargeMastersCount}
                      </span>
                    )}
                  </button>
                )}

                {/* Item: Khách hàng */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenCustomers)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left group"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0 group-hover:text-cyan-300" />
                    <span className="text-xs truncate">Danh Mục Khách Hàng (CRM)</span>
                  </div>
                  {customersCount > 0 && (
                    <span className="text-[10px] bg-slate-800 text-cyan-400 px-1.5 py-0.5 rounded font-mono">
                      {customersCount}
                    </span>
                  )}
                </button>

                {/* Item: Phụ phí catalog */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenSurchargeCatalog)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left group"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <Receipt className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover:text-amber-300" />
                    <span className="text-xs truncate">Catalog Phụ Phí Đã Lưu</span>
                  </div>
                  {surchargesCount > 0 && (
                    <span className="text-[10px] bg-slate-800 text-amber-400 px-1.5 py-0.5 rounded font-mono">
                      {surchargesCount}
                    </span>
                  )}
                </button>

                {/* Item: Audit log */}
                {onOpenMasterRateHub && (
                  <button
                    type="button"
                    onClick={() => handleAction(() => onOpenMasterRateHub('AUDIT'))}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left group"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <History className="w-3.5 h-3.5 text-purple-400 shrink-0 group-hover:text-purple-300" />
                      <span className="text-xs truncate">Lịch Sử & Audit Log</span>
                    </div>
                    <span className="text-[10px] text-purple-400 font-medium">Log</span>
                  </button>
                )}

              </div>
            )}
          </div>

          {/* FOLDER 4: CÀI ĐẶT & HỆ THỐNG (SYSTEM & SETTINGS) */}
          <div className="rounded-lg bg-slate-800/40 border border-slate-800/80 overflow-hidden">
            {/* Folder Header */}
            <button
              type="button"
              onClick={() => toggleFolder('system')}
              className="w-full flex items-center justify-between p-2.5 hover:bg-slate-800/70 text-slate-200 hover:text-white transition-colors text-left"
            >
              <div className="flex items-center space-x-2 min-w-0">
                {openFolders.system ? (
                  <FolderOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-indigo-400 shrink-0" />
                )}
                <span className="font-semibold text-xs text-slate-100 truncate">
                  Cài Đặt & Sao Lưu
                </span>
              </div>
              <div className="flex items-center space-x-1">
                {openFolders.system ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
            </button>

            {/* Folder Items */}
            {openFolders.system && (
              <div className="pl-3 pr-2 py-1.5 space-y-0.5 border-t border-slate-800/60 bg-slate-900/40">
                
                {/* Item: Tỷ giá */}
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-slate-300 text-xs">
                  <div className="flex items-center space-x-2 min-w-0">
                    <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">Tỷ Giá USD/VND:</span>
                  </div>
                  <span className="font-mono font-bold text-amber-300 text-[11px]">
                    {exchangeRate.toLocaleString()}
                  </span>
                </div>

                {/* Item: Sao lưu JSON */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenDataBackup)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left group"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <Database className="w-3.5 h-3.5 text-indigo-400 shrink-0 group-hover:text-indigo-300" />
                    <span className="text-xs truncate">Sao Lưu & Phục Hồi</span>
                  </div>
                  <span className="text-[10px] text-slate-500 group-hover:text-slate-300 font-mono">
                    JSON
                  </span>
                </button>

              </div>
            )}
          </div>

        </div>

        {/* Sidebar Status Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1 text-slate-400">
              <span className={`w-1.5 h-1.5 rounded-full ${isAutoSaving ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
              <span>Tự động lưu:</span>
            </span>
            <span className="font-mono text-emerald-400 font-medium">
              {isAutoSaving ? 'Đang lưu...' : (lastAutoSaveTime || 'Sẵn sàng')}
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
            <span>Phiên bản Enterprise</span>
            <span className="font-mono text-slate-400">v2.5 Pro</span>
          </div>
        </div>

      </aside>
    </>
  );
};
