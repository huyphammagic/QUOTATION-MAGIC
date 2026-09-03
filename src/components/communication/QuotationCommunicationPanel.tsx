import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  Link2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Calendar, 
  Eye, 
  Copy, 
  Check, 
  ShieldAlert, 
  UserCheck, 
  MessageSquare, 
  ExternalLink,
  Plus,
  RefreshCw,
  FileText,
  Trash2,
  Lock
} from 'lucide-react';
import { QuoteData } from '../../types/logistics';
import { 
  QuotationCommunication, 
  QuotationSecureLink, 
  QuotationFollowUp, 
  QuotationTimelineEvent,
  QuotationCustomerResponse
} from '../../types/quotationCommunication';
import { QuotationDocumentRecord } from '../../types/quotationDocument';
import { 
  getCommunicationsForQuotation, 
  getFollowUpsForQuotation, 
  buildQuotationTimeline,
  updateFollowUpStatus 
} from '../../services/quotation/quotationCommunicationService';
import { getLinksForQuotation, revokeSecureLink, getCustomerResponses } from '../../services/quotation/quotationSecurityService';

interface QuotationCommunicationPanelProps {
  quote: QuoteData;
  documents: QuotationDocumentRecord[];
  onOpenSendModal: () => void;
  onOpenFollowUpModal: () => void;
  onOpenSecureLinkPreview?: (token: string) => void;
  onRefreshQuote?: () => void;
}

export const QuotationCommunicationPanel: React.FC<QuotationCommunicationPanelProps> = ({
  quote,
  documents,
  onOpenSendModal,
  onOpenFollowUpModal,
  onOpenSecureLinkPreview,
  onRefreshQuote
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'history' | 'links' | 'followups'>('timeline');
  const [timelineEvents, setTimelineEvents] = useState<QuotationTimelineEvent[]>([]);
  const [communications, setCommunications] = useState<QuotationCommunication[]>([]);
  const [links, setLinks] = useState<QuotationSecureLink[]>([]);
  const [followUps, setFollowUps] = useState<QuotationFollowUp[]>([]);
  const [customerResponses, setCustomerResponses] = useState<QuotationCustomerResponse[]>([]);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Selected communication to view snapshot
  const [viewingComm, setViewingComm] = useState<QuotationCommunication | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tl, comms, lks, fus, resps] = await Promise.all([
        buildQuotationTimeline(quote),
        getCommunicationsForQuotation(quote.id),
        getLinksForQuotation(quote.id),
        getFollowUpsForQuotation(quote.id),
        getCustomerResponses(quote.id),
      ]);
      setTimelineEvents(tl);
      setCommunications(comms);
      setLinks(lks);
      setFollowUps(fus);
      setCustomerResponses(resps);
    } catch (e) {
      console.warn('Error loading communication panel data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [quote.id, quote.status, quote.updatedDate]);

  const handleCopyLink = (link: QuotationSecureLink) => {
    const url = `${window.location.origin}/q/${link.token || 'preview'}`;
    navigator.clipboard.writeText(url);
    setCopiedLinkId(link.id);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  const handleRevoke = async (linkId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn thu hồi liên kết báo giá này? Khách hàng sẽ không thể truy cập được nữa.')) {
      await revokeSecureLink(linkId, quote.company.salesRepName || 'Sales Rep');
      loadData();
    }
  };

  const handleToggleFollowUp = async (fu: QuotationFollowUp) => {
    const nextStatus = fu.status === 'COMPLETED' ? 'OPEN' : 'COMPLETED';
    await updateFollowUpStatus(fu.id, nextStatus, quote.company.salesRepName || 'Sales Rep');
    loadData();
  };

  const isApproved = ['APPROVED', 'ISSUED', 'SENT'].includes(quote.status);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col text-xs">
      
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 via-white to-blue-50/30">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-100/80 rounded-xl text-blue-800 border border-blue-200/60">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-sm text-slate-900">GIAO TIẾP & LỊCH SỬ GỬI KHÁCH HÀNG</h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                quote.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                quote.status === 'SENT' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                quote.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800 border-emerald-400' :
                quote.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-300' :
                'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {quote.status}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Quản lý lịch sử email, liên kết chia sẻ bảo mật, tiến trình phản hồi và lịch chăm sóc báo giá.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={loadData}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onOpenFollowUpModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors text-xs border border-slate-200"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lên Lịch Follow-Up</span>
          </button>

          <button
            type="button"
            onClick={onOpenSendModal}
            className="flex items-center space-x-1.5 px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold shadow-xs hover:shadow transition-all text-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Gửi Báo Giá (Send Email)</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 px-4 sm:px-5 bg-slate-50/60 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          className={`py-3 px-3 font-bold text-xs border-b-2 flex items-center space-x-1.5 transition-colors whitespace-nowrap ${
            activeTab === 'timeline' 
              ? 'border-blue-700 text-blue-700' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Tiến Trình (Timeline) ({timelineEvents.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`py-3 px-3 font-bold text-xs border-b-2 flex items-center space-x-1.5 transition-colors whitespace-nowrap ${
            activeTab === 'history' 
              ? 'border-blue-700 text-blue-700' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Lịch Sử Gửi Email ({communications.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('links')}
          className={`py-3 px-3 font-bold text-xs border-b-2 flex items-center space-x-1.5 transition-colors whitespace-nowrap ${
            activeTab === 'links' 
              ? 'border-blue-700 text-blue-700' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>Liên Kết Bảo Mật ({links.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('followups')}
          className={`py-3 px-3 font-bold text-xs border-b-2 flex items-center space-x-1.5 transition-colors whitespace-nowrap ${
            activeTab === 'followups' 
              ? 'border-blue-700 text-blue-700' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Nhiệm Vụ Chăm Sóc ({followUps.filter(f => f.status === 'OPEN').length} Chờ)</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-5 sm:p-6 overflow-y-auto">
        
        {/* 1. TIMELINE TAB */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            {timelineEvents.length === 0 ? (
              <p className="text-slate-400 italic text-center py-8">Chưa có sự kiện nào được ghi nhận.</p>
            ) : (
              <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-200 space-y-6 ml-3 sm:ml-4">
                {timelineEvents.map((evt) => {
                  let dotColor = 'bg-blue-600 ring-blue-100';
                  if (evt.badgeColor === 'emerald') dotColor = 'bg-emerald-600 ring-emerald-100';
                  if (evt.badgeColor === 'rose') dotColor = 'bg-rose-600 ring-rose-100';
                  if (evt.badgeColor === 'amber' || evt.badgeColor === 'orange') dotColor = 'bg-amber-600 ring-amber-100';
                  if (evt.badgeColor === 'indigo' || evt.badgeColor === 'purple') dotColor = 'bg-indigo-600 ring-indigo-100';

                  return (
                    <div key={evt.id} className="relative group">
                      {/* Timeline Marker Dot */}
                      <div className={`absolute -left-[31px] sm:-left-[39px] top-1 w-4 h-4 rounded-full ring-4 ${dotColor}`} />
                      
                      <div className="bg-slate-50 hover:bg-slate-100/80 rounded-xl p-3.5 border border-slate-200/80 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                          <h4 className="font-bold text-slate-900 text-xs flex items-center space-x-2">
                            <span>{evt.title}</span>
                          </h4>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(evt.timestamp).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        <p className="text-slate-600 leading-relaxed text-xs">{evt.description}</p>
                        <div className="mt-2 text-[10px] text-slate-400 flex items-center space-x-1">
                          <span>Thực hiện bởi:</span>
                          <strong className="text-slate-600">{evt.actor}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. EMAIL HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {communications.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-600 font-semibold">Chưa có lượt gửi email nào cho báo giá này.</p>
                <p className="text-slate-400 text-[11px] mt-0.5">Bấm nút "Gửi Báo Giá" ở góc trên để gửi email chính thức cho khách hàng.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {communications.map((comm) => (
                  <div key={comm.id} className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white space-y-2 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-800 font-bold text-[10px] rounded uppercase border border-blue-200">
                          {comm.status}
                        </span>
                        <h4 className="font-bold text-slate-900 text-xs">{comm.subject}</h4>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(comm.sentAt || comm.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 text-[11px]">
                      <p>Người nhận (To): <strong className="text-slate-800">{comm.recipients.join(', ')}</strong></p>
                      {comm.cc && comm.cc.length > 0 && <p>CC: <strong>{comm.cc.join(', ')}</strong></p>}
                      <p>Người gửi: <strong>{comm.sentByName || comm.sentBy}</strong></p>
                      {comm.secureLinkUrl && (
                        <p className="text-blue-700 truncate">
                          Liên kết an toàn: <a href={comm.secureLinkUrl} target="_blank" rel="noreferrer" className="underline">{comm.secureLinkUrl}</a>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-400 font-mono text-[10px]">Mã ID: {comm.id}</span>
                      <button
                        type="button"
                        onClick={() => setViewingComm(comm)}
                        className="text-blue-700 hover:text-blue-800 font-bold flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem Bản Chụp Nội Dung (Snapshot)</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. SECURE LINKS TAB */}
        {activeTab === 'links' && (
          <div className="space-y-4">
            {links.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <Link2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-600 font-semibold">Chưa có liên kết bảo mật nào được tạo.</p>
                <p className="text-slate-400 text-[11px] mt-0.5">Liên kết bảo mật sẽ được tự động tạo khi bạn gửi email hoặc chia sẻ báo giá trực tuyến.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {links.map((link) => {
                  const isExpired = new Date(link.expiresAt) < new Date();
                  const isRevoked = link.status === 'REVOKED';

                  return (
                    <div key={link.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            isRevoked ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            isExpired ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {isRevoked ? 'ĐÃ THU HỒI (REVOKED)' : isExpired ? 'HẾT HẠN (EXPIRED)' : 'HOẠT ĐỘNG (ACTIVE)'}
                          </span>
                          <span className="font-mono text-xs text-slate-600">ID: {link.id}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Hết hạn vào: <strong>{new Date(link.expiresAt).toLocaleDateString('vi-VN')}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] bg-slate-50 p-2.5 rounded-lg">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Lượt Xem (Views):</span>
                          <strong className="text-blue-900 text-sm">{link.viewCount || 0}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Xem Lần Đầu:</span>
                          <span className="text-slate-700 font-medium">
                            {link.firstViewedAt ? new Date(link.firstViewedAt).toLocaleString('vi-VN') : 'Chưa xem'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Xem Gần Nhất:</span>
                          <span className="text-slate-700 font-medium">
                            {link.lastViewedAt ? new Date(link.lastViewedAt).toLocaleString('vi-VN') : 'Chưa xem'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Khách Hàng:</span>
                          <span className="text-slate-800 font-semibold truncate block">{link.customerName}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleCopyLink(link)}
                            className="flex items-center space-x-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors border border-slate-200"
                          >
                            {copiedLinkId === link.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                            <span>{copiedLinkId === link.id ? 'Đã Sao Chép!' : 'Sao Chép Link'}</span>
                          </button>

                          {onOpenSecureLinkPreview && link.token && (
                            <button
                              type="button"
                              onClick={() => onOpenSecureLinkPreview(link.token!)}
                              className="flex items-center space-x-1 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors border border-blue-200"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Mở Xem Thử (Portal View)</span>
                            </button>
                          )}
                        </div>

                        {!isRevoked && (
                          <button
                            type="button"
                            onClick={() => handleRevoke(link.id)}
                            className="text-rose-600 hover:text-rose-800 text-[11px] font-bold flex items-center space-x-1"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Thu Hồi Link (Revoke)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 4. FOLLOW-UPS TAB */}
        {activeTab === 'followups' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">
                LỊCH TRÌNH CHĂM SÓC KHÁCH HÀNG (FOLLOW-UP REMINDERS)
              </span>
              <button
                type="button"
                onClick={onOpenFollowUpModal}
                className="flex items-center space-x-1 text-blue-700 hover:text-blue-800 font-bold text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm Nhiệm Vụ Mới</span>
              </button>
            </div>

            {followUps.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-600 font-semibold">Chưa có lịch follow-up nào cho báo giá này.</p>
                <p className="text-slate-400 text-[11px] mt-0.5">Lên lịch theo dõi định kỳ để tăng tỷ lệ chốt đơn (Close Rate) với khách hàng.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {followUps.map((fu) => {
                  const isDone = fu.status === 'COMPLETED';

                  return (
                    <div 
                      key={fu.id} 
                      className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                        isDone 
                          ? 'bg-slate-50 border-slate-200 opacity-70' 
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <button
                          type="button"
                          onClick={() => handleToggleFollowUp(fu)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 transition-colors ${
                            isDone 
                              ? 'bg-emerald-600 border-emerald-600 text-white' 
                              : 'border-slate-300 hover:border-blue-500 bg-white'
                          }`}
                        >
                          {isDone && <Check className="w-3.5 h-3.5" />}
                        </button>

                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              fu.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' :
                              fu.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                              'bg-blue-50 text-blue-800'
                            }`}>
                              {fu.priority}
                            </span>
                            <span className="font-bold text-slate-800 text-xs">Hạn xử lý: {fu.followUpDate}</span>
                            <span className="text-slate-400 text-[11px]">&bull; Phụ trách: {fu.assignedToName}</span>
                          </div>
                          <p className={`text-xs ${isDone ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                            {fu.note}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isDone ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {fu.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Communication Snapshot Modal */}
      {viewingComm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">{viewingComm.subject}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Đã gửi đến: {viewingComm.recipients.join(', ')} &bull; Lúc: {new Date(viewingComm.sentAt || viewingComm.createdAt).toLocaleString('vi-VN')}
                </p>
              </div>
              <button onClick={() => setViewingComm(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div 
              className="p-4 bg-slate-50 rounded-xl border border-slate-200 overflow-y-auto flex-1 prose prose-sm text-slate-800 text-xs leading-relaxed"
              dangerouslySetInnerHTML={{ __html: viewingComm.bodySnapshot }}
            />

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingComm(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
