import { 
  RFQParameters, 
  DecisionCandidateRate, 
  DecisionScenario, 
  ScenarioSurcharge, 
  DecisionRateSource 
} from '../../types/decision';
import { Currency, TransportMode } from '../../types/logistics';

/**
 * Calculates financial metrics for a scenario:
 * totalCost, totalSellingPrice, grossProfit, marginPercent
 */
export function calculateScenarioMetrics(scenario: Partial<DecisionScenario>): {
  totalSurcharges: number;
  totalCost: number;
  totalSellingPrice: number;
  grossProfit: number;
  marginPercent: number;
} {
  const buyCost = scenario.buyCost || 0;
  const sellingPrice = scenario.sellingPrice || 0;
  const surcharges = scenario.surcharges || [];
  const discountAmount = scenario.discountAmount || 0;

  const totalSurcharges = surcharges.reduce((sum, sc) => sum + (sc.amount || 0), 0);
  const totalCost = buyCost + totalSurcharges;
  const grossSellBeforeDiscount = sellingPrice + totalSurcharges;
  const totalSellingPrice = Math.max(0, grossSellBeforeDiscount - discountAmount);
  const grossProfit = totalSellingPrice - totalCost;
  const marginPercent = totalSellingPrice > 0 ? (grossProfit / totalSellingPrice) * 100 : 0;

  return {
    totalSurcharges,
    totalCost,
    totalSellingPrice,
    grossProfit,
    marginPercent: Number(marginPercent.toFixed(2))
  };
}

/**
 * Generates initial scenarios based on real candidate rates and RFQ
 */
export function generateCandidateScenarios(
  rfq: RFQParameters,
  candidateRates: DecisionCandidateRate[]
): DecisionScenario[] {
  const scenarios: DecisionScenario[] = [];

  // Default surcharges template based on mode
  const defaultSurcharges: ScenarioSurcharge[] = [];
  if (rfq.mode === 'SEA_FCL') {
    defaultSurcharges.push(
      { id: 'sc_thc', code: 'THC', name: 'Phí xếp dỡ tại cảng (Terminal Handling Charge)', amount: 130, currency: 'USD', category: 'LOCAL' },
      { id: 'sc_doc', code: 'DOC', name: 'Phí chứng từ vận đơn (Bill of Lading / Doc Fee)', amount: 45, currency: 'USD', category: 'DOC' },
      { id: 'sc_seal', code: 'SEAL', name: 'Phí chì niêm phong (Container Seal Fee)', amount: 10, currency: 'USD', category: 'LOCAL' }
    );
  } else if (rfq.mode === 'AIR_FREIGHT') {
    defaultSurcharges.push(
      { id: 'sc_awb', code: 'AWB', name: 'Phí phát hành không vận đơn (AWB Fee)', amount: 35, currency: 'USD', category: 'DOC' },
      { id: 'sc_fsc', code: 'FSC', name: 'Phụ phí nhiên liệu (Fuel Surcharge)', amount: 45, currency: 'USD', category: 'SURCHARGE' },
      { id: 'sc_ssc', code: 'SSC', name: 'Phụ phí an ninh hàng không (Security Surcharge)', amount: 20, currency: 'USD', category: 'SURCHARGE' }
    );
  }

  // 1. If candidate rates exist, map each top candidate to a scenario
  if (candidateRates.length > 0) {
    candidateRates.slice(0, 3).forEach((cr, index) => {
      const letter = String.fromCharCode(65 + index); // A, B, C
      const baseBuy = cr.buyCost || 0;
      // Default standard 12% target margin for baseline selling price
      const baseSell = Math.round(baseBuy * 1.12);
      
      const scenarioPartial: Partial<DecisionScenario> = {
        buyCost: baseBuy,
        sellingPrice: baseSell,
        surcharges: defaultSurcharges,
        discountAmount: 0,
        discountPercent: 0
      };

      const metrics = calculateScenarioMetrics(scenarioPartial);

      scenarios.push({
        id: `sc_${Date.now()}_${index}`,
        name: `Kịch bản ${letter} - ${cr.carrier || cr.supplierName || 'Phương án ' + letter} (${cr.source})`,
        description: `Áp dụng biểu cước từ ${cr.supplierName || cr.carrier || 'Master Rate'} (${cr.rateType})`,
        isBaseline: index === 0,
        mode: cr.mode || rfq.mode,
        serviceType: rfq.serviceType || cr.mode,
        carrier: cr.carrier || 'TBA',
        supplierId: cr.supplierId,
        supplierName: cr.supplierName,
        rateSource: cr.source,
        rateId: cr.id,
        currency: cr.currency || 'USD',
        buyCost: baseBuy,
        sellingPrice: baseSell,
        surcharges: defaultSurcharges,
        totalSurcharges: metrics.totalSurcharges,
        discountAmount: 0,
        discountPercent: 0,
        totalCost: metrics.totalCost,
        totalSellingPrice: metrics.totalSellingPrice,
        grossProfit: metrics.grossProfit,
        marginPercent: metrics.marginPercent,
        rateValidUntil: cr.validUntil,
        quoteValidUntil: rfq.requestedValidity || cr.validUntil,
        transitTime: cr.transitTimeDays ? `${cr.transitTimeDays} ngày` : undefined,
        freeTime: cr.freeTimeDays ? `${cr.freeTimeDays} ngày Dem/Det` : undefined,
        factualTags: [],
        status: index === 0 ? 'SELECTED' : 'ACTIVE'
      });
    });
  } else {
    // Fallback single baseline draft scenario if no candidate rates in DB yet
    const baseBuy = rfq.targetRate || 0;
    const baseSell = baseBuy > 0 ? Math.round(baseBuy * 1.12) : 0;
    const metrics = calculateScenarioMetrics({
      buyCost: baseBuy,
      sellingPrice: baseSell,
      surcharges: defaultSurcharges,
      discountAmount: 0
    });

    scenarios.push({
      id: `sc_manual_${Date.now()}`,
      name: `Kịch bản A - Dự thảo chào giá chuẩn (${rfq.mode})`,
      description: 'Phương án cước cơ sở nhập trực tiếp theo RFQ',
      isBaseline: true,
      mode: rfq.mode,
      serviceType: rfq.serviceType || rfq.mode,
      carrier: 'Chưa chỉ định',
      rateSource: 'CUSTOM_ADJUSTED',
      currency: rfq.targetCurrency || 'USD',
      buyCost: baseBuy,
      sellingPrice: baseSell,
      surcharges: defaultSurcharges,
      totalSurcharges: metrics.totalSurcharges,
      discountAmount: 0,
      discountPercent: 0,
      totalCost: metrics.totalCost,
      totalSellingPrice: metrics.totalSellingPrice,
      grossProfit: metrics.grossProfit,
      marginPercent: metrics.marginPercent,
      rateValidUntil: rfq.requestedValidity,
      quoteValidUntil: rfq.requestedValidity,
      factualTags: [],
      status: 'SELECTED'
    });
  }

  // Tag factual attributes across scenarios
  annotateFactualTags(scenarios);

  return scenarios;
}

/**
 * Adds factual tags (LOWER_COST, HIGHER_MARGIN, LONGER_VALIDITY, CUSTOMER_CONTRACT, EXPIRING_SOON)
 * strictly by factual comparison, not subjective grading.
 */
export function annotateFactualTags(scenarios: DecisionScenario[]): void {
  if (scenarios.length === 0) return;

  const minCost = Math.min(...scenarios.map(s => s.totalCost).filter(c => c > 0));
  const maxMargin = Math.max(...scenarios.map(s => s.marginPercent));
  const nowMs = Date.now();

  scenarios.forEach(sc => {
    const tags: DecisionScenario['factualTags'] = [];

    // Lowest cost among options
    if (scenarios.length > 1 && sc.totalCost > 0 && sc.totalCost === minCost) {
      tags.push('LOWER_COST');
    }

    // Highest margin among options
    if (scenarios.length > 1 && sc.marginPercent === maxMargin && maxMargin > 0) {
      tags.push('HIGHER_MARGIN');
    }

    // Customer contract source
    if (sc.rateSource === 'CUSTOMER_CONTRACT') {
      tags.push('CUSTOMER_CONTRACT');
    }

    // Expiring soon (< 3 days)
    if (sc.rateValidUntil) {
      const expMs = new Date(sc.rateValidUntil).getTime();
      if (!isNaN(expMs)) {
        const daysLeft = (expMs - nowMs) / (1000 * 60 * 60 * 24);
        if (daysLeft >= 0 && daysLeft <= 3) {
          tags.push('EXPIRING_SOON');
        }
      }
    }

    // High risk if negative margin or < 5%
    if (sc.marginPercent < 5) {
      tags.push('HIGH_RISK');
    }

    sc.factualTags = tags;
  });
}
