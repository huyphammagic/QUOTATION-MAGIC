import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  AlertCircle, 
  RotateCcw 
} from 'lucide-react';
import { PaymentStatus } from '../../types/quotationPayment';

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  daysOverdue?: number;
  outstandingBalanceUsd?: number;
  totalPaidUsd?: number;
  showAmount?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({
  status,
  daysOverdue = 0,
  outstandingBalanceUsd,
  showAmount = false,
  size = 'md',
  onClick,
  className = ''
}) => {
  const isClickable = !!onClick;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold'
  }[size];

  const config = {
    PAID: {
      label: 'Đã Thanh Toán Đủ',
      icon: CheckCircle2,
      style: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
    },
    PARTIALLY_PAID: {
      label: 'Đã Đặt Cọc / Một Phần',
      icon: Clock,
      style: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
    },
    UNPAID: {
      label: 'Chưa Thanh Toán',
      icon: AlertCircle,
      style: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
    },
    OVERDUE: {
      label: daysOverdue > 0 ? `Quá Hạn (${daysOverdue} ngày)` : 'Quá Hạn Công Nợ',
      icon: AlertTriangle,
      style: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 animate-pulse'
    },
    REFUNDED: {
      label: 'Đã Hoàn Tiền',
      icon: RotateCcw,
      style: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300'
    }
  }[status] || {
    label: 'Chưa Rõ',
    icon: AlertCircle,
    style: 'bg-slate-100 border-slate-200 text-slate-700'
  };

  const Icon = config.icon;

  return (
    <span
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={`inline-flex items-center rounded-lg border font-medium transition-all ${config.style} ${sizeClasses} ${
        isClickable ? 'cursor-pointer hover:shadow-xs active:scale-95' : ''
      } ${className}`}
      title={isClickable ? 'Nhấp để quản lý thanh toán & công nợ' : undefined}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      <span>{config.label}</span>
      {showAmount && outstandingBalanceUsd !== undefined && outstandingBalanceUsd > 0 && (
        <span className="font-mono text-[10px] opacity-80 border-l border-current/30 pl-1.5 ml-0.5">
          Còn ${outstandingBalanceUsd.toLocaleString()}
        </span>
      )}
    </span>
  );
};
