import React from 'react';
import { BusinessOpportunity, OpportunityStatus } from '../../types/opportunity';
import { OpportunityCard } from './OpportunityCard';
import { Sparkles, Clock, AlertCircle, CheckCircle2, ChevronRight, Layers } from 'lucide-react';

interface OpportunityPipelineViewProps {
  opportunities: BusinessOpportunity[];
  onSelectForQuote?: (opp: BusinessOpportunity) => void;
  onOpenCustomer360?: (customerId: string, customerName: string) => void;
  onOpenRateReview?: (opp: BusinessOpportunity) => void;
  onOpenFollowUp?: (opp: BusinessOpportunity) => void;
  onUpdateStatus?: (oppId: string, newStatus: OpportunityStatus, notes?: string) => Promise<void>;
  onSnooze?: (oppId: string, days: number, reason?: string) => Promise<void>;
  onDismiss?: (oppId: string, reason: string) => Promise<void>;
}

export const OpportunityPipelineView: React.FC<OpportunityPipelineViewProps> = ({
  opportunities,
  onSelectForQuote,
  onOpenCustomer360,
  onOpenRateReview,
  onOpenFollowUp,
  onUpdateStatus,
  onSnooze,
  onDismiss
}) => {
  const columns: { id: OpportunityStatus; title: string; color: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'NEW', title: 'Mới Phát Hiện', color: 'border-indigo-400 bg-indigo-50/40 text-indigo-800', icon: Sparkles },
    { id: 'REVIEWING', title: 'Đang Xem Xét', color: 'border-blue-400 bg-blue-50/40 text-blue-800', icon: Clock },
    { id: 'ACTION_REQUIRED', title: 'Cần Hành Động', color: 'border-amber-400 bg-amber-50/40 text-amber-800', icon: AlertCircle },
    { id: 'IN_PROGRESS', title: 'Đang Triển Khai', color: 'border-purple-400 bg-purple-50/40 text-purple-800', icon: Layers },
    { id: 'CONVERTED', title: 'Chốt Thành Công', color: 'border-emerald-400 bg-emerald-50/40 text-emerald-800', icon: CheckCircle2 }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 overflow-x-auto pb-4">
      {columns.map(col => {
        const colItems = opportunities.filter(o => o.status === col.id);
        const ColIcon = col.icon;

        return (
          <div 
            key={col.id} 
            className="flex flex-col bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3 min-w-[280px]"
          >
            {/* Column Header */}
            <div className={`flex items-center justify-between p-2.5 rounded-xl border mb-3 ${col.color}`}>
              <div className="flex items-center gap-2">
                <ColIcon className="w-4 h-4" />
                <span className="font-bold text-xs">{col.title}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/80 shadow-2xs">
                {colItems.length}
              </span>
            </div>

            {/* Cards List in Column */}
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
              {colItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  Chưa có cơ hội ở giai đoạn này
                </div>
              ) : (
                colItems.map(opp => (
                  <OpportunityCard
                    key={opp.id}
                    opportunity={opp}
                    compact={true}
                    onSelectForQuote={onSelectForQuote}
                    onOpenCustomer360={onOpenCustomer360}
                    onOpenRateReview={onOpenRateReview}
                    onOpenFollowUp={onOpenFollowUp}
                    onUpdateStatus={onUpdateStatus}
                    onSnooze={onSnooze}
                    onDismiss={onDismiss}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
