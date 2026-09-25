import { 
  RFQParameters, 
  DecisionScenario, 
  DecisionCandidateRate, 
  DecisionRiskItem, 
  DecisionRiskCode, 
  DecisionRiskSeverity 
} from '../../types/decision';
import { ContractRecord } from '../../types/contract';

interface RiskAnalysisInput {
  rfq: RFQParameters;
  scenarios: DecisionScenario[];
  selectedScenario?: DecisionScenario;
  candidateRates: DecisionCandidateRate[];
  matchingContracts?: ContractRecord[];
  targetMarginThreshold?: number; // default 10%
  minimumMarginThreshold?: number; // default 5%
}

/**
 * Factual Rule-Based Risk Detection Engine for Logistics Business Decisions
 * Adheres strictly to Zero Fake Data principles: relies purely on verifiable dates, margins, rates, and contracts.
 */
export function evaluateDecisionRisks(input: RiskAnalysisInput): DecisionRiskItem[] {
  const risks: DecisionRiskItem[] = [];
  const { rfq, scenarios, selectedScenario, candidateRates, matchingContracts } = input;
  const now = new Date();
  const nowMs = now.getTime();
  const minMargin = input.minimumMarginThreshold ?? 5;
  const targetMargin = input.targetMarginThreshold ?? 10;

  // 1. RATE VALIDITY CONFLICT: Rate Valid Until < Quotation Validity
  const activeScenario = selectedScenario || scenarios[0];
  if (activeScenario && activeScenario.rateValidUntil && rfq.requestedValidity) {
    const rateExpMs = new Date(activeScenario.rateValidUntil).getTime();
    const quoteExpMs = new Date(rfq.requestedValidity).getTime();

    if (!isNaN(rateExpMs) && !isNaN(quoteExpMs) && rateExpMs < quoteExpMs) {
      risks.push({
        id: `risk_validity_conflict_${Date.now()}`,
        riskType: 'RATE_VALIDITY_CONFLICT',
        severity: 'CRITICAL',
        title: 'Xung đột hiệu lực giá cước với thời hạn báo giá',
        titleEn: 'Rate Validity Extends Shorter Than Quotation Validity',
        reason: `Cước đầu vào (${activeScenario.rateSource}) hết hạn vào ${activeScenario.rateValidUntil}, trong khi thời hạn báo giá yêu cầu kéo dài đến ${rfq.requestedValidity}. Doanh nghiệp đối mặt rủi ro trượt giá cước khi khách hàng chốt booking sau ngày cước hết hạn.`,
        reasonEn: `Buy rate expires on ${activeScenario.rateValidUntil}, whereas quotation validity is requested until ${rfq.requestedValidity}. Commercial exposure if customer books after rate expiry.`,
        source: `Kịch bản: ${activeScenario.name}`,
        suggestedReview: 'Rút ngắn thời hạn hiệu lực của báo giá khớp với ngày hết hạn cước, hoặc liên hệ nhà vận chuyển xin gia hạn cam kết giá.',
        suggestedReviewEn: 'Shorten quotation validity to align with carrier rate, or request rate validity extension from carrier.'
      });
    }
  }

  // 2. MARGIN RISK & NEGATIVE MARGIN
  scenarios.forEach((sc, idx) => {
    if (sc.grossProfit < 0 || sc.marginPercent < 0) {
      risks.push({
        id: `risk_loss_${sc.id || idx}`,
        riskType: 'NEGATIVE_MARGIN',
        severity: 'CRITICAL',
        title: `Lỗ gộp trong ${sc.name} (Gross Margin < 0%)`,
        titleEn: `Negative Margin in ${sc.name}`,
        reason: `Giá bán dự kiến (${sc.sellingPrice.toLocaleString()} ${sc.currency}) thấp hơn tổng giá vốn (${sc.buyCost.toLocaleString()} ${sc.currency}), dẫn đến lỗ ${(Math.abs(sc.grossProfit)).toLocaleString()} ${sc.currency} (${sc.marginPercent.toFixed(1)}%).`,
        reasonEn: `Selling price is below estimated total buy cost, resulting in gross loss.`,
        source: sc.name,
        suggestedReview: 'Kiểm tra lại giá cước mua hoặc điều chỉnh biểu giá bán ra để đảm bảo tối thiểu hòa vốn.',
        suggestedReviewEn: 'Re-negotiate buy rate or increase customer quotation price to protect margin.'
      });
    } else if (sc.marginPercent < minMargin && sc.sellingPrice > 0) {
      risks.push({
        id: `risk_low_margin_${sc.id || idx}`,
        riskType: 'LOW_MARGIN',
        severity: 'HIGH',
        title: `Biên lợi nhuận thấp hơn ngưỡng an toàn (${sc.marginPercent.toFixed(1)}% < ${minMargin}%)`,
        titleEn: `Margin Below Safe Threshold in ${sc.name}`,
        reason: `Biên lãi gộp đạt ${sc.marginPercent.toFixed(1)}%, thấp hơn quy định sàn của công ty (${minMargin}%). Biên lãi mỏng dễ bị bào mòn khi phát sinh chi phí phát sinh phụ trợ.`,
        reasonEn: `Gross profit margin (${sc.marginPercent.toFixed(1)}%) is below company minimum policy (${minMargin}%).`,
        source: sc.name,
        suggestedReview: 'Rà soát chính sách phụ phí local charges và xem xét nâng giá bán hoặc xin phê duyệt ngoại lệ từ Quản lý Pricing.',
        suggestedReviewEn: 'Review surcharges, apply standard markup or request management exception approval.'
      });
    }
  });

  // 3. CANDIDATE RATE EXPIRY (EXPIRED OR EXPIRING SOON)
  candidateRates.forEach(cr => {
    if (cr.validUntil) {
      const expMs = new Date(cr.validUntil).getTime();
      if (!isNaN(expMs)) {
        const daysLeft = (expMs - nowMs) / (1000 * 60 * 60 * 24);
        if (daysLeft < 0) {
          risks.push({
            id: `risk_expired_rate_${cr.id}`,
            riskType: 'EXPIRED_RATE',
            severity: 'HIGH',
            title: `Biểu cước ${cr.source} đã quá hạn hiệu lực`,
            titleEn: `Rate Candidate ${cr.source} Expired`,
            reason: `Giá cước ${cr.carrier || cr.supplierName || 'hãng'} tuyến ${cr.origin} - ${cr.destination} đã hết hạn vào ngày ${cr.validUntil}.`,
            reasonEn: `Rate candidate for ${cr.origin} - ${cr.destination} expired on ${cr.validUntil}.`,
            source: `${cr.source} (${cr.carrier || cr.supplierName || 'Carrier'})`,
            suggestedReview: 'Không sử dụng giá đã hết hạn cho báo giá mới. Cập nhật biểu cước kỳ mới từ nhà cung cấp.',
            suggestedReviewEn: 'Do not base new quotation on expired rate. Update rate sheet from provider.'
          });
        } else if (daysLeft <= 3) {
          risks.push({
            id: `risk_expiring_soon_${cr.id}`,
            riskType: 'RATE_EXPIRING_SOON',
            severity: 'WARNING',
            title: `Biểu cước ${cr.source} sắp hết hạn (còn ${Math.ceil(daysLeft)} ngày)`,
            titleEn: `Rate Candidate Expiring Soon`,
            reason: `Giá cước chỉ còn hiệu lực đến ${cr.validUntil}. Khách hàng có thể không kịp xác nhận đặt chỗ trước hạn chót.`,
            reasonEn: `Rate candidate valid only until ${cr.validUntil}. Customer might not confirm booking in time.`,
            source: `${cr.source} (${cr.carrier || cr.supplierName || 'Carrier'})`,
            suggestedReview: 'Lưu ý ghi chú rõ thời hạn cut-off trên báo giá gửi khách.',
            suggestedReviewEn: 'Clearly communicate validity cut-off in quotation to customer.'
          });
        }
      }
    }
  });

  // 4. MISSING RATE: RFQ has route and mode but no candidate rate found
  if (candidateRates.length === 0 && rfq.origin && rfq.destination) {
    risks.push({
      id: `risk_missing_rate_${Date.now()}`,
      riskType: 'MISSING_RATE',
      severity: 'HIGH',
      title: 'Chưa có biểu cước cơ sở trong hệ thống Master Rate',
      titleEn: 'No Baseline Rate Available for Requested Lane',
      reason: `Hệ thống không tìm thấy biểu cước Master còn hiệu lực cho tuyến ${rfq.origin} ➔ ${rfq.destination} (${rfq.mode}).`,
      reasonEn: `No active master rate candidate found for lane ${rfq.origin} -> ${rfq.destination} under ${rfq.mode}.`,
      source: 'Master Rate Engine',
      suggestedReview: 'Tạo yêu cầu báo giá (Rate Request) gửi bộ phận Pricing để đàm phán cước mới với hãng tàu/hãng bay.',
      suggestedReviewEn: 'Send Rate Request to Pricing team to obtain fresh supplier rates.'
    });
  }

  // 5. CONTRACT EXPIRY RISK
  if (matchingContracts && matchingContracts.length > 0) {
    matchingContracts.forEach(c => {
      if (c.expiryDate) {
        const expMs = new Date(c.expiryDate).getTime();
        if (!isNaN(expMs)) {
          const daysToContractExp = (expMs - nowMs) / (1000 * 60 * 60 * 24);
          if (daysToContractExp >= 0 && daysToContractExp <= 15) {
            risks.push({
              id: `risk_contract_exp_${c.id}`,
              riskType: 'CONTRACT_EXPIRY',
              severity: 'WARNING',
              title: `Hợp đồng dịch vụ ${c.contractNumber} sắp hết hạn (${Math.ceil(daysToContractExp)} ngày)`,
              titleEn: `Service Contract ${c.contractNumber} Expiring Soon`,
              reason: `Hợp đồng dịch vụ của khách hàng sẽ hết hiệu lực vào ${c.expiryDate}. Các điều khoản cước cam kết có thể cần thương lượng lại.`,
              reasonEn: `Customer contract expires on ${c.expiryDate}. Agreed commercial conditions may require renegotiation.`,
              source: `Hợp đồng số: ${c.contractNumber}`,
              suggestedReview: 'Khởi tạo quy trình gia hạn phụ lục hợp đồng song song với việc gửi báo giá.',
              suggestedReviewEn: 'Initiate contract renewal addendum in parallel with quotation.'
            });
          }
        }
      }
    });
  }

  // 6. MISSING REQUIRED SURCHARGES / LOCAL CHARGES
  if (activeScenario && activeScenario.surcharges.length === 0 && (rfq.mode === 'SEA_FCL' || rfq.mode === 'AIR_FREIGHT')) {
    risks.push({
      id: `risk_missing_surcharges_${Date.now()}`,
      riskType: 'MISSING_REQUIRED_CHARGE',
      severity: 'WARNING',
      title: 'Chưa cấu hình các khoản phụ phí địa phương (Local Charges)',
      titleEn: 'No Local Surcharges Configured',
      reason: `Vận tải ${rfq.mode} thường bắt buộc phải có các phụ phí THC, chứng từ, seal, handling. Hiện kịch bản chưa ghi nhận phụ phí.`,
      reasonEn: `Transport mode ${rfq.mode} usually requires local charges (THC, DOC, SEAL). None currently added to scenario.`,
      source: 'Surcharge Verification',
      suggestedReview: 'Rà soát biểu phụ phí tiêu chuẩn cảng đi / cảng đến và bổ sung vào phương án chào giá.',
      suggestedReviewEn: 'Review standard port local charges and add required items to quotation.'
    });
  }

  // 7. INCOMPLETE RFQ DATA
  if (!rfq.commodity || rfq.commodity.trim() === '') {
    risks.push({
      id: `risk_missing_commodity_${Date.now()}`,
      riskType: 'INCOMPLETE_DATA',
      severity: 'INFO',
      title: 'Thiếu thông tin chi tiết tên hàng hóa (Commodity)',
      titleEn: 'Missing Commodity Details in RFQ',
      reason: 'Tên hàng hóa chưa được xác định rõ, có thể ảnh hưởng đến kiểm tra hàng nguy hiểm (DG), phụ phí đặc biệt hoặc thủ tục hải quan.',
      reasonEn: 'Commodity name is not specified, which may affect DG classification or special equipment surcharges.',
      source: 'RFQ Completeness',
      suggestedReview: 'Hỏi lại khách hàng về tính chất hàng hóa và mã HS Code nếu có.',
      suggestedReviewEn: 'Confirm cargo nature and HS Code with customer.'
    });
  }

  return risks;
}
