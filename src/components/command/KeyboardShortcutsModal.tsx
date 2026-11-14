import React from 'react';
import { 
  X, 
  Command, 
  Keyboard, 
  Save, 
  Plus, 
  FileText, 
  Download, 
  Layers, 
  DollarSign, 
  Radar, 
  TrendingUp, 
  Database, 
  Users, 
  Tag, 
  Sparkles,
  Search
} from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCommandPalette: () => void;
}

interface ShortcutEntry {
  keys: string[];
  description: string;
  category: string;
  icon?: any;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  onOpenCommandPalette,
}) => {
  if (!isOpen) return null;

  const shortcutSections = [
    {
      title: 'Thao Tác Toàn Cục & Tìm Kiếm Nhanh',
      items: [
        {
          keys: ['Ctrl', 'K'],
          description: 'Mở Command Palette tra cứu nhanh cảng biển, phụ phí, khách hàng, và lệnh',
          icon: Search,
        },
        {
          keys: ['?'],
          description: 'Mở bảng tổng hợp phím tắt thao tác nhanh này',
          icon: Keyboard,
        },
        {
          keys: ['Esc'],
          description: 'Đóng modal, cửa sổ pop-up hoặc hủy tìm kiếm hiện tại',
          icon: X,
        },
      ],
    },
    {
      title: 'Quản Lý Báo Giá & Xuất Bản',
      items: [
        {
          keys: ['Ctrl', 'S'],
          description: 'Lưu báo giá hiện tại (Auto-save draft & đồng bộ Cloud Firestore)',
          icon: Save,
        },
        {
          keys: ['Ctrl', 'N'],
          description: 'Khởi tạo bản báo giá mới sạch sẽ',
          icon: Plus,
        },
        {
          keys: ['Ctrl', 'P'],
          description: 'Mở hộp thoại xuất file PDF Báo giá chuyên nghiệp',
          icon: FileText,
        },
        {
          keys: ['Ctrl', 'E'],
          description: 'Xuất file bảng tính Excel chi tiết kèm biểu phí và công thức',
          icon: Download,
        },
      ],
    },
    {
      title: 'Tốc Độ Nhập Liệu & Thư Viện Chuyên Tuyến',
      items: [
        {
          keys: ['Ctrl', 'Shift', 'R'],
          description: 'Mở Thư viện Tuyến Mẫu 1-Click (FCL Mỹ, LCL Châu Á, Air Express...)',
          icon: Layers,
        },
        {
          keys: ['Ctrl', 'Shift', 'S'],
          description: 'Mở Danh mục Phụ phí chuẩn & biểu phí Local Charges',
          icon: Tag,
        },
        {
          keys: ['Ctrl', 'Shift', 'C'],
          description: 'Mở Quản lý Danh bạ Khách hàng CRM và hạn mức công nợ',
          icon: Users,
        },
        {
          keys: ['Ctrl', 'B'],
          description: 'Mở Quản lý Biểu cước Gốc Master Rates Hub (So sánh giá mua hãng tàu)',
          icon: Database,
        },
      ],
    },
    {
      title: 'Tài Chính & Tháp Điều Hành Logistics',
      items: [
        {
          keys: ['Ctrl', 'Shift', 'E'],
          description: 'Mở Trung tâm Tỷ giá USD Realtime Vietcombank & Liên ngân hàng',
          icon: DollarSign,
        },
        {
          keys: ['Ctrl', 'Shift', 'T'],
          description: 'Mở Tháp Điều Hành Lô Hàng (Control Tower & Theo dõi rủi ro Dem/Det)',
          icon: Radar,
        },
        {
          keys: ['Ctrl', 'D'],
          description: 'Mở / đóng nhanh Cockpit & BI Dashboard (hỗ trợ thêm Ctrl + Shift + D)',
          icon: TrendingUp,
        },
      ],
    },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Bảng Phím Tắt Thao Tác Nhanh
                <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Sale Speed x3
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Làm chủ các phím tắt để tối ưu hóa 300% tốc độ tạo báo giá và xử lý nghiệp vụ logistics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {shortcutSections.map((section, idx) => (
            <div key={idx} className="space-y-2.5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {section.title}
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {section.items.map((item, itemIdx) => {
                  const ItemIcon = item.icon;
                  return (
                    <div 
                      key={itemIdx}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-4">
                        {ItemIcon && (
                          <div className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 shrink-0 shadow-2xs">
                            <ItemIcon className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <span className="text-xs sm:text-sm font-medium text-slate-800">
                          {item.description}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {item.keys.map((k, kIdx) => (
                          <React.Fragment key={kIdx}>
                            <kbd className="px-2 py-1 text-xs font-mono font-semibold text-slate-700 bg-white border border-slate-300 rounded shadow-2xs min-w-6 text-center">
                              {k}
                            </kbd>
                            {kIdx < item.keys.length - 1 && (
                              <span className="text-xs text-slate-400 font-bold">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Áp dụng trên cả macOS (Cmd) và Windows/Linux (Ctrl)</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCommandPalette();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            <Command className="w-3.5 h-3.5" />
            <span>Mở Command Palette (Ctrl + K)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
