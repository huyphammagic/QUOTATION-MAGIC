import React, { useState } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Send, 
  X, 
  AlertCircle,
  HelpCircle,
  TrendingDown
} from 'lucide-react';
import { QuotationLineItemFeedback } from '../../types/quotationCommunication';
import { LineItem } from '../../types/logistics';
import { SanitizedLineItem } from '../../types/quotationDocument';

interface QuotationNegotiationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  lineItems: (LineItem | SanitizedLineItem)[];
  currency: string;
  onSubmitFeedbacks: (feedbacks: QuotationLineItemFeedback[], generalMessage: string) => void;
  isSubmitting?: boolean;
}

export const QuotationNegotiationPanel: React.FC<QuotationNegotiationPanelProps> = ({
  isOpen,
  onClose,
  lineItems,
  currency,
  onSubmitFeedbacks,
  isSubmitting = false,
}) => {
  const [generalMessage, setGeneralMessage] = useState('');
  const [feedbacks, setFeedbacks] = useState<QuotationLineItemFeedback[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>(lineItems[0]?.id || '');
  const [itemNote, setItemNote] = useState('');
  const [proposedRate, setProposedRate] = useState<string>('');

  if (!isOpen) return null;

  const handleAddLineFeedback = () => {
    if (!itemNote.trim()) return;
    const targetItem = lineItems.find(i => i.id === selectedItemId);
    if (!targetItem) return;

    const newFeedback: QuotationLineItemFeedback = {
      itemId: targetItem.id,
      itemCode: targetItem.code || targetItem.description,
      itemDescription: targetItem.description,
      note: itemNote.trim(),
      proposedRate: proposedRate ? parseFloat(proposedRate) : undefined,
      currency,
    };

    setFeedbacks(prev => [...prev.filter(f => f.itemId !== targetItem.id), newFeedback]);
    setItemNote('');
    setProposedRate('');
  };

  const handleRemoveFeedback = (itemId: string) => {
    setFeedbacks(prev => prev.filter(f => f.itemId !== itemId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedbacks.length === 0 && !generalMessage.trim()) {
      alert('Vui lòng nhập nội dung đề xuất hoặc ghi chú điều chỉnh.');
      return;
    }
    onSubmitFeedbacks(feedbacks, generalMessage);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Gửi Yêu Cầu Đàm Phán & Điều Chỉnh Báo Giá</h3>
              <p className="text-[11px] text-slate-400">Đội ngũ Pricing & Sales sẽ rà soát và phản hồi trong 2 giờ làm việc</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          
          {/* General revision note */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Ghi chú chung / Ý kiến phản hồi của Quý khách:
            </label>
            <textarea
              rows={3}
              value={generalMessage}
              onChange={(e) => setGeneralMessage(e.target.value)}
              placeholder="VD: Chúng tôi có khối lượng 10 conts/tháng, nhờ công ty hỗ trợ biểu cước ưu đãi hơn hoặc nới thêm thời gian lưu bãi Free Time..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          {/* Line-item Specific Feedback Builder */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-blue-600" />
                <span>Đề xuất điều chỉnh theo từng dòng mục chi phí</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Chọn dòng phí:</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-medium focus:outline-none"
                >
                  {lineItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.code} - {item.description} ({item.unitPrice.toLocaleString()} {currency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Giá mong muốn ({currency}):</label>
                <input
                  type="number"
                  step="any"
                  value={proposedRate}
                  onChange={(e) => setProposedRate(e.target.value)}
                  placeholder="VD: 2200"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-medium focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Chi tiết yêu cầu cho mục này:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  placeholder="VD: Nhờ hãng tàu hỗ trợ giảm $150 cho dòng O/F này..."
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-medium focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddLineFeedback}
                  disabled={!itemNote.trim()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg font-semibold text-xs transition-colors shrink-0 cursor-pointer"
                >
                  Thêm mục
                </button>
              </div>
            </div>

            {/* List of added feedbacks */}
            {feedbacks.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Các mục đã ghi chú ({feedbacks.length}):
                </span>
                {feedbacks.map(f => (
                  <div key={f.itemId} className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-blue-900 font-mono mr-1.5">[{f.itemCode}]</span>
                      <span className="text-slate-800">{f.note}</span>
                      {f.proposedRate !== undefined && (
                        <span className="ml-2 font-mono font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded text-[11px]">
                          Target: {f.proposedRate.toLocaleString()} {currency}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFeedback(f.itemId)}
                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footbar */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Đang gửi phản hồi...' : 'Gửi Đề Xuất Điều Chỉnh'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
