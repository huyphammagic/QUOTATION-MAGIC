/**
 * Logistics Quotation Management Platform - Phase 56 (Ý Tưởng 1) Test Suite
 * Smart RFQ Inbox & 5-Second Quote Generator Verification
 */

import { 
  parseRfqDeterministicFallback, 
  matchRfqWithMasterRates, 
  convertRfqToQuotation,
  SAMPLE_REAL_WORLD_RFQS,
  getLocalRfqList,
  saveLocalRfqList
} from '../smartRfqService';
import { SmartRfqItem } from '../../../types/smartRfq';
import { CompanyProfile } from '../../../types/logistics';

async function runSmartRfqVerification() {
  console.log('🚀 Running Phase 56 Smart RFQ Inbox & 5-Second Quote Generator Verification Suite...\n');

  // Test 1: Deterministic Fallback Parser on Zalo Message
  console.log('1. Verifying RFQ Parsing on Zalo Message...');
  const sampleZalo = SAMPLE_REAL_WORLD_RFQS[0];
  const parsed1 = parseRfqDeterministicFallback(sampleZalo.rawText);

  if (parsed1.shipment.pod !== 'Long Beach, USA') {
    throw new Error(`Expected POD Long Beach, USA, got ${parsed1.shipment.pod}`);
  }
  if (parsed1.shipment.containerType !== "40'HC") {
    throw new Error(`Expected 40'HC, got ${parsed1.shipment.containerType}`);
  }
  if (parsed1.shipment.quantity !== 2) {
    throw new Error(`Expected quantity 2, got ${parsed1.shipment.quantity}`);
  }
  if (!parsed1.customer.phone || !parsed1.customer.phone.includes('0912')) {
    throw new Error('Customer phone not properly extracted');
  }
  console.log('   ✅ Zalo chat parsed successfully: POD Long Beach, 2x40HC, Phone: ' + parsed1.customer.phone + '\n');

  // Test 2: Reefer Seafood RFQ Parsing
  console.log('2. Verifying Reefer Seafood RFQ Parsing...');
  const sampleEmail = SAMPLE_REAL_WORLD_RFQS[1];
  const parsed2 = parseRfqDeterministicFallback(sampleEmail.rawText);

  if (parsed2.shipment.containerType !== "20'RF") {
    throw new Error(`Expected 20'RF, got ${parsed2.shipment.containerType}`);
  }
  if (parsed2.shipment.pod !== 'Tokyo, Japan') {
    throw new Error(`Expected Tokyo, Japan, got ${parsed2.shipment.pod}`);
  }
  if (parsed2.shipment.incoterm !== 'CIF') {
    throw new Error(`Expected CIF, got ${parsed2.shipment.incoterm}`);
  }
  if (!parsed2.customer.email || !parsed2.customer.email.includes('biendongseafood')) {
    throw new Error('Customer email not properly extracted');
  }
  console.log('   ✅ Seafood email parsed: 20\'RF Tokyo, Incoterm CIF, Email: ' + parsed2.customer.email + '\n');

  // Test 3: LCL Hai Phong Hamburg Parsing
  console.log('3. Verifying LCL Cargo Parsing...');
  const sampleLcl = SAMPLE_REAL_WORLD_RFQS[2];
  const parsed3 = parseRfqDeterministicFallback(sampleLcl.rawText);

  if (parsed3.shipment.mode !== 'SEA_LCL') {
    throw new Error(`Expected SEA_LCL, got ${parsed3.shipment.mode}`);
  }
  if (parsed3.shipment.pol !== 'Hai Phong Port, Vietnam') {
    throw new Error(`Expected Hai Phong Port, got ${parsed3.shipment.pol}`);
  }
  if (parsed3.shipment.volumeCbm !== 5.2) {
    throw new Error(`Expected 5.2 CBM, got ${parsed3.shipment.volumeCbm}`);
  }
  console.log('   ✅ LCL RFQ parsed: SEA_LCL Hai Phong - Hamburg, 5.2 CBM\n');

  // Test 4: Master Rate Matching
  console.log('4. Verifying Master Rate Auto-Matcher...');
  const dummyRfq: SmartRfqItem = {
    id: 'rfq_test_1',
    companyId: 'company_test',
    rfqNumber: 'RFQ-2026-0001',
    source: 'ZALO',
    rawText: sampleZalo.rawText,
    status: 'NEW',
    urgency: 'HIGH',
    customer: parsed1.customer,
    shipment: parsed1.shipment,
    confidenceScore: 92,
    extractedAt: new Date().toISOString(),
    missingFields: [],
    suggestedFollowUpQuestions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const matches = matchRfqWithMasterRates(dummyRfq);
  if (!matches || matches.length === 0) {
    throw new Error('No rate matches generated for RFQ');
  }
  const topMatch = matches[0];
  if (topMatch.baseSell <= topMatch.baseCost || topMatch.marginPercent <= 0) {
    throw new Error('Rate match margin should be positive');
  }
  if (topMatch.suggestedLocalCharges.length < 3) {
    throw new Error('Rate match should include standard local charges');
  }
  console.log(`   ✅ Matched Carrier: ${topMatch.carrierName}, Sell $${topMatch.baseSell}, Cost $${topMatch.baseCost}, Margin ${topMatch.marginPercent}%\n`);

  // Test 5: 5-Second Quote Conversion
  console.log('5. Verifying 5-Second Quote Conversion...');
  dummyRfq.matchedRates = matches;
  dummyRfq.selectedMatchIndex = 0;

  const mockCompany: CompanyProfile = {
    companyId: 'company_test',
    name: 'Bogi Logistics Vietnam',
    englishName: 'Bogi Logistics Global',
    taxId: '0109999999',
    address: 'Hà Nội, Việt Nam',
    phone: '024.1234.5678',
    email: 'pricing@bogilogistics.vn',
    website: 'bogilogistics.vn',
    bankName: 'Vietcombank',
    bankAccountNo: '9999999999',
    bankAccountHolder: 'BOGI LOGISTICS CO',
    bankSwiftCode: 'BFTVVNVX',
    salesRepName: 'Trưởng Phòng Báo Giá',
    salesRepTitle: 'Pricing Lead',
    salesRepPhone: '0901.234.567',
    salesRepEmail: 'sales@bogilogistics.vn'
  };

  const quoteResult = await convertRfqToQuotation({
    rfq: dummyRfq,
    companyProfile: mockCompany,
    exchangeRate: 25400
  });

  if (!quoteResult.success || !quoteResult.quotation) {
    throw new Error('Quote conversion failed');
  }

  const q = quoteResult.quotation;
  if (!q.quoteNumber.startsWith('LOG-') || q.items.length === 0) {
    throw new Error('Generated quote is invalid or has no line items');
  }
  if (q.grandTotalUsd <= 0 || (q.totalProfitUsd || 0) <= 0) {
    throw new Error('Generated quote has invalid financials');
  }
  if (dummyRfq.status !== 'QUOTED' || !dummyRfq.convertedQuotationId) {
    throw new Error('RFQ status was not updated to QUOTED');
  }

  console.log(`   ✅ 5-Second Quote Created: ${q.quoteNumber}, Total: $${q.grandTotalUsd.toLocaleString()}, Profit: $${q.totalProfitUsd?.toLocaleString()} (${q.overallMarginPercent?.toFixed(1)}% margin)`);
  console.log(`   ✅ Line Items generated: ${q.items.length} items (${q.items.map(i => i.description.slice(0, 20)).join(', ')}...)\n`);

  console.log('🎉 All Phase 56 Smart RFQ Inbox & 5-Second Quote Generator tests passed successfully!');
}

runSmartRfqVerification().catch(err => {
  console.error('❌ Phase 56 Verification Failed:', err);
  process.exit(1);
});
