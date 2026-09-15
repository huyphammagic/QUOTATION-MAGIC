import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import { QuoteData } from '../../types/logistics';
import { QuotationDocumentRecord } from '../../types/quotationDocument';
import { QuotationCommunicationPanel } from './QuotationCommunicationPanel';

interface QuotationCommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: QuoteData;
  documents: QuotationDocumentRecord[];
  onOpenSendModal: () => void;
  onOpenFollowUpModal: () => void;
  onOpenSecureLinkPreview?: (token: string) => void;
  onRefreshQuote?: () => void;
}

export const QuotationCommunicationModal: React.FC<QuotationCommunicationModalProps> = ({
  isOpen,
  onClose,
  quote,
  documents,
  onOpenSendModal,
  onOpenFollowUpModal,
  onOpenSecureLinkPreview,
  onRefreshQuote,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      id="quotation-communication-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 text-slate-100 rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden border border-slate-700 flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
              <ExternalLink className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Trung Tâm Giao Tiếp & Phản Hồi Khách Hàng
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Báo giá: <span className="text-blue-400 font-bold">{quote.quoteNumber || 'N/A'}</span> &bull; {quote.customer?.companyName || 'Khách hàng chưa chọn'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900">
          <QuotationCommunicationPanel
            quote={quote}
            documents={documents}
            onOpenSendModal={() => {
              onClose();
              onOpenSendModal();
            }}
            onOpenFollowUpModal={() => {
              onClose();
              onOpenFollowUpModal();
            }}
            onOpenSecureLinkPreview={(tok) => {
              onClose();
              if (onOpenSecureLinkPreview) onOpenSecureLinkPreview(tok);
            }}
            onRefreshQuote={onRefreshQuote}
          />
        </div>
      </div>
    </div>
  );
};
