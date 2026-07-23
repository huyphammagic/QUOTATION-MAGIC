import React from 'react';
import { TermsAndConditions, IncotermCode } from '../types/logistics';
import { INCOTERMS_LIST } from '../data/presets';
import { FileText, ShieldAlert, CreditCard, Info } from 'lucide-react';

interface TermsFormProps {
  terms: TermsAndConditions;
  onChangeTerms: (updated: Partial<TermsAndConditions>) => void;
}

export const TermsForm: React.FC<TermsFormProps> = ({ terms, onChangeTerms }) => {

  const selectedIncotermObj = INCOTERMS_LIST.find((i) => i.code === terms.incoterm);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
      
      {/* Title */}
      <div className="p-4 border-b border-slate-100 flex items-center space-x-2">
        <FileText className="w-4 h-4 text-blue-700" />
        <span className="font-bold text-xs text-slate-500 uppercase tracking-widest">ĐIỀU KHOẢN THƯƠNG MẠI & THANH TOÁN (TERMS & CONDITIONS)</span>
      </div>

      <div className="p-5 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        
        {/* Incoterms Selector */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <span>Điều Kiện Giao Hàng (Incoterm 2020) *</span>
          </label>
          <select
            value={terms.incoterm}
            onChange={(e) => onChangeTerms({ incoterm: e.target.value as IncotermCode })}
            className="w-full px-3 py-2 rounded border border-slate-200 font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
          >
            {INCOTERMS_LIST.map((inco) => (
              <option key={inco.code} value={inco.code}>
                {inco.code} - {inco.title}
              </option>
            ))}
          </select>
          {selectedIncotermObj && (
            <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 italic">
              💡 {selectedIncotermObj.description}
            </p>
          )}
        </div>

        {/* Payment Term */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
            <span>Điều Khoản Thanh Toán (Payment Terms)</span>
          </label>
          <textarea
            rows={3}
            value={terms.paymentTerm}
            onChange={(e) => onChangeTerms({ paymentTerm: e.target.value })}
            className="w-full px-3 py-2 rounded border border-slate-200 text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            placeholder="Thanh toán 100% trước khi lấy lệnh D/O hoặc phát hành B/L copy..."
          />
        </div>

        {/* Exclusions & Special Notes */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>Ngoại Trừ Chi Phí & Ghi Chú Bảo Hành Báo Giá (Exclusions & Notes)</span>
          </label>
          <textarea
            rows={3}
            value={terms.exclusionsNotes}
            onChange={(e) => onChangeTerms({ exclusionsNotes: e.target.value })}
            className="w-full px-3 py-2 rounded border border-slate-200 text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans text-xs"
            placeholder="• Báo giá chưa bao gồm thuế NK/VAT tại POD&#10;• Không bao gồm phí kiểm hóa luồng đỏ/kiểm dịch phát sinh&#10;• Cước đường biển có thể thay đổi theo thông báo từ Hãng tàu"
          />
        </div>

        {/* Bank Account Info */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Thông Tin Tài Khoản Ngân Hàng (Company Banking Info)</label>
          <textarea
            rows={3}
            value={terms.bankAccountInfo}
            onChange={(e) => onChangeTerms({ bankAccountInfo: e.target.value })}
            className="w-full px-3 py-2 rounded border border-slate-200 font-mono text-[11px] text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

      </div>

    </div>
  );
};

