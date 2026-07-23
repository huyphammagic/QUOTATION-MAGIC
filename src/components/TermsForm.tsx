import React from 'react';
import { TermsAndConditions, IncotermCode } from '../types/logistics';
import { INCOTERMS_LIST } from '../data/presets';
import { FileText, ShieldAlert, CreditCard, Info, Anchor, Ship, MapPin, Scale } from 'lucide-react';

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
        <span className="font-bold text-xs text-slate-500 uppercase tracking-widest">ĐIỀU KHOẢN THƯƠNG MẠI & PHÂN CHIA CHI PHÍ MUA / BÁN (TERMS & INCOTERMS)</span>
      </div>

      <div className="p-5 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        
        {/* Incoterms Selector & Matrix */}
        <div className="space-y-2 md:col-span-2 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
            <Info className="w-4 h-4 text-blue-600" />
            <span>Điều Kiện Giao Hàng (Incoterms 2020) & Trách Nhiệm Chi Phí *</span>
          </label>
          <select
            value={terms.incoterm}
            onChange={(e) => onChangeTerms({ incoterm: e.target.value as IncotermCode })}
            className="w-full px-3 py-2 rounded border border-slate-300 font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs shadow-2xs"
          >
            {INCOTERMS_LIST.map((inco) => (
              <option key={inco.code} value={inco.code}>
                {inco.code} - {inco.title}
              </option>
            ))}
          </select>

          {selectedIncotermObj && (
            <div className="space-y-2 pt-1">
              <p className="text-[11px] text-slate-700 bg-white p-2.5 rounded border border-slate-200 italic">
                💡 <span className="font-bold text-blue-900">{selectedIncotermObj.code}:</span> {selectedIncotermObj.description}
              </p>

              {/* Responsibility Matrix Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="bg-white p-2 rounded border border-slate-200 flex flex-col items-center text-center">
                  <div className="flex items-center space-x-1 text-[10px] text-slate-500 font-bold uppercase mb-1">
                    <Anchor className="w-3 h-3 text-emerald-600" />
                    <span>Phí POL (Đầu Xuất)</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedIncotermObj.polPaidBy === 'SELLER'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    {selectedIncotermObj.polPaidBy === 'SELLER' ? 'Người Bán (Seller)' : 'Người Mua (Buyer)'}
                  </span>
                </div>

                <div className="bg-white p-2 rounded border border-slate-200 flex flex-col items-center text-center">
                  <div className="flex items-center space-x-1 text-[10px] text-slate-500 font-bold uppercase mb-1">
                    <Ship className="w-3 h-3 text-blue-600" />
                    <span>Cước Main Freight</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedIncotermObj.freightPaidBy === 'SELLER'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    {selectedIncotermObj.freightPaidBy === 'SELLER' ? 'Người Bán (Seller)' : 'Người Mua (Buyer)'}
                  </span>
                </div>

                <div className="bg-white p-2 rounded border border-slate-200 flex flex-col items-center text-center">
                  <div className="flex items-center space-x-1 text-[10px] text-slate-500 font-bold uppercase mb-1">
                    <MapPin className="w-3 h-3 text-purple-600" />
                    <span>Phí POD (Đầu Nhập)</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedIncotermObj.podPaidBy === 'SELLER'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    {selectedIncotermObj.podPaidBy === 'SELLER' ? 'Người Bán (Seller)' : 'Người Mua (Buyer)'}
                  </span>
                </div>

                <div className="bg-white p-2 rounded border border-slate-200 flex flex-col items-center text-center">
                  <div className="flex items-center space-x-1 text-[10px] text-slate-500 font-bold uppercase mb-1">
                    <Scale className="w-3 h-3 text-rose-600" />
                    <span>Thuế Nhập Khẩu</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedIncotermObj.dutyPaidBy === 'SELLER'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-300'
                  }`}>
                    {selectedIncotermObj.dutyPaidBy === 'SELLER' ? 'Người Bán (Seller)' : 'Người Mua (Buyer)'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Payment Term */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
            <span>Điều Khoản Thanh Toán (Payment Terms)</span>
          </label>
          <textarea
            rows={2}
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


