import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Anchor, 
  Box, 
  FileText, 
  CreditCard, 
  RefreshCw, 
  Globe2, 
  CheckCircle2, 
  Info,
  ChevronRight
} from 'lucide-react';
import { fetchMasterData, MasterDataItem } from '../services/repository/masterDataRepository';
import { NavigationLanguage, NAVIGATION_I18N } from '../i18n/navigation';

export type MasterDataType = 'PORT' | 'CONTAINER_TYPE' | 'INCOTERM' | 'PAYMENT_TERM';

interface MasterDataReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: NavigationLanguage;
  initialType?: MasterDataType;
}

export const MasterDataReferenceModal: React.FC<MasterDataReferenceModalProps> = ({
  isOpen,
  onClose,
  language = 'vi',
  initialType = 'PORT',
}) => {
  const [activeTab, setActiveTab] = useState<MasterDataType>(initialType);
  const [items, setItems] = useState<MasterDataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const t = NAVIGATION_I18N[language];

  useEffect(() => {
    if (initialType) {
      setActiveTab(initialType);
    }
  }, [initialType, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoading(true);
    fetchMasterData(activeTab)
      .then((data) => {
        if (isMounted) {
          setItems(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load master data:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredItems = items.filter((item) => {
    const q = search.toLowerCase();
    return (
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.code && item.code.toLowerCase().includes(q)) ||
      (item.country && item.country.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  });

  const tabs: { type: MasterDataType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { type: 'PORT', label: t.portsLocations, icon: Anchor },
    { type: 'CONTAINER_TYPE', label: t.containerTypes, icon: Box },
    { type: 'INCOTERM', label: t.incotermsTerms, icon: FileText },
    { type: 'PAYMENT_TERM', label: t.paymentTerms, icon: CreditCard },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div 
        className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={t.referenceData}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>{t.referenceData}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Cloud Firestore
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'vi' 
                  ? 'Tra cứu quy chuẩn logistics: cảng biển, chủng loại container, Incoterms, điều khoản thanh toán' 
                  : 'Logistics reference master data: ports, container equipment, Incoterms, payment conditions'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 px-4 pt-2 gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.type;
            return (
              <button
                key={tab.type}
                type="button"
                onClick={() => {
                  setActiveTab(tab.type);
                  setSearch('');
                }}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-lg text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${
                  isActive
                    ? 'bg-white text-blue-700 border-blue-600 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Filter Bar */}
        <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === 'vi' ? 'Tìm kiếm danh mục theo tên, mã code...' : 'Search master data by code or name...'}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetchMasterData(activeTab, true).then((data) => {
                setItems(data);
                setLoading(false);
              });
            }}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Làm mới từ Firestore"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">{language === 'vi' ? 'Làm mới' : 'Refresh'}</span>
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-xs">{language === 'vi' ? 'Đang nạp dữ liệu từ Cloud Firestore...' : 'Loading from Cloud Firestore...'}</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Info className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-medium">{language === 'vi' ? 'Không tìm thấy dữ liệu phù hợp' : 'No matching records found'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-200 transition-all flex items-start justify-between gap-3 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-mono font-bold">
                        {item.code}
                      </span>
                      {item.country && (
                        <span className="text-[11px] text-slate-500 font-medium truncate">
                          &bull; {item.country}
                        </span>
                      )}
                      {item.isActive && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-auto" />
                      )}
                    </div>
                    <h3 className="text-xs font-bold text-slate-800 group-hover:text-blue-900 transition-colors">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>{filteredItems.length} {language === 'vi' ? 'mục hiển thị' : 'items displayed'}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
          >
            {language === 'vi' ? 'Đóng' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
