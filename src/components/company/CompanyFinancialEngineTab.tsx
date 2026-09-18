/**
 * Phase 38: CompanyFinancialEngineTab Component
 * Comprehensive UI for Multi-Company Financial & Commercial Configuration.
 * 
 * 5 Dedicated Logistics Financial Modules:
 * 1. Currency & Rounding Policy (USD/VND, FX buffer %, rounding rules)
 * 2. Tax & VAT Logistics Policies (Exclusive/Inclusive, International 0%, Local 8%, Customs 10%, FCT)
 * 3. Payment Terms & Commercial Credit (Prepaid, Net 15/30/45, Deposit %, Credit Limit)
 * 4. Multi-Bank Accounts & Remittance (USD Account, VND Account, SWIFT code, instructions)
 * 5. Commercial Floor Margins & Snapshot Engine
 */

import React, { useState } from 'react';
import {
  DollarSign,
  Receipt,
  Clock,
  Landmark,
  ShieldAlert,
  Percent,
  Plus,
  Trash2,
  Check,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  HelpCircle,
  FileText,
  Layers,
  ArrowRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { useFinancialConfig } from '../../context/FinancialConfigContext';
import { useMultiCompany } from '../../context/MultiCompanyContext';
import {
  CompanyTaxRule,
  CompanyPaymentTerm,
  CompanyBankAccount,
  TaxVatPolicy,
  RoundingMethod,
  ExchangeRateMode
} from '../../types/financialConfig';

export const CompanyFinancialEngineTab: React.FC = () => {
  const { activeCompanyRecord } = useMultiCompany();
  const {
    isLoading,
    saveStatus,
    statusMessage,
    financialSettings,
    taxConfig,
    paymentTerms,
    bankAccounts,
    commercialSettings,
    updateFinancialSettings,
    updateTaxConfig,
    savePaymentTermAction,
    deletePaymentTermAction,
    saveBankAccountAction,
    deleteBankAccountAction,
    updateCommercialSettings,
    refreshAllFinancialData
  } = useFinancialConfig();

  const [subTab, setSubTab] = useState<'currency' | 'tax' | 'payment' | 'bank' | 'commercial'>('currency');

  // Form local states
  const [editingPaymentTerm, setEditingPaymentTerm] = useState<Partial<CompanyPaymentTerm> | null>(null);
  const [isAddingPaymentTerm, setIsAddingPaymentTerm] = useState(false);

  const [editingBankAccount, setEditingBankAccount] = useState<Partial<CompanyBankAccount> | null>(null);
  const [isAddingBankAccount, setIsAddingBankAccount] = useState(false);

  const [editingTaxRule, setEditingTaxRule] = useState<Partial<CompanyTaxRule> | null>(null);
  const [isAddingTaxRule, setIsAddingTaxRule] = useState(false);

  // Financial Settings State
  const [fxRate, setFxRate] = useState<number>(financialSettings.defaultExchangeRate || 25400);
  const [fxBuffer, setFxBuffer] = useState<number>(financialSettings.exchangeRateMarginBufferPercent || 0.5);
  const [fxMode, setFxMode] = useState<ExchangeRateMode>(financialSettings.exchangeRateMode || 'MANUAL');
  const [usdDecimals, setUsdDecimals] = useState<number>(financialSettings.roundingRules?.usdDecimals ?? 2);
  const [vndDecimals, setVndDecimals] = useState<number>(financialSettings.roundingRules?.vndDecimals ?? 0);
  const [roundingMethod, setRoundingMethod] = useState<RoundingMethod>(financialSettings.roundingRules?.method || 'HALF_UP');
  const [nearestHundredVnd, setNearestHundredVnd] = useState<boolean>(!!financialSettings.roundingRules?.enableNearestHundredVnd);

  // Tax Settings State
  const [vatPolicy, setVatPolicy] = useState<TaxVatPolicy>(taxConfig.defaultPolicy || 'EXCLUSIVE');
  const [defaultVatRate, setDefaultVatRate] = useState<number>(taxConfig.defaultVatRate || 8);
  const [enableFct, setEnableFct] = useState<boolean>(!!taxConfig.enableFctForeignTax);
  const [fctRate, setFctRate] = useState<number>(taxConfig.defaultFctRate || 2);
  const [taxCodeInput, setTaxCodeInput] = useState<string>(taxConfig.taxCode || activeCompanyRecord?.taxCode || '');

  // Commercial Settings State
  const [validityDays, setValidityDays] = useState<number>(commercialSettings.defaultValidityDays || 15);
  const [floorMargin, setFloorMargin] = useState<number>(commercialSettings.minimumFloorMarginPercent || 8);
  const [targetMargin, setTargetMargin] = useState<number>(commercialSettings.targetProfitMarginPercent || 18);
  const [maxDiscount, setMaxDiscount] = useState<number>(commercialSettings.maxSalesDiscountPercent || 5);
  const [requireMarginApproval, setRequireMarginApproval] = useState<boolean>(commercialSettings.requireApprovalBelowMargin ?? true);
  const [exclusionsVi, setExclusionsVi] = useState<string>(commercialSettings.defaultExclusionsNotesVi || '');
  const [exclusionsEn, setExclusionsEn] = useState<string>(commercialSettings.defaultExclusionsNotesEn || '');

  // Effective FX Rate calculation preview
  const effectiveFxRate = Math.round(fxRate * (1 + fxBuffer / 100));

  const handleSaveCurrencySettings = async () => {
    await updateFinancialSettings({
      defaultExchangeRate: Number(fxRate) || 25400,
      exchangeRateMarginBufferPercent: Number(fxBuffer) || 0,
      exchangeRateMode: fxMode,
      roundingRules: {
        usdDecimals: Number(usdDecimals),
        vndDecimals: Number(vndDecimals),
        method: roundingMethod,
        enableNearestHundredVnd: nearestHundredVnd,
      },
    });
  };

  const handleSaveTaxPolicySettings = async () => {
    await updateTaxConfig({
      taxCode: taxCodeInput,
      defaultPolicy: vatPolicy,
      defaultVatRate: Number(defaultVatRate),
      enableFctForeignTax: enableFct,
      defaultFctRate: Number(fctRate),
    });
  };

  const handleSaveCommercialSettings = async () => {
    await updateCommercialSettings({
      defaultValidityDays: Number(validityDays) || 15,
      minimumFloorMarginPercent: Number(floorMargin) || 8,
      targetProfitMarginPercent: Number(targetMargin) || 18,
      maxSalesDiscountPercent: Number(maxDiscount) || 5,
      requireApprovalBelowMargin: requireMarginApproval,
      defaultExclusionsNotesVi: exclusionsVi,
      defaultExclusionsNotesEn: exclusionsEn,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Company Context */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Phase 38 Engine
              </span>
              <h3 className="text-lg font-bold text-white tracking-wide">
                Cấu Hình Tài Chính & Thương Mại Doanh Nghiệp
              </h3>
            </div>
            <p className="text-sm text-slate-300 mt-1">
              Áp dụng riêng biệt cho thực thể pháp nhân:{' '}
              <span className="font-semibold text-amber-300">
                {activeCompanyRecord?.legalName || activeCompanyRecord?.displayName || 'Công Ty Mặc Định'}
              </span>{' '}
              ({activeCompanyRecord?.companyCode || 'LOG-01'})
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            {saveStatus === 'SAVING' && (
              <span className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-500/30">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang đồng bộ Firebase...
              </span>
            )}
            {saveStatus === 'SAVED' && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" /> Dữ liệu đã lưu
              </span>
            )}
            {saveStatus === 'SAVE_FAILED' && (
              <span className="flex items-center gap-1.5 text-xs text-rose-300 bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-500/30">
                <AlertCircle className="w-3.5 h-3.5" /> Lỗi lưu
              </span>
            )}

            <button
              onClick={() => refreshAllFinancialData()}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Tải lại từ Firebase"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="mt-3 text-xs px-3 py-1.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 pb-0.5">
        <button
          onClick={() => setSubTab('currency')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            subTab === 'currency'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Tiền Tệ & Tỷ Giá
        </button>

        <button
          onClick={() => setSubTab('tax')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            subTab === 'tax'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Thuế & VAT Logistics
        </button>

        <button
          onClick={() => setSubTab('payment')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            subTab === 'payment'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Clock className="w-4 h-4" />
          Điều Khoản Thanh Toán ({paymentTerms.length})
        </button>

        <button
          onClick={() => setSubTab('bank')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            subTab === 'bank'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Landmark className="w-4 h-4" />
          Tài Khoản Ngân Hàng ({bankAccounts.length})
        </button>

        <button
          onClick={() => setSubTab('commercial')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            subTab === 'commercial'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Chính Sách Lợi Nhuận & Snapshot
        </button>
      </div>

      {/* SUB-TAB 1: CURRENCY & ROUNDING */}
      {subTab === 'currency' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Currency & Mode Box */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                Đồng Tiền & Chế Độ Quy Đổi
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Đồng Tiền Cơ Sở (Base)
                  </label>
                  <select
                    value={financialSettings.baseCurrency}
                    onChange={(e) => updateFinancialSettings({ baseCurrency: e.target.value as any })}
                    className="w-full text-sm border-slate-300 rounded-lg px-3 py-2 bg-slate-50 font-medium"
                  >
                    <option value="USD">USD - Đô la Mỹ</option>
                    <option value="VND">VND - Việt Nam Đồng</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Đồng Tiền Phụ (Secondary)
                  </label>
                  <select
                    value={financialSettings.secondaryCurrency}
                    onChange={(e) => updateFinancialSettings({ secondaryCurrency: e.target.value as any })}
                    className="w-full text-sm border-slate-300 rounded-lg px-3 py-2 bg-slate-50 font-medium"
                  >
                    <option value="VND">VND - Việt Nam Đồng</option>
                    <option value="USD">USD - Đô la Mỹ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Cơ Chế Xác Định Tỷ Giá
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'MANUAL', label: 'Nhập Thủ Công' },
                    { id: 'SYSTEM_FIXED', label: 'Cố Định Công Ty' },
                    { id: 'EXTERNAL_API', label: 'API Vietcombank' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFxMode(item.id as ExchangeRateMode)}
                      className={`text-xs py-2 px-2.5 rounded-lg border font-medium transition-all ${
                        fxMode === item.id
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Tỷ Giá Báo Giá Chuẩn (VND/USD)
                  </label>
                  <input
                    type="number"
                    value={fxRate}
                    onChange={(e) => setFxRate(Number(e.target.value))}
                    className="w-full text-sm font-bold text-slate-800 border-slate-300 rounded-lg px-3 py-2"
                    placeholder="25400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1 flex items-center justify-between">
                    <span>Biên Phòng Vệ Rủi Ro (FX Buffer)</span>
                    <span className="text-blue-600 font-bold">{fxBuffer}%</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={fxBuffer}
                    onChange={(e) => setFxBuffer(Number(e.target.value))}
                    className="w-full text-sm font-semibold border-slate-300 rounded-lg px-3 py-2"
                    placeholder="0.5"
                  />
                </div>
              </div>

              {/* Buffer summary */}
              <div className="p-3 bg-amber-50/80 rounded-lg border border-amber-200/80 text-xs text-amber-900 flex items-center justify-between">
                <span>Tỷ giá quy đổi bán thực tế (có dự phòng):</span>
                <span className="font-bold text-sm text-amber-800">
                  {effectiveFxRate.toLocaleString()} VND / USD
                </span>
              </div>
            </div>

            {/* Rounding Rules Box */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Percent className="w-5 h-5 text-indigo-600" />
                Quy Tắc Làm Tròn Kế Toán
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Số lẻ USD (Decimals)
                  </label>
                  <select
                    value={usdDecimals}
                    onChange={(e) => setUsdDecimals(Number(e.target.value))}
                    className="w-full text-sm border-slate-300 rounded-lg px-3 py-2 bg-slate-50 font-medium"
                  >
                    <option value={2}>2 chữ số (Chuẩn Cents: $120.50)</option>
                    <option value={3}>3 chữ số ($120.525)</option>
                    <option value={0}>0 chữ số (Làm tròn nguyên: $121)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Số lẻ VND (Decimals)
                  </label>
                  <select
                    value={vndDecimals}
                    onChange={(e) => setVndDecimals(Number(e.target.value))}
                    className="w-full text-sm border-slate-300 rounded-lg px-3 py-2 bg-slate-50 font-medium"
                  >
                    <option value={0}>0 chữ số (Chuẩn VND: 2,500,000 đ)</option>
                    <option value={2}>2 chữ số (Kế toán chi tiết)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Phương Pháp Làm Tròn
                </label>
                <select
                  value={roundingMethod}
                  onChange={(e) => setRoundingMethod(e.target.value as RoundingMethod)}
                  className="w-full text-sm border-slate-300 rounded-lg px-3 py-2 bg-slate-50 font-medium"
                >
                  <option value="HALF_UP">Làm tròn tiêu chuẩn kế toán (≥ 0.5 lên 1, &lt; 0.5 xuống)</option>
                  <option value="FLOOR">Luôn làm tròn xuống (Floor)</option>
                  <option value="CEIL">Luôn làm tròn lên có lợi cho công ty (Ceiling)</option>
                  <option value="ROUND_NEAREST_100">Làm tròn đến 100 VND gần nhất (VD: 3,450 đ → 3,500 đ)</option>
                  <option value="ROUND_NEAREST_1000">Làm tròn đến 1,000 VND gần nhất (VD: 3,450 đ → 3,000 đ)</option>
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={nearestHundredVnd}
                    onChange={(e) => setNearestHundredVnd(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="font-medium">Tự động làm tròn tiền VND đến hàng trăm (100 đ)</span>
                </label>
                <p className="text-xs text-slate-500 ml-6.5 mt-0.5">
                  Giúp báo giá và hóa đơn thanh toán VND của khách hàng gọn gàng, tránh các số lẻ tiền xu không phát hành.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveCurrencySettings}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              Lưu Cấu Hình Tiền Tệ & Làm Tròn
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: TAX & VAT RULES */}
      {subTab === 'tax' && (
        <div className="space-y-6">
          {/* Main Tax Policy Box */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              Chính Sách Thuế & VAT Của Công Ty
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Mã Số Thuế (Doanh Nghiệp)
                </label>
                <input
                  type="text"
                  value={taxCodeInput}
                  onChange={(e) => setTaxCodeInput(e.target.value)}
                  className="w-full text-sm font-semibold border-slate-300 rounded-lg px-3 py-2"
                  placeholder="0312345678"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Chính Sách Giá & VAT Mặc Định
                </label>
                <select
                  value={vatPolicy}
                  onChange={(e) => setVatPolicy(e.target.value as TaxVatPolicy)}
                  className="w-full text-sm border-slate-300 rounded-lg px-3 py-2 bg-slate-50 font-medium"
                >
                  <option value="EXCLUSIVE">EXCLUSIVE - Giá báo CHƯA bao gồm VAT (Chuẩn B2B Logistics)</option>
                  <option value="INCLUSIVE">INCLUSIVE - Giá báo ĐÃ bao gồm VAT</option>
                  <option value="EXEMPT">EXEMPT - Không chịu thuế / Miễn thuế</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Thuế Suất VAT Chuẩn (%)
                </label>
                <select
                  value={defaultVatRate}
                  onChange={(e) => setDefaultVatRate(Number(e.target.value))}
                  className="w-full text-sm border-slate-300 rounded-lg px-3 py-2 bg-slate-50 font-medium"
                >
                  <option value={8}>8% (Nghị quyết giảm thuế GTGT)</option>
                  <option value={10}>10% (Thuế suất chuẩn phổ thông)</option>
                  <option value={0}>0% (Dịch vụ xuất khẩu / Cước quốc tế)</option>
                </select>
              </div>
            </div>

            {/* Foreign Contractor Tax (FCT) */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableFct}
                      onChange={(e) => setEnableFct(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300"
                    />
                    <span>Áp dụng Thuế Nhà Thầu Nước Ngoài (Foreign Contractor Tax - FCT)</span>
                  </label>
                  <p className="text-xs text-slate-500 ml-6">
                    Kê khai thuế nhà thầu cho cước tàu biển/hàng không thanh toán trực tiếp cho hãng vận chuyển quốc tế.
                  </p>
                </div>

                {enableFct && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Thuế suất FCT:</span>
                    <select
                      value={fctRate}
                      onChange={(e) => setFctRate(Number(e.target.value))}
                      className="text-xs font-bold border-slate-300 rounded px-2.5 py-1.5 bg-white"
                    >
                      <option value={2}>2% (Cước quốc tế vận tải đường biển)</option>
                      <option value={5}>5% (Dịch vụ logistics nhà thầu nước ngoài)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveTaxPolicySettings}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Cập Nhật Chính Sách Thuế
              </button>
            </div>
          </div>

          {/* Tax Rules Table */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold text-slate-800">
                  Bảng Quy Tắc Thuế GTGT Theo Danh Mục Nghiệp Vụ
                </h4>
                <p className="text-xs text-slate-500">
                  Hệ thống tự động áp dụng mức thuế chính xác khi nhân viên kinh doanh chọn danh mục cước.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingTaxRule({
                    companyId: activeCompanyRecord?.companyId || 'company_profile',
                    code: 'VAT-CUSTOM',
                    nameVi: 'Thuế dịch vụ đặc thù',
                    nameEn: 'Special service tax',
                    rate: 8,
                    categoryMatch: 'OTHER',
                    isActive: true,
                  });
                  setIsAddingTaxRule(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm Quy Tắc Thuế
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Mã Quy Tắc</th>
                    <th className="py-2.5 px-3">Tên Quy Tắc & Diễn Giải</th>
                    <th className="py-2.5 px-3">Danh Mục Áp Dụng</th>
                    <th className="py-2.5 px-3 text-right">Thuế Suất</th>
                    <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                    <th className="py-2.5 px-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(taxConfig.rules || []).map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">
                        {rule.code}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{rule.nameVi}</div>
                        <div className="text-[11px] text-slate-400">{rule.description || rule.nameEn}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {rule.categoryMatch || 'Tất Cả'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700 text-sm">
                        {rule.rate}%
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          rule.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {rule.isActive ? 'Đang dùng' : 'Đã tắt'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={async () => {
                            const updatedRules = taxConfig.rules.map(r => 
                              r.id === rule.id ? { ...r, isActive: !r.isActive } : r
                            );
                            await updateTaxConfig({ rules: updatedRules });
                          }}
                          className="text-xs text-blue-600 hover:underline mr-2"
                        >
                          {rule.isActive ? 'Tắt' : 'Bật'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: PAYMENT TERMS */}
      {subTab === 'payment' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-semibold text-slate-800">
                Danh Sách Điều Khoản Thanh Toán & Công Nợ
              </h4>
              <p className="text-xs text-slate-500">
                Được đồng bộ tự động vào phần Terms & Conditions của báo giá và bản in PDF.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingPaymentTerm({
                  code: 'NET_CUSTOM',
                  nameVi: '',
                  nameEn: '',
                  dueDays: 15,
                  depositRequiredPercent: 0,
                  latePaymentInterestPercent: 0.05,
                  isDefault: false,
                  isActive: true,
                });
                setIsAddingPaymentTerm(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Thêm Điều Khoản Mới
            </button>
          </div>

          {/* Payment Terms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paymentTerms.map((term) => (
              <div
                key={term.id}
                className={`p-4 rounded-xl border transition-all ${
                  term.isDefault
                    ? 'border-blue-500 bg-blue-50/20 shadow-sm ring-1 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {term.code}
                      </span>
                      {term.isDefault && (
                        <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                          Mặc Định
                        </span>
                      )}
                    </div>
                    <h5 className="font-semibold text-slate-900 text-sm">{term.nameVi}</h5>
                    <p className="text-xs text-slate-500">{term.nameEn}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingPaymentTerm(term);
                        setIsAddingPaymentTerm(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => deletePaymentTermAction(term.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Hạn nợ:</span>
                    <span className="font-bold text-slate-800">{term.dueDays} ngày</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Đặt cọc:</span>
                    <span className="font-bold text-slate-800">{term.depositRequiredPercent}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Lãi quá hạn:</span>
                    <span className="font-bold text-slate-800">{term.latePaymentInterestPercent || 0}% / ngày</span>
                  </div>
                </div>

                {term.termsNotesVi && (
                  <p className="mt-2.5 text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-100">
                    "{term.termsNotesVi}"
                  </p>
                )}

                {!term.isDefault && (
                  <div className="mt-3 pt-2 text-right">
                    <button
                      onClick={() => savePaymentTermAction({ ...term, isDefault: true })}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      Đặt làm mặc định
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Modal / Form Edit Payment Term */}
          {isAddingPaymentTerm && editingPaymentTerm && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl space-y-4">
                <h4 className="text-base font-bold text-slate-800">
                  {editingPaymentTerm.id ? 'Cập Nhật Điều Khoản Thanh Toán' : 'Thêm Điều Khoản Thanh Toán Mới'}
                </h4>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Mã Ký Hiệu</label>
                    <input
                      type="text"
                      value={editingPaymentTerm.code || ''}
                      onChange={(e) => setEditingPaymentTerm({ ...editingPaymentTerm, code: e.target.value })}
                      className="w-full border-slate-300 rounded px-2.5 py-1.5 uppercase font-mono"
                      placeholder="NET_30"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Tên Tiếng Việt (Hiển thị báo giá)</label>
                    <input
                      type="text"
                      value={editingPaymentTerm.nameVi || ''}
                      onChange={(e) => setEditingPaymentTerm({ ...editingPaymentTerm, nameVi: e.target.value })}
                      className="w-full border-slate-300 rounded px-2.5 py-1.5 font-medium"
                      placeholder="Thanh toán 30 ngày sau ngày hóa đơn"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Tên Tiếng Anh</label>
                    <input
                      type="text"
                      value={editingPaymentTerm.nameEn || ''}
                      onChange={(e) => setEditingPaymentTerm({ ...editingPaymentTerm, nameEn: e.target.value })}
                      className="w-full border-slate-300 rounded px-2.5 py-1.5"
                      placeholder="Net 30 days from invoice date"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Số Ngày Được Nợ</label>
                      <input
                        type="number"
                        value={editingPaymentTerm.dueDays ?? 0}
                        onChange={(e) => setEditingPaymentTerm({ ...editingPaymentTerm, dueDays: Number(e.target.value) })}
                        className="w-full border-slate-300 rounded px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Đặt Cọc (%)</label>
                      <input
                        type="number"
                        value={editingPaymentTerm.depositRequiredPercent ?? 0}
                        onChange={(e) => setEditingPaymentTerm({ ...editingPaymentTerm, depositRequiredPercent: Number(e.target.value) })}
                        className="w-full border-slate-300 rounded px-2.5 py-1.5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Ghi Chú Điều Khoản Chi Tiết</label>
                    <textarea
                      rows={2}
                      value={editingPaymentTerm.termsNotesVi || ''}
                      onChange={(e) => setEditingPaymentTerm({ ...editingPaymentTerm, termsNotesVi: e.target.value })}
                      className="w-full border-slate-300 rounded px-2.5 py-1.5"
                      placeholder="Thời hạn thanh toán trong vòng 30 ngày..."
                    />
                  </div>

                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editingPaymentTerm.isDefault}
                      onChange={(e) => setEditingPaymentTerm({ ...editingPaymentTerm, isDefault: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span className="font-semibold text-slate-700">Đặt làm điều khoản mặc định</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setIsAddingPaymentTerm(false);
                      setEditingPaymentTerm(null);
                    }}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={async () => {
                      if (!editingPaymentTerm.nameVi) return;
                      await savePaymentTermAction(editingPaymentTerm);
                      setIsAddingPaymentTerm(false);
                      setEditingPaymentTerm(null);
                    }}
                    className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded"
                  >
                    Lưu Điều Khoản
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: BANK ACCOUNTS */}
      {subTab === 'bank' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-semibold text-slate-800">
                Tài Khoản Ngân Hàng & Hướng Dẫn Chuyển Khoản
              </h4>
              <p className="text-xs text-slate-500">
                Thông tin tài khoản chính xác sẽ được tự động đưa vào file PDF theo đúng loại tiền tệ (USD hoặc VND).
              </p>
            </div>

            <button
              onClick={() => {
                setEditingBankAccount({
                  bankName: 'Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank)',
                  bankBranch: 'Chi nhánh Nam Sài Gòn',
                  accountNumber: '',
                  accountHolder: (activeCompanyRecord?.legalName || '').toUpperCase(),
                  currency: 'VND',
                  swiftCode: 'BFTVVNVX',
                  isDefaultUsd: false,
                  isDefaultVnd: false,
                  paymentInstructionsVi: 'Nội dung: [Mã Báo Giá] - [Tên Doanh Nghiệp]',
                  isActive: true,
                });
                setIsAddingBankAccount(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Thêm Tài Khoản Ngân Hàng
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bankAccounts.map((bank) => (
              <div
                key={bank.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        bank.currency === 'USD' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        TK {bank.currency}
                      </span>
                      {bank.isDefaultUsd && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded">
                          Mặc định USD
                        </span>
                      )}
                      {bank.isDefaultVnd && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded">
                          Mặc định VND
                        </span>
                      )}
                    </div>
                    <h5 className="font-semibold text-slate-800 text-sm mt-1">{bank.bankName}</h5>
                    <p className="text-xs text-slate-500">{bank.bankBranch}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingBankAccount(bank);
                        setIsAddingBankAccount(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 text-xs"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => deleteBankAccountAction(bank.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Số tài khoản:</span>
                    <span className="font-mono font-bold text-slate-800">{bank.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Chủ tài khoản:</span>
                    <span className="font-semibold text-slate-800">{bank.accountHolder}</span>
                  </div>
                  {bank.swiftCode && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">SWIFT Code:</span>
                      <span className="font-mono text-slate-700">{bank.swiftCode}</span>
                    </div>
                  )}
                </div>

                {bank.paymentInstructionsVi && (
                  <p className="text-[11px] text-slate-500">
                    <span className="font-medium text-slate-700">Cú pháp: </span>
                    {bank.paymentInstructionsVi}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Modal Bank Account Form */}
          {isAddingBankAccount && editingBankAccount && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl space-y-4">
                <h4 className="text-base font-bold text-slate-800">
                  {editingBankAccount.id ? 'Cập Nhật Tài Khoản Ngân Hàng' : 'Thêm Tài Khoản Ngân Hàng Mới'}
                </h4>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Tên Ngân Hàng</label>
                    <input
                      type="text"
                      value={editingBankAccount.bankName || ''}
                      onChange={(e) => setEditingBankAccount({ ...editingBankAccount, bankName: e.target.value })}
                      className="w-full border-slate-300 rounded px-2.5 py-1.5 font-medium"
                      placeholder="Vietcombank / Techcombank / BIDV"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Số Tài Khoản</label>
                      <input
                        type="text"
                        value={editingBankAccount.accountNumber || ''}
                        onChange={(e) => setEditingBankAccount({ ...editingBankAccount, accountNumber: e.target.value })}
                        className="w-full border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold"
                        placeholder="0071001234567"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Loại Tiền</label>
                      <select
                        value={editingBankAccount.currency || 'VND'}
                        onChange={(e) => setEditingBankAccount({ ...editingBankAccount, currency: e.target.value as any })}
                        className="w-full border-slate-300 rounded px-2.5 py-1.5 bg-slate-50 font-bold"
                      >
                        <option value="VND">VND (Việt Nam Đồng)</option>
                        <option value="USD">USD (Đô la Mỹ)</option>
                        <option value="MULTI">MULTI (Đa tệ)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Chủ Tài Khoản (In hoa không dấu)</label>
                    <input
                      type="text"
                      value={editingBankAccount.accountHolder || ''}
                      onChange={(e) => setEditingBankAccount({ ...editingBankAccount, accountHolder: e.target.value.toUpperCase() })}
                      className="w-full border-slate-300 rounded px-2.5 py-1.5 font-semibold"
                      placeholder="CONG TY TNHH LOGISTICS SOLUTIONS"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Chi Nhánh</label>
                      <input
                        type="text"
                        value={editingBankAccount.bankBranch || ''}
                        onChange={(e) => setEditingBankAccount({ ...editingBankAccount, bankBranch: e.target.value })}
                        className="w-full border-slate-300 rounded px-2.5 py-1.5"
                        placeholder="Chi nhánh Nam Sài Gòn"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">SWIFT Code</label>
                      <input
                        type="text"
                        value={editingBankAccount.swiftCode || ''}
                        onChange={(e) => setEditingBankAccount({ ...editingBankAccount, swiftCode: e.target.value.toUpperCase() })}
                        className="w-full border-slate-300 rounded px-2.5 py-1.5 font-mono"
                        placeholder="BFTVVNVX"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!editingBankAccount.isDefaultVnd}
                        onChange={(e) => setEditingBankAccount({ ...editingBankAccount, isDefaultVnd: e.target.checked })}
                        className="rounded text-emerald-600"
                      />
                      <span className="font-medium text-slate-700">Mặc định nhận VND</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!editingBankAccount.isDefaultUsd}
                        onChange={(e) => setEditingBankAccount({ ...editingBankAccount, isDefaultUsd: e.target.checked })}
                        className="rounded text-amber-600"
                      />
                      <span className="font-medium text-slate-700">Mặc định nhận USD</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setIsAddingBankAccount(false);
                      setEditingBankAccount(null);
                    }}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={async () => {
                      if (!editingBankAccount.accountNumber || !editingBankAccount.bankName) return;
                      await saveBankAccountAction(editingBankAccount);
                      setIsAddingBankAccount(false);
                      setEditingBankAccount(null);
                    }}
                    className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded"
                  >
                    Lưu Tài Khoản
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 5: COMMERCIAL SETTINGS & SNAPSHOT */}
      {subTab === 'commercial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Margins */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Chính Sách Lợi Nhuận Gộp (Margin Floor)
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Biên Lợi Nhuận Sàn (%)
                  </label>
                  <input
                    type="number"
                    value={floorMargin}
                    onChange={(e) => setFloorMargin(Number(e.target.value))}
                    className="w-full text-sm font-bold text-rose-600 border-slate-300 rounded-lg px-3 py-2"
                    placeholder="8"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Cảnh báo đỏ nếu margin dưới mức này</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Biên Lợi Nhuận Mục Tiêu (%)
                  </label>
                  <input
                    type="number"
                    value={targetMargin}
                    onChange={(e) => setTargetMargin(Number(e.target.value))}
                    className="w-full text-sm font-bold text-emerald-600 border-slate-300 rounded-lg px-3 py-2"
                    placeholder="18"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Mục tiêu tăng trưởng tiêu chuẩn</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Hạn Mức Giảm Giá Sales (%)
                  </label>
                  <input
                    type="number"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(Number(e.target.value))}
                    className="w-full text-sm font-semibold border-slate-300 rounded-lg px-3 py-2"
                    placeholder="5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Hiệu Lực Báo Giá (Ngày)
                  </label>
                  <input
                    type="number"
                    value={validityDays}
                    onChange={(e) => setValidityDays(Number(e.target.value))}
                    className="w-full text-sm font-semibold border-slate-300 rounded-lg px-3 py-2"
                    placeholder="15"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireMarginApproval}
                    onChange={(e) => setRequireMarginApproval(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                  />
                  <span className="font-semibold text-slate-800">
                    Bắt buộc Manager phê duyệt khi Margin dưới sàn ({floorMargin}%)
                  </span>
                </label>
              </div>
            </div>

            {/* Snapshot Architecture Info */}
            <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-sm space-y-3">
              <h4 className="text-base font-semibold text-emerald-300 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Cơ Chế Snapshot Báo Giá (Data Immutability)
              </h4>

              <p className="text-xs text-slate-300 leading-relaxed">
                Theo tiêu chuẩn kế toán & kiểm toán Logistics quốc tế, khi báo giá được chuyển sang trạng thái{' '}
                <span className="text-emerald-400 font-bold">APPROVED</span> hoặc{' '}
                <span className="text-blue-400 font-bold">SENT</span>, toàn bộ cấu hình tài chính sẽ được chụp{' '}
                <span className="text-amber-300 font-semibold">Snapshot bất biến</span> gồm:
              </p>

              <div className="space-y-1.5 text-xs text-slate-200">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span><strong>quotation.currencySnapshot:</strong> Base/Secondary Currency, FX Buffer %</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span><strong>quotation.taxSnapshot:</strong> Tax Code, VAT Policy, Rules Summary</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span><strong>quotation.paymentTermSnapshot:</strong> Due Days, Terms Text Vi/En</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span><strong>quotation.bankSnapshot:</strong> USD & VND Bank accounts, Swift code</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span><strong>quotation.commercialTermsSnapshot:</strong> Validity, Incoterm, Exclusions</span>
                </div>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 text-[11px] text-slate-400">
                Dù công ty có thay đổi số tài khoản, tỷ giá, hay chính sách VAT trong tương lai, các báo giá lịch sử đã gửi khách vẫn giữ nguyên 100% nội dung gốc.
              </div>
            </div>
          </div>

          {/* Exclusions Notes */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-base font-semibold text-slate-800">
              Điều Khoản Loại Trừ Mặc Định (Exclusions & Notes)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Điều Khoản Tiếng Việt (Vi)
                </label>
                <textarea
                  rows={4}
                  value={exclusionsVi}
                  onChange={(e) => setExclusionsVi(e.target.value)}
                  className="w-full text-xs border-slate-300 rounded-lg p-3 font-mono leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  English Exclusions & Terms (En)
                </label>
                <textarea
                  rows={4}
                  value={exclusionsEn}
                  onChange={(e) => setExclusionsEn(e.target.value)}
                  className="w-full text-xs border-slate-300 rounded-lg p-3 font-mono leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveCommercialSettings}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
              >
                <Save className="w-4 h-4" />
                Lưu Chính Sách Lợi Nhuận & Thương Mại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
