/**
 * Phase 45: Smart CRM Intelligence & Rule-Based Recommendation Engine
 * Detects sales follow-up needs, customer care actions, and rate reviews based purely on real data.
 */

import { CustomerRecord, QuoteData } from '../../types/logistics';
import { ShipmentRecord } from '../../types/shipment';
import { ContractRecord } from '../../types/contract';
import { CustomerFollowUp, RateReviewTask, SmartCRMRecommendation } from '../../types/crm';

export interface SmartCRMContext {
  customers: CustomerRecord[];
  quotes: QuoteData[];
  shipments: ShipmentRecord[];
  contracts: ContractRecord[];
  followUps: CustomerFollowUp[];
  rateReviewTasks?: RateReviewTask[];
}

export function detectSmartCRMRecommendations(
  customers: CustomerRecord[],
  quotes: QuoteData[],
  shipments: ShipmentRecord[],
  contracts: ContractRecord[],
  followUps: CustomerFollowUp[],
  rateReviewTasks: RateReviewTask[] = []
): SmartCRMRecommendation[] {
  const recommendations: SmartCRMRecommendation[] = [];
  const now = new Date();
  const nowMs = now.getTime();

  // 1. Overdue Follow-ups
  followUps.forEach(fu => {
    if ((fu.status === 'OPEN' || fu.status === 'IN_PROGRESS') && fu.dueDate) {
      const dueMs = new Date(fu.dueDate).getTime();
      if (dueMs < nowMs) {
        const daysOver = Math.floor((nowMs - dueMs) / (1000 * 60 * 60 * 24));
        recommendations.push({
          id: `rec_fu_${fu.id}`,
          type: 'FOLLOWUP_OVERDUE',
          title: `Chăm sóc khách hàng quá hạn (${daysOver > 0 ? `${daysOver} ngày` : 'hôm nay'})`,
          reason: `Lịch theo dõi "${fu.notes.slice(0, 50)}" đã quá hạn cam kết.`,
          evidenceData: `Hạn chót: ${new Date(fu.dueDate).toLocaleString('vi-VN')} | Người phụ trách: ${fu.ownerName}`,
          suggestedAction: 'Liên hệ ngay với khách hàng để cập nhật thông tin và hoàn tất follow-up.',
          priority: 'URGENT',
          customerId: fu.customerId,
          customerName: fu.customerName,
          relatedEntityType: fu.relatedEntityType || 'CUSTOMER',
          relatedEntityId: fu.id,
          relatedEntityNumber: fu.relatedEntityNumber,
          actionPayload: { followUpId: fu.id, type: 'COMPLETE_FOLLOWUP' },
          detectedAt: now.toISOString(),
        });
      }
    }
  });

  // 2. Quotations Expiring Soon (< 4 days)
  quotes.forEach(q => {
    const validityDate = q.terms?.validityDate;
    if ((q.status === 'SENT' || q.status === 'DRAFT') && validityDate) {
      const validMs = new Date(validityDate).getTime();
      const diffDays = Math.ceil((validMs - nowMs) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 4) {
        recommendations.push({
          id: `rec_qe_${q.id}`,
          type: 'QUOTATION_EXPIRING',
          title: `Báo giá ${q.quoteNumber} sắp hết hạn (${diffDays} ngày)`,
          reason: 'Báo giá đã gửi cho khách hàng chuẩn bị hết hiệu lực cước vận chuyển.',
          evidenceData: `Khách hàng: ${q.customer?.companyName || q.customer?.customerName} | Hiệu lực đến: ${validityDate} | Trị giá: ${(q.subtotalVnd || 0).toLocaleString()} VND`,
          suggestedAction: 'Gọi điện hoặc gửi tin nhắn hỏi thăm quyết định của khách hàng để kịp lock chỗ tàu/xe trước khi giá đổi.',
          priority: diffDays <= 1 ? 'HIGH' : 'MEDIUM',
          customerId: q.customer?.id || '',
          customerName: q.customer?.companyName || q.customer?.customerName || '',
          relatedEntityType: 'QUOTATION',
          relatedEntityId: q.id,
          relatedEntityNumber: q.quoteNumber,
          actionPayload: { quoteId: q.id, quoteNumber: q.quoteNumber },
          detectedAt: now.toISOString(),
        });
      }
    }
  });

  // 3. Quotation Sent but No Response (> 48 hours)
  quotes.forEach(q => {
    const createdDate = q.createdDate;
    if (q.status === 'SENT' && createdDate) {
      const sentMs = new Date(createdDate).getTime();
      const hoursSinceSent = (nowMs - sentMs) / (1000 * 60 * 60);
      if (hoursSinceSent >= 48 && hoursSinceSent <= 240) {
        const hasExistingFu = followUps.some(f => f.relatedEntityId === q.id && f.status === 'OPEN');
        if (!hasExistingFu) {
          recommendations.push({
            id: `rec_qnr_${q.id}`,
            type: 'QUOTATION_NO_RESPONSE',
            title: `Báo giá ${q.quoteNumber} chưa có phản hồi (${Math.floor(hoursSinceSent / 24)} ngày)`,
            reason: 'Báo giá đã gửi hơn 48 giờ nhưng chưa nhận được phản hồi chấp nhận hoặc từ chối.',
            evidenceData: `Gửi lúc: ${new Date(createdDate).toLocaleString('vi-VN')} | Tuyến: ${q.shipment?.origin || q.shipment?.pol || 'POL'} ➔ ${q.shipment?.destination || q.shipment?.pod || 'POD'}`,
            suggestedAction: 'Chủ động liên hệ hỗ trợ giải đáp thắc mắc về phụ phí (local charges) hoặc lịch trình tàu.',
            priority: 'MEDIUM',
            customerId: q.customer?.id || '',
            customerName: q.customer?.companyName || q.customer?.customerName || '',
            relatedEntityType: 'QUOTATION',
            relatedEntityId: q.id,
            relatedEntityNumber: q.quoteNumber,
            actionPayload: { quoteId: q.id, quoteNumber: q.quoteNumber },
            detectedAt: now.toISOString(),
          });
        }
      }
    }
  });

  // 4. Quotation Rejected Follow-up (Analyze reason)
  quotes.forEach(q => {
    const updatedDate = q.updatedDate;
    if (q.status === 'REJECTED' && updatedDate) {
      const rejectMs = new Date(updatedDate).getTime();
      const daysSinceReject = (nowMs - rejectMs) / (1000 * 60 * 60 * 24);
      if (daysSinceReject <= 7) {
        const hasExistingFu = followUps.some(f => f.relatedEntityId === q.id);
        if (!hasExistingFu) {
          recommendations.push({
            id: `rec_qr_${q.id}`,
            type: 'QUOTATION_REJECTED',
            title: `Phân tích nguyên nhân báo giá ${q.quoteNumber} bị từ chối`,
            reason: 'Khách hàng vừa từ chối báo giá trong tuần qua.',
            evidenceData: `Khách: ${q.customer?.companyName || ''} | Lý do: ${q.terms?.exclusionsNotes || 'Chưa ghi chú'}`,
            suggestedAction: 'Liên hệ lắng nghe lý do (giá cao hơn đối thủ, thời gian vận chuyển dài) để xin cơ hội chào giá lại ở lô kế tiếp.',
            priority: 'MEDIUM',
            customerId: q.customer?.id || '',
            customerName: q.customer?.companyName || '',
            relatedEntityType: 'QUOTATION',
            relatedEntityId: q.id,
            relatedEntityNumber: q.quoteNumber,
            actionPayload: { quoteId: q.id, quoteNumber: q.quoteNumber },
            detectedAt: now.toISOString(),
          });
        }
      }
    }
  });

  // 5. Quotation Accepted Follow-up (Ensure booking slot)
  quotes.forEach(q => {
    const updatedDate = q.updatedDate;
    if (q.status === 'ACCEPTED' && updatedDate) {
      const acceptMs = new Date(updatedDate).getTime();
      const daysSinceAccept = (nowMs - acceptMs) / (1000 * 60 * 60 * 24);
      if (daysSinceAccept <= 5) {
        const hasShipment = shipments.some(s => s.quotationId === q.id || s.quotationNumber === q.quoteNumber);
        if (!hasShipment) {
          recommendations.push({
            id: `rec_qa_${q.id}`,
            type: 'QUOTATION_ACCEPTED',
            title: `Tạo lô hàng vận hành cho báo giá đã chốt ${q.quoteNumber}`,
            reason: 'Báo giá đã được khách hàng xác nhận nhưng chưa khởi tạo lô hàng vận hành (Shipment).',
            evidenceData: `Khách: ${q.customer?.companyName} | Trị giá: ${(q.subtotalVnd || 0).toLocaleString()} VND`,
            suggestedAction: 'Tạo Shipment từ báo giá và phối hợp với Ops/CS để lấy Booking/Shipping Instruction (SI).',
            priority: 'HIGH',
            customerId: q.customer?.id || '',
            customerName: q.customer?.companyName || '',
            relatedEntityType: 'QUOTATION',
            relatedEntityId: q.id,
            relatedEntityNumber: q.quoteNumber,
            actionPayload: { quoteId: q.id, quoteNumber: q.quoteNumber },
            detectedAt: now.toISOString(),
          });
        }
      }
    }
  });

  // 6. Dormant Customer Reactivation
  customers.forEach(c => {
    const cQuotes = quotes.filter(q => q.customer?.id === c.id || q.customer?.companyName === c.companyName);
    const cShipments = shipments.filter(s => s.customerId === c.id || s.customerName === c.companyName);

    if (cQuotes.length > 0 || cShipments.length > 0) {
      let latestActivityMs = 0;
      cQuotes.forEach(q => {
        const ms = new Date(q.createdDate || '').getTime();
        if (ms > latestActivityMs) latestActivityMs = ms;
      });
      cShipments.forEach(s => {
        const ms = new Date(s.cargoReadyDate || s.etdPlanned || '').getTime();
        if (ms > latestActivityMs) latestActivityMs = ms;
      });

      if (latestActivityMs > 0) {
        const daysSilent = Math.floor((nowMs - latestActivityMs) / (1000 * 60 * 60 * 24));
        if (daysSilent >= 60) {
          recommendations.push({
            id: `rec_dormant_${c.id}`,
            type: 'CUSTOMER_DORMANT',
            title: `Kích hoạt lại khách hàng ${c.companyName || c.customerName} (${daysSilent} ngày không tương tác)`,
            reason: 'Khách hàng từng có lịch sử giao dịch nhưng đã hơn 2 tháng không phát sinh yêu cầu báo giá hay shipment mới.',
            evidenceData: `Lịch sử: ${cQuotes.length} báo giá, ${cShipments.length} lô hàng | Hoạt động cuối: ${daysSilent} ngày trước`,
            suggestedAction: 'Gửi cập nhật xu hướng giá cước thị trường hoặc thăm hỏi kế hoạch xuất nhập khẩu tháng tới.',
            priority: 'LOW',
            customerId: c.id,
            customerName: c.companyName || c.customerName,
            relatedEntityType: 'CUSTOMER',
            relatedEntityId: c.id,
            actionPayload: { customerId: c.id },
            detectedAt: now.toISOString(),
          });
        }
      }
    }
  });

  // 7. Contract Expiring (< 30 days)
  contracts.forEach(cnt => {
    if (cnt.status === 'ACTIVE' && cnt.expiryDate) {
      const expMs = new Date(cnt.expiryDate).getTime();
      const daysToExpiry = Math.ceil((expMs - nowMs) / (1000 * 60 * 60 * 24));
      if (daysToExpiry >= 0 && daysToExpiry <= 30) {
        recommendations.push({
          id: `rec_cnte_${cnt.id}`,
          type: 'CONTRACT_EXPIRING',
          title: `Hợp đồng ${cnt.contractNumber} sắp hết hạn (${daysToExpiry} ngày)`,
          reason: 'Hợp đồng dịch vụ logistics với khách hàng sắp hết hiệu lực pháp lý.',
          evidenceData: `Khách hàng: ${cnt.partyName} | Ngày hết hạn: ${cnt.expiryDate} | Số biểu cước: ${cnt.totalRatesCount || 0}`,
          suggestedAction: 'Tiến hành rà soát biểu cước hợp đồng và dự thảo phụ lục gia hạn gửi khách hàng.',
          priority: daysToExpiry <= 10 ? 'HIGH' : 'MEDIUM',
          customerId: cnt.partyId || '',
          customerName: cnt.partyName || '',
          relatedEntityType: 'CONTRACT',
          relatedEntityId: cnt.id,
          relatedEntityNumber: cnt.contractNumber,
          actionPayload: { contractId: cnt.id, contractNumber: cnt.contractNumber },
          detectedAt: now.toISOString(),
        });
      }
    }
  });

  // 8. Rate Review Due Tasks
  rateReviewTasks.forEach(task => {
    if (task.status === 'REVIEW_REQUIRED' && task.dueAt) {
      const dueMs = new Date(task.dueAt).getTime();
      if (dueMs <= nowMs + 3 * 24 * 60 * 60 * 1000) {
        recommendations.push({
          id: `rec_rr_${task.id}`,
          type: 'RATE_REVIEW_DUE',
          title: `Rà soát cước tuyến ${task.lane} cho khách ${task.customerName}`,
          reason: task.reason || 'Đến chu kỳ rà soát cước thị trường định kỳ.',
          evidenceData: `Tuyến: ${task.lane} | Mode: ${task.serviceMode} | Giá Sell hiện tại: $${task.currentSellRate || 'N/A'}`,
          suggestedAction: task.suggestedAction || 'Kiểm tra biến động giá hãng tàu và cập nhật lại mức cước.',
          priority: 'HIGH',
          customerId: task.customerId,
          customerName: task.customerName,
          relatedEntityType: 'RATE',
          relatedEntityId: task.id,
          relatedEntityNumber: task.lane,
          actionPayload: { taskId: task.id },
          detectedAt: now.toISOString(),
        });
      }
    }
  });

  return recommendations;
}

export function generateCRMIntelligenceRecommendations(
  context: SmartCRMContext
): SmartCRMRecommendation[] {
  return detectSmartCRMRecommendations(
    context.customers,
    context.quotes,
    context.shipments,
    context.contracts,
    context.followUps,
    context.rateReviewTasks || []
  );
}
