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

interface ContractHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: CustomerRecord[];
  suppliers: SupplierItem[];
  carriers: CarrierItem[];
}

export const ContractHubModal: React.FC<ContractHubModalProps> = ({
  isOpen,
  onClose,
  customers,
  suppliers,
  carriers,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden border border-slate-200 flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-150"
        id="contract-hub-modal"
      >
        {/* Main Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl shadow-inner">
              <FileText className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">
                  Quản Lý Hợp Đồng Khách Hàng & Nhà Cung Cấp
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 rounded border border-indigo-400/30">
                  Phase 14 Engine
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Contract Rate Engine &bull; Quản lý điều khoản thương mại, cam kết cước và giải mã biểu cước tự động
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/60">
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
