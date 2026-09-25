import React, { useState } from 'react';
import { 
  BusinessOpportunity, 
  BusinessOpportunityType, 
  OpportunityPriority, 
  DataSufficiencyLevel, 
  OpportunityStatus 
} from '../../types/opportunity';
import { 
  TrendingUp, 
  ShieldAlert, 
  RotateCcw, 
  DollarSign, 
  Layers, 
  Compass, 
  CheckCircle2, 
  FileText, 
  PackageCheck, 
  Sparkles, 
  Clock, 
  ArrowRight, 
  ChevronRight, 
  Check, 
  X, 
  Eye, 
  Ship, 
  Plane, 
  Truck, 
  FileCheck2, 
  Building2, 
  AlertCircle,
  ExternalLink,
  Info,
  Calendar,
  MoreVertical,
  SlidersHorizontal
} from 'lucide-react';

interface OpportunityCardProps {
  opportunity: BusinessOpportunity;
  onSelectForQuote?: (opp: BusinessOpportunity) => void;
  onOpenCustomer360?: (customerId: string, customerName: string) => void;
  onOpenRateReview?: (opp: BusinessOpportunity) => void;
  onOpenFollowUp?: (opp: BusinessOpportunity) => void;
  onOpenDecisionWorkspace?: (opp: BusinessOpportunity) => void;
  onUpdateStatus?: (oppId: string, newStatus: OpportunityStatus, notes?: string) => Promise<void>;
  onSnooze?: (oppId: string, days: number, reason?: string) => Promise<void>;
  onDismiss?: (oppId: string, reason: string) => Promise<void>;
  compact?: boolean;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opportunity,
  onSelectForQuote,
  onOpenCustomer360,
  onOpenRateReview,
  onOpenFollowUp,
  onOpenDecisionWorkspace,
  onUpdateStatus,
  onSnooze,
  onDismiss,
  compact = false
}) => {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [showDismissModal, setShowDismissModal] = useState(false);
  const [dismissReason, setDismissReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Type configuration
  const getTypeConfig = (type: BusinessOpportunityType) => {
    switch (type) {
      case 'CUSTOMER_GROWTH':
        return {
          labelVi: 'Tăng Trưởng Khách Hàng',
          labelEn: 'Customer Growth',
          icon: TrendingUp,
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        };
      case 'CUSTOMER_RETENTION':
        return {
          labelVi: 'Nguy Cơ Giảm Giao Dịch',
          labelEn: 'Customer Retention',
          icon: ShieldAlert,
          badgeColor: 'bg-rose-50 text-rose-700 border-rose-200'
        };
      case 'RE_QUOTATION':
        return {
          labelVi: 'Cơ Hội Báo Giá Lại',
          labelEn: 'Re-Quotation',
          icon: RotateCcw,
          badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
        };
      case 'RATE_RENEWAL':
        return {
          labelVi: 'Đến Hạn Rà Soát Cước',
          labelEn: 'Rate Renewal',
          icon: DollarSign,
          badgeColor: 'bg-amber-50 text-amber-700 border-amber-200'
        };
      case 'CROSS_SERVICE':
        return {
          labelVi: 'Bán Chéo Dịch Vụ',
          labelEn: 'Cross-Service',
          icon: Layers,
          badgeColor: 'bg-purple-50 text-purple-700 border-purple-200'
        };
      case 'LANE_OPPORTUNITY':
        return {
          labelVi: 'Cơ Hội Tuyến Trọng Điểm',
          labelEn: 'Lane Focus',
          icon: Compass,
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200'
        };
      case 'QUOTATION_CONVERSION':
        return {
          labelVi: 'Thúc Đẩy Chốt Báo Giá',
          labelEn: 'Quote Conversion',
          icon: CheckCircle2,
          badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200'
        };
      case 'CONTRACT_RENEWAL':
        return {
          labelVi: 'Gia Hạn Hợp Đồng',
          labelEn: 'Contract Renewal',
          icon: FileText,
          badgeColor: 'bg-teal-50 text-teal-700 border-teal-200'
        };
      case 'SHIPMENT_FOLLOW_UP':
        return {
          labelVi: 'Chăm Sóc Sau Giao Hàng',
          labelEn: 'Shipment Follow-Up',
          icon: PackageCheck,
          badgeColor: 'bg-sky-50 text-sky-700 border-sky-200'
        };
      case 'REACTIVATION':
        return {
          labelVi: 'Tái Kích Hoạt Khách Hàng',
          labelEn: 'Reactivation',
          icon: Sparkles,
          badgeColor: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200'
        };
      default:
        return {
          labelVi: 'Cơ Hội Kinh Doanh',
          labelEn: 'Opportunity',
          icon: Compass,
          badgeColor: 'bg-slate-50 text-slate-700 border-slate-200'
        };
    }
  };

  const getPriorityBadge = (priority: OpportunityPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return { label: 'Khẩn Cấp', color: 'bg-red-600 text-white font-bold' };
      case 'HIGH':
        return { label: 'Ưu Tiên Cao', color: 'bg-amber-600 text-white font-semibold' };
      case 'NORMAL':
        return { label: 'Bình Thường', color: 'bg-blue-50 text-blue-700 border border-blue-200' };
      case 'LOW':
        return { label: 'Theo Dõi', color: 'bg-slate-100 text-slate-600 border border-slate-200' };
    }
  };

  const getSufficiencyBadge = (level: DataSufficiencyLevel) => {
    switch (level) {
      case 'SUFFICIENT_DATA':
        return {
          label: 'Dữ liệu tin cậy',
          color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          dot: 'bg-emerald-500'
        };
      case 'LIMITED_DATA':
        return {
          label: 'Dữ liệu bước đầu',
          color: 'text-amber-700 bg-amber-50 border-amber-200',
          dot: 'bg-amber-500'
        };
      case 'INSUFFICIENT_DATA':
        return {
          label: 'Chưa đủ dữ liệu',
          color: 'text-slate-600 bg-slate-50 border-slate-200',
          dot: 'bg-slate-400'
        };
    }
  };

  const getStatusBadge = (status: OpportunityStatus) => {
    switch (status) {
      case 'NEW':
        return { label: 'Mới Phát Hiện', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      case 'REVIEWING':
        return { label: 'Đang Xem Xét', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'ACTION_REQUIRED':
        return { label: 'Cần Hành Động', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'IN_PROGRESS':
        return { label: 'Đang Triển Khai', color: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'CONVERTED':
        return { label: 'Đã Chốt Thành Công', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'DISMISSED':
        return { label: 'Đã Bỏ Qua', color: 'bg-slate-100 text-slate-600 border-slate-200' };
      case 'SNOOZED':
        return { label: 'Đang Tạm Hoãn', color: 'bg-orange-100 text-orange-800 border-orange-200' };
      case 'EXPIRED':
        return { label: 'Hết Hạn', color: 'bg-stone-100 text-stone-600 border-stone-200' };
      case 'CLOSED':
        return { label: 'Đã Đóng', color: 'bg-slate-200 text-slate-700 border-slate-300' };
      default:
        return { label: status, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const typeConfig = getTypeConfig(opportunity.opportunityType);
  const priorityConfig = getPriorityBadge(opportunity.priority);
  const sufficiencyConfig = getSufficiencyBadge(opportunity.confidenceLevel);
  const statusConfig = getStatusBadge(opportunity.status);
  const TypeIcon = typeConfig.icon;

  const handleDismissSubmit = async () => {
    if (!dismissReason.trim()) return;
    setIsSubmitting(true);
    try {
      if (onDismiss) {
        await onDismiss(opportunity.id, dismissReason.trim());
      }
      setShowDismissModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      id={`opp-card-${opportunity.id}`}
      className={`bg-white rounded-2xl border transition-all duration-200 shadow-2xs hover:shadow-md ${
        opportunity.priority === 'CRITICAL' 
          ? 'border-red-200 hover:border-red-300 bg-gradient-to-b from-red-50/20 to-white' 
          : opportunity.priority === 'HIGH'
          ? 'border-amber-200 hover:border-amber-300'
          : 'border-slate-200 hover:border-indigo-200'
      } ${compact ? 'p-4' : 'p-5'}`}
    >
      {/* Top Meta Line: Type + Priority + Sufficiency */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${typeConfig.badgeColor}`}>
            <TypeIcon className="w-3.5 h-3.5" />
            <span>{typeConfig.labelVi}</span>
          </span>

          <span className={`px-2 py-0.5 rounded-md text-[11px] ${priorityConfig.color}`}>
            {priorityConfig.label}
          </span>

          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border font-medium ${sufficiencyConfig.color}`} title={opportunity.dataSufficiencyReason}>
            <span className={`w-1.5 h-1.5 rounded-full ${sufficiencyConfig.dot}`} />
            <span>{sufficiencyConfig.label}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${statusConfig.color}`}>
            {statusConfig.label}
          </span>

          {/* Quick Menu / Options */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="Tùy chọn khác"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isActionMenuOpen && (
              <div 
                className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1 text-xs"
                onMouseLeave={() => setIsActionMenuOpen(false)}
              >
                {opportunity.status !== 'IN_PROGRESS' && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      onUpdateStatus && onUpdateStatus(opportunity.id, 'IN_PROGRESS', 'Đang xử lý cơ hội');
                    }}
                    className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-purple-600" />
                    <span>Đánh dấu Đang Xử Lý</span>
                  </button>
                )}

                {opportunity.status !== 'CONVERTED' && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      onUpdateStatus && onUpdateStatus(opportunity.id, 'CONVERTED', 'Khách hàng đồng ý / Chốt thành công');
                    }}
                    className="w-full text-left px-3 py-2 text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Chốt Thành Công</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    onSnooze && onSnooze(opportunity.id, 3, 'Tạm hoãn 3 ngày để theo dõi thêm');
                  }}
                  className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Tạm hoãn 3 ngày</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    setShowDismissModal(true);
                  }}
                  className="w-full text-left px-3 py-2 text-rose-700 hover:bg-rose-50 flex items-center gap-2"
                >
                  <X className="w-3.5 h-3.5 text-rose-600" />
                  <span>Bỏ qua cơ hội này</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Title & Customer */}
      <div className="mb-3">
        <h4 className="text-base font-bold text-slate-900 leading-snug mb-1">
          {opportunity.title}
        </h4>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <button
            type="button"
            onClick={() => onOpenCustomer360 && onOpenCustomer360(opportunity.customerId, opportunity.customerName)}
            className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
            title="Mở hồ sơ khách hàng 360"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{opportunity.customerName}</span>
            <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
          </button>

          {opportunity.lane && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
              {opportunity.lane}
            </span>
          )}

          {opportunity.serviceMode && (
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
              {opportunity.serviceMode}
            </span>
          )}
        </div>
      </div>

      {/* Fact & Evidence Breakdown Box (Zero Fake Data, Explanatory) */}
      <div className="space-y-2.5 mb-4 text-xs">
        {/* WHY DETECTED */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            <Info className="w-3 h-3 text-slate-400" />
            <span>Vì sao phát hiện cơ hội này?</span>
          </div>
          <p className="text-slate-800 leading-relaxed font-medium">
            {opportunity.reason}
          </p>
        </div>

        {/* SUPPORTING FACTS */}
        <div className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-100">
          <div className="flex items-center gap-1 text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1">
            <CheckCircle2 className="w-3 h-3 text-blue-500" />
            <span>Dữ liệu thực tế đối chứng</span>
          </div>
          <p className="text-slate-700 leading-relaxed font-mono text-[11.5px]">
            {opportunity.supportingData}
          </p>
        </div>

        {/* SUGGESTED ACTION */}
        <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
            <ArrowRight className="w-3 h-3 text-emerald-600" />
            <span>Hành động gợi ý cho Sales / Pricing</span>
          </div>
          <p className="text-emerald-950 font-medium leading-relaxed">
            {opportunity.suggestedAction}
          </p>
        </div>
      </div>

      {/* Bottom Action Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Phát hiện: {new Date(opportunity.detectedAt).toLocaleDateString('vi-VN')}</span>
          {opportunity.dueDate && (
            <span className="font-semibold text-rose-600">
              &bull; Hạn: {new Date(opportunity.dueDate).toLocaleDateString('vi-VN')}
            </span>
          )}
        </div>

        {/* Dynamic Action Buttons reusing existing engines */}
        <div className="flex items-center gap-2">
          {onOpenDecisionWorkspace && (
            <button
              type="button"
              onClick={() => onOpenDecisionWorkspace(opportunity)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors"
              title="Mô phỏng kịch bản cước trong Decision Workspace"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
              <span>Decision Hub</span>
            </button>
          )}

          {/* Primary Action Button */}
          {['RE_QUOTATION', 'QUOTATION_CONVERSION', 'LANE_OPPORTUNITY', 'CUSTOMER_GROWTH', 'CROSS_SERVICE'].includes(opportunity.opportunityType) && (
            <button
              type="button"
              onClick={() => onSelectForQuote && onSelectForQuote(opportunity)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-2xs transition-colors"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Tạo Báo Giá Mới</span>
            </button>
          )}

          {opportunity.opportunityType === 'RATE_RENEWAL' && (
            <button
              type="button"
              onClick={() => onOpenRateReview && onOpenRateReview(opportunity)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-2xs transition-colors"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Rà Soát Cước Ngay</span>
            </button>
          )}

          {['SHIPMENT_FOLLOW_UP', 'CUSTOMER_RETENTION', 'REACTIVATION', 'CONTRACT_RENEWAL'].includes(opportunity.opportunityType) && (
            <button
              type="button"
              onClick={() => onOpenFollowUp && onOpenFollowUp(opportunity)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Tạo Lịch Chăm Sóc</span>
            </button>
          )}

          {/* Quick 360 link */}
          <button
            type="button"
            onClick={() => onOpenCustomer360 && onOpenCustomer360(opportunity.customerId, opportunity.customerName)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
            title="Mở hồ sơ khách hàng 360 độ"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xem 360°</span>
          </button>
        </div>
      </div>

      {/* Dismiss Reason Modal */}
      {showDismissModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h4 className="text-base font-bold text-slate-900 mb-2">Bỏ qua cơ hội kinh doanh</h4>
            <p className="text-xs text-slate-600 mb-4">
              Vui lòng cho biết lý do bỏ qua cơ hội này (ví dụ: khách hàng tự vận chuyển, giá thị trường biến động, kế hoạch dời sang quý sau, v.v.):
            </p>
            <textarea
              value={dismissReason}
              onChange={(e) => setDismissReason(e.target.value)}
              placeholder="Nhập lý do thực tế..."
              rows={3}
              className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-hidden mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDismissModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!dismissReason.trim() || isSubmitting}
                onClick={handleDismissSubmit}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
              >
                Xác nhận bỏ qua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
