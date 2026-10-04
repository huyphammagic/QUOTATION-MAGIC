/**
 * Logistics Quotation Management Platform - Phase 55 (Gói B) Test Suite
 * Smart Deal-Closing Accelerator & Objection Handling Suite Verification
 */

import { 
  simulateDealMargin, 
  generateFlashIncentive, 
  generateMultiChannelClosingPitch, 
  recordDealClosingOutcome,
  STANDARD_VALUE_ADD_CONCESSIONS,
  OBJECTION_BATTLECARDS_CATALOG,
  getLocalDealOutcomes
} from '../dealClosingService';
import { QuoteData } from '../../../types/logistics';

async function runDealClosingVerification() {
  console.log('🚀 Running Phase 55 (Gói B) Deal-Closing Accelerator Verification Suite...\n');

  // Test 1: Margin Simulator - SAFE Status
  console.log('1. Verifying Margin Simulator: Safe margin test...');
  const safeSim = simulateDealMargin({
    originalTotal: 2000,
    originalCost: 1500,
    proposedCustomerTotal: 1850,
    currency: 'USD',
    minMarginPercent: 8,
    targetMarginPercent: 15
  });
  if (safeSim.floorStatus !== 'SAFE') {
    throw new Error(`Expected floorStatus SAFE, got ${safeSim.floorStatus}`);
  }
  if (safeSim.requiresManagerApproval !== false) {
    throw new Error('Safe status should not require manager approval');
  }
  if (safeSim.simulatedNetProfit !== 350) {
    throw new Error(`Expected net profit 350, got ${safeSim.simulatedNetProfit}`);
  }
  console.log('   ✅ Safe margin calculation passed. Net profit: $350, Margin: ' + safeSim.simulatedMarginPercent.toFixed(1) + '%\n');

  // Test 2: Margin Simulator - WARNING Status (between min and target)
  console.log('2. Verifying Margin Simulator: Warning margin test...');
  const warnSim = simulateDealMargin({
    originalTotal: 2000,
    originalCost: 1500,
    proposedCustomerTotal: 1680,
    currency: 'USD',
    minMarginPercent: 8,
    targetMarginPercent: 15
  });
  if (warnSim.floorStatus !== 'WARNING') {
    throw new Error(`Expected floorStatus WARNING, got ${warnSim.floorStatus}`);
  }
  console.log('   ✅ Warning margin test passed. Margin: ' + warnSim.simulatedMarginPercent.toFixed(1) + '%\n');

  // Test 3: Margin Simulator - BREACH Status (Below floor price)
  console.log('3. Verifying Margin Simulator: Floor Price Breach safeguard...');
  const breachSim = simulateDealMargin({
    originalTotal: 2000,
    originalCost: 1500,
    proposedCustomerTotal: 1550, // Only $50 profit (3.2% margin < 8% min)
    currency: 'USD',
    minMarginPercent: 8,
    targetMarginPercent: 15
  });
  if (breachSim.floorStatus !== 'BREACH') {
    throw new Error(`Expected floorStatus BREACH, got ${breachSim.floorStatus}`);
  }
  if (breachSim.requiresManagerApproval !== true) {
    throw new Error('Breach status must require manager approval');
  }
  if (!breachSim.recommendedCounterPrice || breachSim.recommendedCounterPrice <= 1550) {
    throw new Error('Recommended counter price should suggest safe price');
  }
  console.log('   ✅ Floor Price Breach safeguard verified. Recommended safe counter-price: $' + breachSim.recommendedCounterPrice + '\n');

  // Test 4: Concessions Matrix & Value Leverage
  console.log('4. Verifying Value-Add Concessions Matrix...');
  if (STANDARD_VALUE_ADD_CONCESSIONS.length < 5) {
    throw new Error('Concession catalog should have at least 5 standard options');
  }
  const freeDemDet = STANDARD_VALUE_ADD_CONCESSIONS.find(c => c.code === 'FREE_DEM_DET_14');
  if (!freeDemDet || freeDemDet.perceivedValue <= 0 || freeDemDet.companyCost !== 0) {
    throw new Error('Free DEM/DET concession missing or has invalid leverage');
  }
  console.log(`   ✅ Concession catalog verified. Free DEM/DET leverage: Perceived $${freeDemDet.perceivedValue}, Cost $${freeDemDet.companyCost}\n`);

  // Test 5: Objection Battlecards Catalog
  console.log('5. Verifying Objection Battlecards Catalog...');
  if (OBJECTION_BATTLECARDS_CATALOG.length < 5) {
    throw new Error('Catalog should contain at least 5 objection battlecards');
  }
  const competitorCard = OBJECTION_BATTLECARDS_CATALOG.find(c => c.type === 'COMPETITOR_LOWER');
  if (!competitorCard || !competitorCard.callScriptVi || competitorCard.battlePoints.length === 0) {
    throw new Error('Competitor battlecard missing essential elements');
  }
  console.log('   ✅ Objection Battlecards verified with actionable call scripts & battle points.\n');

  // Test 6: Flash Incentive Generator
  console.log('6. Verifying Flash Incentive Generator...');
  const flash = generateFlashIncentive({
    quotationNumber: 'Q-2026-0099',
    discountType: 'FIXED_TOTAL',
    discountAmount: 50,
    currency: 'USD',
    durationHours: 6
  });
  if (!flash.code.startsWith('FLASH') || flash.discountAmount !== 50 || !flash.expiresAt) {
    throw new Error('Flash incentive generation failed');
  }
  console.log('   ✅ Flash incentive generated: ' + flash.code + ' (' + flash.badgeVi + ')\n');

  // Test 7: Multi-Channel Closing Messages
  console.log('7. Verifying Multi-Channel Pitch Formatter...');
  const pitch = generateMultiChannelClosingPitch({
    customerName: 'Công Ty Xuất Nhập Khẩu Toàn Cầu',
    quotationNumber: 'Q-2026-0099',
    routePol: 'Hai Phong',
    routePod: 'Los Angeles',
    finalPrice: 1850,
    currency: 'USD',
    concessions: [freeDemDet],
    flashIncentive: flash,
    actionPortalUrl: 'https://app.logistics.io/#q/Q-2026-0099'
  });
  if (!pitch.zalo.messageText.includes('Q-2026-0099') || !pitch.whatsapp.messageText.includes('All-In Net Freight')) {
    throw new Error('Pitch text formatting missing quotation or key terms');
  }
  console.log('   ✅ Multi-channel pitches (Zalo, WhatsApp, Email) formatted successfully.\n');

  // Test 8: Record Deal Closing Outcome (Won Deal)
  console.log('8. Verifying Deal Outcome Recording...');
  const dummyQuote: QuoteData = {
    id: 'test_quote_closing_1',
    quoteNumber: 'Q-2026-TEST',
    createdDate: new Date().toISOString(),
    updatedDate: new Date().toISOString(),
    status: 'SENT',
    quoteCurrency: 'USD',
    exchangeRate: 25400,
    companyId: 'company_test',
    customer: {
      customerName: 'Tập Đoàn Thủy Sản Miền Nam',
      companyName: 'Tập Đoàn Thủy Sản Miền Nam',
      taxId: '0312345678',
      address: 'TP.HCM',
      email: 'contact@southsea.com',
      phone: '0901234567',
      contactPerson: 'Mr. Nam'
    },
    shipment: {
      mode: 'SEA_FCL',
      pol: 'Cat Lai',
      pod: 'Hamburg',
      commodity: 'Thủy sản đông lạnh',
      containerType: "40'RF",
      quantity: 2,
      grossWeightKg: 40000,
      volumeCbm: 60,
      chargeableWeight: 40000
    },
    items: [],
    terms: {
      incoterm: 'CIF',
      validityDate: '2026-10-31',
      paymentTerm: 'Prepaid',
      exclusionsNotes: '',
      bankAccountInfo: ''
    },
    company: {
      name: 'Logistics Co',
      englishName: 'Logistics Co',
      taxId: '0101234567',
      address: 'Hà Nội',
      phone: '0241234567',
      email: 'info@logistics.vn',
      website: 'logistics.vn',
      bankName: 'VCB',
      bankAccountNo: '123456',
      bankAccountHolder: 'Logistics Co',
      bankSwiftCode: 'BFTVVNVX',
      salesRepName: 'Sales Rep',
      salesRepTitle: 'Executive',
      salesRepPhone: '0901234567',
      salesRepEmail: 'sales@logistics.vn'
    },
    subtotalUsd: 2500,
    subtotalVnd: 63500000,
    vatTotalUsd: 0,
    vatTotalVnd: 0,
    grandTotalUsd: 2500,
    grandTotalVnd: 63500000,
    totalCostUsd: 1900,
    totalCostVnd: 48260000
  };

  const outcomeResult = await recordDealClosingOutcome({
    quotation: dummyQuote,
    companyId: 'company_test',
    outcome: 'WON',
    closedPrice: 2350,
    selectedConcessions: [freeDemDet],
    flashIncentive: flash,
    winLossReason: 'Khách hàng chốt giá sau khi nhận ưu đãi 14 ngày Free DEM/DET',
    closedBy: 'Senior Logistics Sales',
    autoCreateShipment: false
  });

  if (!outcomeResult.success || outcomeResult.outcomeRecord.outcome !== 'WON') {
    throw new Error('Failed to record deal outcome');
  }
  if (outcomeResult.outcomeRecord.netProfit !== 450) {
    throw new Error(`Expected net profit 450, got ${outcomeResult.outcomeRecord.netProfit}`);
  }

  const localOutcomes = getLocalDealOutcomes();
  if (localOutcomes.length === 0 || localOutcomes[0].quotationNumber !== 'Q-2026-TEST') {
    throw new Error('Local outcomes cache not updated');
  }
  console.log('   ✅ Deal WON outcome recorded with net profit $450, cached properly.\n');

  console.log('🎉 All Phase 55 (Gói B) Deal-Closing Accelerator tests passed successfully!');
}

runDealClosingVerification().catch(err => {
  console.error('❌ Phase 55 Verification Failed:', err);
  process.exit(1);
});
