import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Building2, 
  ShieldCheck, 
  DollarSign, 
  Layers, 
  TrendingUp,
  Truck,
  Ship,
  Sparkles
} from 'lucide-react';
import { CustomerRecord } from '../../types/logistics';
import { SupplierItem, CarrierItem } from '../../types/masterRate';
import { ContractListTab } from './ContractListTab';
import { FolderFullscreenHeader } from '../tables/TableFullscreenHeader';

interface ContractHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: CustomerRecord[];
  suppliers: SupplierItem[];
  carriers: CarrierItem[];
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onNavigateToTable?: (id: string) => void;
}

export const ContractHubModal: React.FC<ContractHubModalProps> = ({
  isOpen,
  onClose,
  customers,
  suppliers,
  carriers,
  isFullscreen,
  onToggleFullscreen,
  onNavigateToTable,
}) => {
  const [localFullscreen, setLocalFullscreen] = useState(true);
  const effectiveFullscreen = isFullscreen !== undefined ? isFullscreen : localFullscreen;
  const handleToggleFs = onToggleFullscreen || (() => setLocalFullscreen(!localFullscreen));

  if (!isOpen) return null;

  return (
    <div 
      className={effectiveFullscreen
        ? "fixed inset-0 z-50 flex flex-col p-0 m-0 w-screen h-screen overflow-hidden bg-slate-950"
        : "fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      }
    >
      <div 
        className={effectiveFullscreen
          ? "bg-white w-screen h-screen max-w-none max-h-none rounded-none flex flex-col overflow-hidden border-0"
          : "bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden border border-slate-200 flex flex-col max-h-[94vh]"
        }
        id="contract-hub-modal"
      >
        {/* Fullscreen Folder Navigation & URL Header */}
        <FolderFullscreenHeader
          folderName="Thư Mục Hợp Đồng Dịch Vụ Logistics"
          folderCategory="Biểu Cước & Phí"
          folderId="contracts"
          routeId="pricing_contracts"
          isFullscreen={effectiveFullscreen}
          onToggleFullscreen={handleToggleFs}
          onClose={onClose}
          onNavigateToFolder={onNavigateToTable}
        />

        {/* Main Banner */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl shadow-inner">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold tracking-tight">
                  Quản Lý Hợp Đồng Khách Hàng & Hãng Vận Chuyển (Contracts)
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 rounded border border-indigo-400/30">
                  Rate Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Quản lý điều khoản thương mại, cam kết cước và giải mã biểu cước tự động
              </p>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/60">
          <ContractListTab
            customers={customers}
            suppliers={suppliers}
            carriers={carriers}
          />
        </div>
      </div>
    </div>
  );
};
