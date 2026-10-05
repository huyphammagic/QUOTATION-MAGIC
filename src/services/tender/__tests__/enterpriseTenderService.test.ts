/**
 * Logistics Quotation Management Platform - Phase 63 Test Suite
 * Enterprise Multi-Lane RFQ & Portfolio Tender Engine Tests
 */

import {
  SAMPLE_ENTERPRISE_TENDERS,
  getEnterpriseTenders,
  getTenderById,
  optimizePortfolioPricing,
  convertTenderToQuoteData,
  exportTenderToCsv
} from '../enterpriseTenderService';

console.log('🧪 RUNNING SUITE: Phase 63 - Enterprise Multi-Lane Tender Engine');

// Test 1: Load sample enterprise tenders
const tenders = getEnterpriseTenders();
if (!tenders || tenders.length < 2) {
  throw new Error(`Expected at least 2 enterprise tenders, found ${tenders?.length}`);
}
console.log(`✅ Test 1 Passed: Loaded ${tenders.length} factory tenders. Top tender: ${tenders[0].titleVi} (${tenders[0].totalAnnualVolumeTeu} TEU)`);

// Test 2: Verify Phong Phu tender metrics
const phongPhu = getTenderById('tnd-phongphu-2026');
if (!phongPhu) {
  throw new Error('Phong Phu tender not found');
}
if (phongPhu.totalAnnualVolumeTeu !== 1250) {
  throw new Error(`Expected 1250 TEU, got ${phongPhu.totalAnnualVolumeTeu}`);
}
if (phongPhu.lanes.length !== 6) {
  throw new Error(`Expected 6 lanes in tender matrix, got ${phongPhu.lanes.length}`);
}
console.log(`✅ Test 2 Passed: Phong Phu tender verified with 6 lanes, $${phongPhu.totalAnnualGrossProfitUsd.toLocaleString()} USD annual gross profit`);

// Test 3: Portfolio Margin Optimization Algorithm
const optimized = optimizePortfolioPricing(phongPhu, {
  targetBlendedMarginPercent: 8.0,
  volumeDriverMarginMax: 4.0,
  profitDriverMarginMin: 14.0
});

if (!optimized || optimized.status !== 'OPTIMIZING') {
  throw new Error('Portfolio optimization failed');
}
if (optimized.blendedMarginPercent <= 0) {
  throw new Error('Expected positive blended margin');
}
const volLane = optimized.lanes.find(l => l.strategy === 'VOLUME_DRIVER');
const profitLane = optimized.lanes.find(l => l.strategy === 'PROFIT_DRIVER');
if (!volLane || !profitLane) {
  throw new Error('Missing volume driver or profit driver lane in optimized result');
}
if (volLane.marginPercent > profitLane.marginPercent) {
  throw new Error('Volume driver margin must be lower than profit driver margin');
}
console.log(`✅ Test 3 Passed: Portfolio balanced! Volume driver margin ${volLane.marginPercent}% vs Profit driver margin ${profitLane.marginPercent}% (Blended: ${optimized.blendedMarginPercent}%)`);

// Test 4: Convert Tender to Quotation Workspace QuoteData
const quote = convertTenderToQuoteData(phongPhu);
if (!quote || quote.items.length !== 6) {
  throw new Error(`Expected QuoteData with 6 items, got ${quote?.items?.length}`);
}
if (quote.grandTotalUsd <= 0 || !quote.quoteNumber.includes('PHONGPHU')) {
  throw new Error('Quote conversion data validation failed');
}
console.log(`✅ Test 4 Passed: Converted tender matrix into master QuoteData ${quote.quoteNumber} ($${quote.grandTotalUsd.toLocaleString()} USD)`);

// Test 5: Export CSV Matrix
const csv = exportTenderToCsv(phongPhu);
if (!csv.includes('Nhà Máy Xuất Phát') || !csv.includes('Long Beach')) {
  throw new Error('CSV export format invalid');
}
console.log('✅ Test 5 Passed: Tender CSV matrix generated successfully for Excel import');
console.log('🎉 ALL PHASE 63 TESTS PASSED SUCCESSFULLY!\n');
