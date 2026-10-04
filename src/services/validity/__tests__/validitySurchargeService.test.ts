/**
 * Logistics Quotation Management Platform - Phase 59 Test Suite
 * Validity & Surcharge Volatility Alert Engine Tests
 */

import {
  STANDARD_SURCHARGE_ALERTS,
  SAMPLE_AUDIT_QUOTES,
  calculateValidityStatus,
  getMarketSurchargeAlerts,
  getQuotationValidityAudits,
  auditSingleQuote,
  executeBulkValidityExtension,
  generateUrgentClosingMessage
} from '../validitySurchargeService';

console.log('🧪 RUNNING SUITE: Phase 59 - Validity & Surcharge Alert Engine');

// Test 1: Surcharge Alerts loaded correctly
const alerts = getMarketSurchargeAlerts();
if (!alerts || alerts.length < 4) {
  throw new Error(`Expected at least 4 surcharge alerts, got ${alerts?.length}`);
}
console.log(`✅ Test 1 Passed: Loaded ${alerts.length} market surcharge alerts (GRI, PSS, ETS, WRS)`);

// Test 2: Status calculation for validity dates
const statusExpired = calculateValidityStatus('2026-10-01');
if (statusExpired.status !== 'EXPIRED' || statusExpired.daysRemaining !== 0) {
  throw new Error(`Expected EXPIRED, got ${statusExpired.status}`);
}

const statusCritical = calculateValidityStatus('2026-10-04');
if (statusCritical.status !== 'CRITICAL_48H' && statusCritical.status !== 'EXPIRING_SOON') {
  throw new Error(`Expected CRITICAL_48H or EXPIRING_SOON, got ${statusCritical.status}`);
}
console.log('✅ Test 2 Passed: Validity status accurately reflects remaining days');

// Test 3: Audit single quote
const singleAudit = auditSingleQuote({
  id: 'test-quote-101',
  quoteNumber: 'QUO-TEST-101',
  customer: {
    companyName: 'Test Seafood Co',
    customerName: 'Test Seafood Co',
    email: 'test@seafood.vn',
    phone: '0901234567',
    taxId: '0102030405',
    address: 'HCM City',
    contactPerson: 'Director'
  },
  shipment: {
    mode: 'SEA_FCL',
    pol: 'Cát Lái',
    pod: 'Long Beach',
    carrier: 'ONE (Ocean Network Express)',
    commodity: 'Seafood',
    containerType: "40'HC",
    quantity: 2,
    grossWeightKg: 40000,
    volumeCbm: 120,
    chargeableWeight: 40000
  },
  terms: {
    incoterm: 'CIF',
    validityDate: '2026-10-06',
    paymentTerm: 'Prepaid',
    exclusionsNotes: 'None',
    bankAccountInfo: 'Bank'
  },
  grandTotalUsd: 4000,
  items: [
    {
      id: 'it-1',
      code: 'FRT-40HC',
      description: 'Ocean Freight 40HC',
      category: 'FREIGHT',
      location: 'FREIGHT',
      unit: 'CONTAINER',
      quantity: 1,
      unitPrice: 4000,
      amountUsd: 4000,
      amountVnd: 101600000,
      costPrice: 3500,
      costTotalUsd: 3500,
      costTotalVnd: 88900000,
      currency: 'USD',
      vatRate: 0,
      profitUsd: 500,
      profitVnd: 12700000,
      marginPercent: 12.5
    }
  ]
});

if (!singleAudit || singleAudit.quotationId !== 'test-quote-101') {
  throw new Error('Audit failed for single quote');
}
if (singleAudit.currentProfitMarginPercent <= 0) {
  throw new Error('Expected positive profit margin percent');
}
console.log(`✅ Test 3 Passed: Successfully audited single quote with margin ${singleAudit.currentProfitMarginPercent}% and daysRemaining ${singleAudit.daysRemaining}`);

// Test 4: Bulk extension execution
const auditQuotes = getQuotationValidityAudits();
const targetId = auditQuotes[0].quotationId;
const oldValidTo = auditQuotes[0].validTo;

const bulkPromise = executeBulkValidityExtension({
  quoteIds: [targetId],
  daysToAdd: 14,
  applySurchargeBufferUsd: 150,
  newValidToDate: '2026-10-25'
});

bulkPromise.then(results => {
  if (results.length !== 1 || results[0].status !== 'SUCCESS') {
    throw new Error('Bulk extension failed');
  }
  if (results[0].newValidTo !== '2026-10-25') {
    throw new Error(`Expected new date 2026-10-25, got ${results[0].newValidTo}`);
  }
  console.log(`✅ Test 4 Passed: 1-Click bulk validity extension updated quote ${results[0].quoteNumber} with buffer price $${results[0].newFreightSellUsd}`);

  // Test 5: Urgency Message Generation
  const msg = generateUrgentClosingMessage(auditQuotes[0], alerts[0]);
  if (!msg.messageZalo.includes('xác nhận booking') || !msg.messageEmail.includes('Báo giá số')) {
    throw new Error('Urgency closing message template generation failed');
  }
  console.log('✅ Test 5 Passed: Urgency closing messages generated for Zalo and Email');
  console.log('🎉 ALL PHASE 59 TESTS PASSED SUCCESSFULLY!\n');
}).catch(err => {
  console.error('Phase 59 Test Failed:', err);
  process.exit(1);
});
