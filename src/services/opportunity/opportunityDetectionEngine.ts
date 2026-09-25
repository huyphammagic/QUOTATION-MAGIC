import { 
  BusinessOpportunity, 
  BusinessOpportunityType, 
  DataSufficiencyLevel, 
  OpportunityPriority 
} from '../../types/opportunity';
import { CustomerRecord, QuoteData } from '../../types/logistics';
import { ShipmentRecord } from '../../types/shipment';
import { ContractRecord } from '../../types/contract';
import { RateReviewTask, CustomerFollowUp } from '../../types/crm';

export interface OpportunityDetectionContext {
  companyId: string;
  customers: CustomerRecord[];
  quotes: QuoteData[];
  shipments: ShipmentRecord[];
  contracts: ContractRecord[];
  rateReviewTasks: RateReviewTask[];
  followUps: CustomerFollowUp[];
  user?: { email?: string; name?: string };
}

export function detectRealBusinessOpportunities(
  context: OpportunityDetectionContext
): BusinessOpportunity[] {
  const {
    companyId,
    customers = [],
    quotes = [],
    shipments = [],
    contracts = [],
    rateReviewTasks = [],
    followUps = [],
    user
  } = context;

  const opportunities: BusinessOpportunity[] = [];
  const now = new Date();
  const nowMs = now.getTime();
  const defaultOwnerId = user?.email || 'sales@logistics.vn';
  const defaultOwnerName = user?.name || 'Sales Representative';

  // Helper to safely format dates
  const formatSafeDate = (dStr?: string) => {
    if (!dStr) return '—';
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? dStr : d.toLocaleDateString('vi-VN');
  };

  // Helper for generating deterministic IDs
  const createOpportunityRecord = (
    type: BusinessOpportunityType,
    customerId: string,
    customerName: string,
    sourceEntityType: BusinessOpportunity['sourceEntityType'],
    sourceEntityId: string,
    sourceEntityNumber: string | undefined,
    title: string,
    reason: string,
    supportingData: string,
    suggestedAction: string,
    priority: OpportunityPriority,
    confidenceLevel: DataSufficiencyLevel,
    dataSufficiencyReason: string,
    extra: Partial<BusinessOpportunity> = {}
  ): BusinessOpportunity => {
    const safeSourceId = sourceEntityId || 'entity';
    const idempotencyKey = `${companyId}_${customerId}_${type}_${safeSourceId}`;
    const id = `opp_${Math.abs(hashString(idempotencyKey))}`;

    return {
      id,
      companyId: companyId || 'default-company',
      customerId,
      customerName: customerName || 'Khách hàng',
      title,
      opportunityType: type,
      sourceEntityType,
      sourceEntityId: safeSourceId,
      sourceEntityNumber,
      detectedAt: now.toISOString(),
      reason,
      supportingData,
      suggestedAction,
      ownerId: defaultOwnerId,
      ownerName: defaultOwnerName,
      priority,
      status: 'NEW',
      confidenceLevel,
      dataSufficiencyReason,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      idempotencyKey,
      ...extra
    };
  };

  // Simple string hash for deterministic IDs
  function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  // Pre-index quotes and shipments by customer
  const quotesByCust = new Map<string, QuoteData[]>();
  quotes.forEach(q => {
    const custId = q.customer?.id || (q.customer as any)?._id;
    if (custId) {
      const arr = quotesByCust.get(custId) || [];
      arr.push(q);
      quotesByCust.set(custId, arr);
    }
  });

  const shipmentsByCust = new Map<string, ShipmentRecord[]>();
  shipments.forEach(s => {
    const custId = s.customerId;
    if (custId) {
      const arr = shipmentsByCust.get(custId) || [];
      arr.push(s);
      shipmentsByCust.set(custId, arr);
    }
  });

  // ============================================================
  // RULE 1: CUSTOMER GROWTH OPPORTUNITY
  // Detect repeat activity in specific service/lane showing growth potential
  // ============================================================
  customers.forEach(cust => {
    const custQuotes = quotesByCust.get(cust.id) || [];
    const custShipments = shipmentsByCust.get(cust.id) || [];

    // Group activities by service mode
    const modeCounts: Record<string, number> = {};
    custQuotes.forEach(q => {
      const m = q.shipment?.mode || 'SEA_FCL';
      modeCounts[m] = (modeCounts[m] || 0) + 1;
    });
    custShipments.forEach(s => {
      const m = s.serviceMode || 'SEA_FCL';
      modeCounts[m] = (modeCounts[m] || 0) + 1;
    });

    Object.entries(modeCounts).forEach(([mode, count]) => {
      if (count >= 2) {
        const sufficiency: DataSufficiencyLevel = count >= 4 ? 'SUFFICIENT_DATA' : 'LIMITED_DATA';
        opportunities.push(
          createOpportunityRecord(
            'CUSTOMER_GROWTH',
            cust.id,
            cust.companyName || cust.customerName || 'Khách hàng',
            'CUSTOMER',
            `${cust.id}_${mode}`,
            cust.code,
            `Cơ hội phát triển sản lượng ${mode} - ${cust.companyName || cust.customerName}`,
            `Khách hàng có hoạt động lặp lại liên tục (${count} giao dịch) trong phương thức ${mode}.`,
            `Tổng ghi nhận: ${count} báo giá/lô hàng trong dữ liệu hệ thống. Phương thức chính: ${mode}.`,
            `Rà soát nhu cầu định kỳ, trao đổi về chính sách giá khung hoặc biểu cước hợp đồng theo quý để tối ưu chi phí và giữ chân khách hàng.`,
            count >= 5 ? 'HIGH' : 'NORMAL',
            sufficiency,
            `Dựa trên ${count} bản ghi báo giá/shipment thực tế của khách hàng.`,
            {
              serviceMode: mode,
              actionPayload: {
                serviceMode: mode,
                customerEmail: cust.email,
                customerPhone: cust.phone
              }
            }
          )
        );
      }
    });
  });

  // ============================================================
  // RULE 2: CUSTOMER RETENTION ATTENTION
  // Customer with historic activity but noticeable drop in recent 45+ days
  // ============================================================
  customers.forEach(cust => {
    const custQuotes = quotesByCust.get(cust.id) || [];
    const custShipments = shipmentsByCust.get(cust.id) || [];
    const totalRecords = custQuotes.length + custShipments.length;

    if (totalRecords >= 2) {
      // Find latest activity date
      let latestMs = 0;
      custQuotes.forEach(q => {
        const t = q.createdDate ? new Date(q.createdDate).getTime() : 0;
        if (!isNaN(t) && t > latestMs) latestMs = t;
      });
      custShipments.forEach(s => {
        const t = s.createdAt ? new Date(s.createdAt).getTime() : 0;
        if (!isNaN(t) && t > latestMs) latestMs = t;
      });

      if (latestMs > 0) {
        const daysSinceActivity = Math.floor((nowMs - latestMs) / (1000 * 60 * 60 * 24));
        if (daysSinceActivity >= 45 && daysSinceActivity <= 180) {
          opportunities.push(
            createOpportunityRecord(
              'CUSTOMER_RETENTION',
              cust.id,
              cust.companyName || cust.customerName || 'Khách hàng',
              'CUSTOMER',
              `${cust.id}_retention`,
              cust.code,
              `Nguy cơ giảm giao dịch: ${daysSinceActivity} ngày chưa có yêu cầu mới`,
              `Tần suất yêu cầu báo giá/vận chuyển của khách hàng đã chững lại (${daysSinceActivity} ngày không có giao dịch mới).`,
              `Lịch sử: ${totalRecords} giao dịch trước đó. Lần tương tác gần nhất: ${formatSafeDate(new Date(latestMs).toISOString())}.`,
              `Chủ động liên hệ thăm hỏi, rà soát mức độ hài lòng về các lô hàng trước và thăm dò kế hoạch xuất nhập khẩu tháng tới.`,
              daysSinceActivity >= 75 ? 'HIGH' : 'NORMAL',
              totalRecords >= 4 ? 'SUFFICIENT_DATA' : 'LIMITED_DATA',
              `Có ${totalRecords} bản ghi giao dịch lịch sử trước đợt gián đoạn.`,
              {
                dueDate: new Date(nowMs + 3 * 24 * 60 * 60 * 1000).toISOString(),
                actionPayload: {
                  customerEmail: cust.email,
                  customerPhone: cust.phone
                }
              }
            )
          );
        }
      }
    }
  });

  // ============================================================
  // RULE 3: RE-QUOTATION OPPORTUNITY
  // Quotation expired, rejected on price, or near expiry
  // ============================================================
  quotes.forEach(q => {
    const custId = q.customer?.id || (q.customer as any)?._id || '';
    const custName = q.customer?.companyName || q.customer?.customerName || 'Khách hàng';
    const lane = `${q.shipment?.origin || q.shipment?.pol || 'POL'} ➔ ${q.shipment?.destination || q.shipment?.pod || 'POD'}`;
    const validityDate = q.terms?.validityDate;

    // A: Expired within last 30 days
    if (validityDate && (q.status === 'EXPIRED' || q.status === 'SENT' || q.status === 'DRAFT')) {
      const expMs = new Date(validityDate).getTime();
      if (!isNaN(expMs)) {
        const daysDiff = (nowMs - expMs) / (1000 * 60 * 60 * 24);
        // Expired within past 30 days OR expires in next 3 days
        if (daysDiff >= 0 && daysDiff <= 30) {
          opportunities.push(
            createOpportunityRecord(
              'RE_QUOTATION',
              custId,
              custName,
              'QUOTATION',
              q.id,
              q.quoteNumber,
              `Báo giá ${q.quoteNumber} đã hết hạn (${Math.floor(daysDiff)} ngày trước)`,
              `Báo giá đã hết hiệu lực cam kết giá, khách hàng có thể vẫn đang chuẩn bị hàng hoặc cần cập nhật cước mới.`,
              `Tuyến: ${lane} | Trị giá: ${(q.subtotalVnd || 0).toLocaleString()} VND | Hết hạn: ${formatSafeDate(validityDate)}`,
              `Rà soát lại báo giá trước đó, kiểm tra biến động cước hãng tàu và chào báo giá mới cập nhật nếu khách hàng vẫn có kế hoạch vận chuyển.`,
              daysDiff <= 7 ? 'HIGH' : 'NORMAL',
              'SUFFICIENT_DATA',
              `Báo giá có đầy đủ thông tin cước, tuyến và thời hạn hiệu lực.`,
              {
                lane,
                serviceMode: q.shipment?.mode,
                origin: q.shipment?.origin || q.shipment?.pol,
                destination: q.shipment?.destination || q.shipment?.pod,
                estimatedValue: q.subtotalVnd,
                currency: 'VND',
                actionPayload: {
                  quoteId: q.id,
                  quoteNumber: q.quoteNumber,
                  lane,
                  origin: q.shipment?.origin || q.shipment?.pol,
                  destination: q.shipment?.destination || q.shipment?.pod,
                  serviceMode: q.shipment?.mode,
                  suggestedIncoterm: q.terms?.incoterm
                }
              }
            )
          );
        } else if (daysDiff < 0 && daysDiff >= -3) {
          // Expires in 1-3 days
          const daysLeft = Math.ceil(Math.abs(daysDiff));
          opportunities.push(
            createOpportunityRecord(
              'RE_QUOTATION',
              custId,
              custName,
              'QUOTATION',
              q.id,
              q.quoteNumber,
              `Báo giá ${q.quoteNumber} sắp hết hạn (còn ${daysLeft} ngày)`,
              `Báo giá chuẩn bị hết hạn hiệu lực chào giá.`,
              `Tuyến: ${lane} | Hết hạn vào: ${formatSafeDate(validityDate)}`,
              `Nhắc sales phụ trách liên hệ khách hàng để chốt booking trước khi giá cước thay đổi.`,
              'HIGH',
              'SUFFICIENT_DATA',
              `Dữ liệu báo giá hợp lệ với ngày hết hạn xác định.`,
              {
                lane,
                serviceMode: q.shipment?.mode,
                actionPayload: { quoteId: q.id, quoteNumber: q.quoteNumber, lane }
              }
            )
          );
        }
      }
    }

    // B: Rejected Quotation - chance to revisit if rejected within past 45 days
    if (q.status === 'REJECTED') {
      opportunities.push(
        createOpportunityRecord(
          'RE_QUOTATION',
          custId,
          custName,
          'QUOTATION',
          `${q.id}_rej`,
          q.quoteNumber,
          `Tái tiếp cận báo giá bị từ chối: ${q.quoteNumber}`,
          `Báo giá trước đó đã bị khách hàng từ chối, có cơ hội chào giá cạnh tranh hơn cho đợt hàng tiếp theo.`,
          `Tuyến: ${lane} | Lý do từ chối: ${(q as any).rejectReason || 'Giá chưa phù hợp / thay đổi lịch'}`,
          `Liên hệ tìm hiểu nguyên nhân chính chưa đạt thỏa thuận, đề xuất phương án tối ưu lịch trình hoặc hãng tàu thay thế.`,
          'NORMAL',
          'LIMITED_DATA',
          `Bản ghi báo giá lưu trạng thái REJECTED.`,
          {
            lane,
            serviceMode: q.shipment?.mode,
            actionPayload: { quoteId: q.id, quoteNumber: q.quoteNumber, lane }
          }
        )
      );
    }
  });

  // ============================================================
  // RULE 4: RATE RENEWAL OPPORTUNITY
  // Tasks from rateReviewTasks or contract rates expiring
  // ============================================================
  rateReviewTasks.forEach(task => {
    if (task.status === 'REVIEW_REQUIRED' || task.status === 'UNDER_REVIEW') {
      const isUrgent = task.dueAt && new Date(task.dueAt).getTime() <= nowMs + 3 * 24 * 60 * 60 * 1000;
      opportunities.push(
        createOpportunityRecord(
          'RATE_RENEWAL',
          task.customerId,
          task.customerName || 'Khách hàng',
          'RATE_TASK',
          task.id,
          task.lane,
          `Đến hạn rà soát cước tuyến ${task.lane} cho ${task.customerName}`,
          task.reason || `Chu kỳ rà soát cước định kỳ tuyến ${task.lane} đã đến hạn.`,
          `Tuyến: ${task.lane} | Mode: ${task.serviceMode} | Giá Sell hiện tại: $${task.currentSellRate || '—'} | Hãng tàu: ${task.carrier || '—'}`,
          task.suggestedAction || `Kiểm tra biểu cước mua hãng tàu mới nhất, tính toán margin và cập nhật bảng giá bán cho khách hàng.`,
          isUrgent ? 'CRITICAL' : 'HIGH',
          task.currentSellRate ? 'SUFFICIENT_DATA' : 'LIMITED_DATA',
          `Nhiệm vụ rà soát cước được tạo từ hệ thống Rate Review Engine.`,
          {
            lane: task.lane,
            serviceMode: task.serviceMode,
            dueDate: task.dueAt,
            actionPayload: {
              taskId: task.id,
              lane: task.lane,
              serviceMode: task.serviceMode
            }
          }
        )
      );
    }
  });

  // ============================================================
  // RULE 5: CROSS-SERVICE OPPORTUNITY
  // Customer uses single mode (e.g. SEA), but has not used Customs or Trucking
  // ============================================================
  customers.forEach(cust => {
    const custQuotes = quotesByCust.get(cust.id) || [];
    const custShipments = shipmentsByCust.get(cust.id) || [];
    const usedModes = new Set<string>();

    custQuotes.forEach(q => {
      if (q.shipment?.mode) usedModes.add(q.shipment.mode);
    });
    custShipments.forEach(s => {
      if (s.serviceMode) usedModes.add(s.serviceMode);
    });

    if (usedModes.size === 1 && (usedModes.has('SEA_FCL') || usedModes.has('SEA_LCL'))) {
      const primaryMode = Array.from(usedModes)[0];
      const totalOps = custQuotes.length + custShipments.length;

      if (totalOps >= 2) {
        opportunities.push(
          createOpportunityRecord(
            'CROSS_SERVICE',
            cust.id,
            cust.companyName || cust.customerName || 'Khách hàng',
            'CUSTOMER',
            `${cust.id}_cross_svc`,
            cust.code,
            `Cơ hội bán chéo dịch vụ Thủ tục Hải quan & Kéo container nội địa`,
            `Khách hàng hiện chỉ sử dụng ${primaryMode} (${totalOps} lần), chưa sử dụng dịch vụ thông quan hoặc vận chuyển đường bộ của công ty.`,
            `Dịch vụ đang dùng: ${primaryMode}. Dịch vụ chưa phát sinh: CUSTOMS_CLEARANCE, INLAND_TRUCKING.`,
            `Giới thiệu gói dịch vụ trọn gói Door-to-Door (cước biển + thủ tục hải quan + xe kéo container) để gia tăng giá trị đơn hàng.`,
            'NORMAL',
            totalOps >= 3 ? 'SUFFICIENT_DATA' : 'LIMITED_DATA',
            `Dựa trên lịch sử ${totalOps} giao dịch thuần ${primaryMode} của khách hàng.`,
            {
              serviceMode: 'CUSTOMS_CLEARANCE',
              actionPayload: {
                customerEmail: cust.email,
                suggestedIncoterm: 'DAP / DDP'
              }
            }
          )
        );
      }
    }
  });

  // ============================================================
  // RULE 6: LANE OPPORTUNITY
  // Concentrated volume or quotation frequency on a specific route
  // ============================================================
  customers.forEach(cust => {
    const custQuotes = quotesByCust.get(cust.id) || [];
    const custShipments = shipmentsByCust.get(cust.id) || [];
    const laneStats: Record<string, { quotes: number; shipments: number; origin: string; destination: string; mode: string }> = {};

    custQuotes.forEach(q => {
      const orig = q.shipment?.origin || q.shipment?.pol || '';
      const dest = q.shipment?.destination || q.shipment?.pod || '';
      if (orig && dest) {
        const laneKey = `${orig} ➔ ${dest}`;
        if (!laneStats[laneKey]) laneStats[laneKey] = { quotes: 0, shipments: 0, origin: orig, destination: dest, mode: q.shipment?.mode || 'SEA_FCL' };
        laneStats[laneKey].quotes++;
      }
    });

    custShipments.forEach(s => {
      const orig = s.origin || '';
      const dest = s.destination || '';
      if (orig && dest) {
        const laneKey = `${orig} ➔ ${dest}`;
        if (!laneStats[laneKey]) laneStats[laneKey] = { quotes: 0, shipments: 0, origin: orig, destination: dest, mode: s.serviceMode || 'SEA_FCL' };
        laneStats[laneKey].shipments++;
      }
    });

    Object.entries(laneStats).forEach(([lane, stat]) => {
      const totalLaneCount = stat.quotes + stat.shipments;
      if (totalLaneCount >= 2) {
        opportunities.push(
          createOpportunityRecord(
            'LANE_OPPORTUNITY',
            cust.id,
            cust.companyName || cust.customerName || 'Khách hàng',
            'CUSTOMER',
            `${cust.id}_lane_${stat.origin}_${stat.destination}`,
            cust.code,
            `Tuyến trọng điểm: ${lane} (${totalLaneCount} phát sinh)`,
            `Khách hàng có nhu cầu tập trung cao trên tuyến ${lane} với ${stat.quotes} báo giá và ${stat.shipments} lô hàng.`,
            `Tuyến: ${lane} | Báo giá: ${stat.quotes} | Lô hàng: ${stat.shipments} | Mode: ${stat.mode}`,
            `Liên hệ hãng tàu đối tác xin giá hợp đồng đặc biệt (special contract rate) cho tuyến này để tăng tỷ lệ chốt thầu và margin.`,
            totalLaneCount >= 4 ? 'HIGH' : 'NORMAL',
            totalLaneCount >= 3 ? 'SUFFICIENT_DATA' : 'LIMITED_DATA',
            `Tổng hợp từ ${totalLaneCount} bản ghi thực tế trên tuyến ${lane}.`,
            {
              lane,
              origin: stat.origin,
              destination: stat.destination,
              serviceMode: stat.mode,
              actionPayload: { lane, origin: stat.origin, destination: stat.destination, serviceMode: stat.mode }
            }
          )
        );
      }
    });
  });

  // ============================================================
  // RULE 7: QUOTATION CONVERSION OPPORTUNITY
  // Quotation SENT / VIEWED, > 48h, not accepted or rejected yet
  // ============================================================
  quotes.forEach(q => {
    if (q.status === 'SENT' || (q.status as any) === 'VIEWED') {
      const sentMs = q.createdDate ? new Date(q.createdDate).getTime() : 0;
      if (sentMs > 0) {
        const hoursPending = (nowMs - sentMs) / (1000 * 60 * 60);
        if (hoursPending >= 48 && hoursPending <= 240) {
          const custId = q.customer?.id || (q.customer as any)?._id || '';
          const custName = q.customer?.companyName || q.customer?.customerName || 'Khách hàng';
          const lane = `${q.shipment?.origin || q.shipment?.pol || 'POL'} ➔ ${q.shipment?.destination || q.shipment?.pod || 'POD'}`;

          opportunities.push(
            createOpportunityRecord(
              'QUOTATION_CONVERSION',
              custId,
              custName,
              'QUOTATION',
              q.id,
              q.quoteNumber,
              `Thúc đẩy chốt đơn báo giá ${q.quoteNumber} (chờ ${Math.floor(hoursPending / 24)} ngày)`,
              `Báo giá đã gửi hơn 48 giờ chưa nhận được phản hồi chốt booking hoặc điều chỉnh.`,
              `Gửi ngày: ${formatSafeDate(q.createdDate)} | Tuyến: ${lane} | Trị giá: ${(q.subtotalVnd || 0).toLocaleString()} VND`,
              `Chủ động gọi điện hoặc gửi tin nhắn follow-up hỗ trợ tư vấn chi tiết các khoản local charges, thời gian vận chuyển để thúc đẩy chốt hợp đồng.`,
              hoursPending >= 96 ? 'HIGH' : 'NORMAL',
              'SUFFICIENT_DATA',
              `Báo giá hợp lệ đang ở trạng thái SENT với thời gian chờ xác định.`,
              {
                lane,
                serviceMode: q.shipment?.mode,
                estimatedValue: q.subtotalVnd,
                currency: 'VND',
                dueDate: new Date(nowMs + 24 * 60 * 60 * 1000).toISOString(),
                actionPayload: { quoteId: q.id, quoteNumber: q.quoteNumber, lane }
              }
            )
          );
        }
      }
    }
  });

  // ============================================================
  // RULE 8: CONTRACT RENEWAL OPPORTUNITY
  // Active contracts with expiryDate <= 30 days
  // ============================================================
  contracts.forEach(cnt => {
    if (cnt.status === 'ACTIVE' && cnt.expiryDate) {
      const expMs = new Date(cnt.expiryDate).getTime();
      if (!isNaN(expMs)) {
        const daysToExpiry = Math.ceil((expMs - nowMs) / (1000 * 60 * 60 * 24));
        if (daysToExpiry >= 0 && daysToExpiry <= 35) {
          opportunities.push(
            createOpportunityRecord(
              'CONTRACT_RENEWAL',
              cnt.partyId || '',
              cnt.partyName || 'Khách hàng',
              'CONTRACT',
              cnt.id,
              cnt.contractNumber,
              `Gia hạn hợp đồng ${cnt.contractNumber} (${daysToExpiry} ngày tới)`,
              `Hợp đồng dịch vụ logistics với khách hàng sắp hết hiệu lực pháp lý.`,
              `Khách hàng: ${cnt.partyName} | Ngày hết hạn: ${formatSafeDate(cnt.expiryDate)} | Biểu cước: ${cnt.totalRatesCount || 0}`,
              `Lên kế hoạch rà soát lại các điều khoản thương mại, biểu cước cước biển/hàng không và chuẩn bị dự thảo phụ lục gia hạn gửi khách hàng.`,
              daysToExpiry <= 10 ? 'CRITICAL' : 'HIGH',
              'SUFFICIENT_DATA',
              `Hợp đồng dịch vụ ACTIVE lưu trữ trong Contract Engine.`,
              {
                dueDate: cnt.expiryDate,
                actionPayload: { contractId: cnt.id, contractNumber: cnt.contractNumber }
              }
            )
          );
        }
      }
    }
  });

  // ============================================================
  // RULE 9: SHIPMENT FOLLOW-UP OPPORTUNITY
  // Shipments completed/delivered in last 14 days without follow-up
  // ============================================================
  shipments.forEach(s => {
    if (s.status === 'DELIVERED' || s.status === 'COMPLETED') {
      const compDate = s.updatedAt || s.etaActual || s.etaEstimated || s.etaPlanned || s.createdAt;
      const compMs = compDate ? new Date(compDate).getTime() : 0;
      if (compMs > 0) {
        const daysSinceComp = (nowMs - compMs) / (1000 * 60 * 60 * 24);
        if (daysSinceComp >= 2 && daysSinceComp <= 14) {
          // Check if already has follow-up
          const hasFu = followUps.some(f => f.relatedEntityId === s.id && f.status === 'COMPLETED');
          if (!hasFu) {
            const lane = `${s.origin || 'POL'} ➔ ${s.destination || 'POD'}`;
            opportunities.push(
              createOpportunityRecord(
                'SHIPMENT_FOLLOW_UP',
                s.customerId || '',
                s.customerName || 'Khách hàng',
                'SHIPMENT',
                s.id,
                s.shipmentNumber,
                `Chăm sóc sau giao hàng lô ${s.shipmentNumber}`,
                `Lô hàng vừa được giao thành công, thời điểm vàng để thu thập đánh giá dịch vụ và khảo sát lô hàng kế tiếp.`,
                `Lô hàng: ${s.shipmentNumber} | Tuyến: ${lane} | Hoàn tất: ${formatSafeDate(compDate)}`,
                `Liên hệ xác nhận tình trạng bàn giao chứng từ/hàng hóa và hỏi về kế hoạch booking tuần tới.`,
                'NORMAL',
                'SUFFICIENT_DATA',
                `Lô hàng trạng thái DELIVERED/COMPLETED hợp lệ trong Shipment Engine.`,
                {
                  lane,
                  serviceMode: s.serviceMode,
                  origin: s.origin,
                  destination: s.destination,
                  actionPayload: { shipmentId: s.id, shipmentNumber: s.shipmentNumber, lane }
                }
              )
            );
          }
        }
      }
    }
  });

  // ============================================================
  // RULE 10: REACTIVATION OPPORTUNITY
  // Inactive customers with zero transactions in > 60 days
  // ============================================================
  customers.forEach(cust => {
    const custQuotes = quotesByCust.get(cust.id) || [];
    const custShipments = shipmentsByCust.get(cust.id) || [];
    const totalRecords = custQuotes.length + custShipments.length;

    if (totalRecords > 0) {
      let latestMs = 0;
      custQuotes.forEach(q => {
        const t = q.createdDate ? new Date(q.createdDate).getTime() : 0;
        if (!isNaN(t) && t > latestMs) latestMs = t;
      });
      custShipments.forEach(s => {
        const t = s.createdAt ? new Date(s.createdAt).getTime() : 0;
        if (!isNaN(t) && t > latestMs) latestMs = t;
      });

      if (latestMs > 0) {
        const daysDormant = Math.floor((nowMs - latestMs) / (1000 * 60 * 60 * 24));
        if (daysDormant > 60 && daysDormant <= 365) {
          opportunities.push(
            createOpportunityRecord(
              'REACTIVATION',
              cust.id,
              cust.companyName || cust.customerName || 'Khách hàng',
              'CUSTOMER',
              `${cust.id}_reactivation`,
              cust.code,
              `Tái kích hoạt khách hàng cũ: ${daysDormant} ngày chưa tương tác`,
              `Khách hàng từng giao dịch nhưng đã ngừng yêu cầu dịch vụ trong ${daysDormant} ngày qua.`,
              `Lịch sử: ${totalRecords} giao dịch trước đó. Lần cuối: ${formatSafeDate(new Date(latestMs).toISOString())}`,
              `Gửi email hoặc gọi điện cập nhật xu hướng giá cước thị trường mới, chia sẻ lịch tàu và các tuyến ưu đãi tháng này.`,
              'LOW',
              totalRecords >= 3 ? 'SUFFICIENT_DATA' : 'LIMITED_DATA',
              `Có ${totalRecords} bản ghi giao dịch trước đây trong hệ thống.`,
              {
                actionPayload: {
                  customerEmail: cust.email,
                  customerPhone: cust.phone
                }
              }
            )
          );
        }
      }
    }
  });

  return opportunities;
}
