/**
 * Logistics Quotation Management Platform - Phase 61 Test Suite
 * "Golden Hour" Smart Follow-Up & Intent Trigger Engine Tests
 */

import {
  SAMPLE_GOLDEN_HOUR_LEADS,
  getGoldenHourLeads,
  calculateBuyerIntent,
  recordGoldenHourFollowUpOutcome
} from '../goldenHourService';

console.log('🧪 RUNNING SUITE: Phase 61 - Golden Hour Smart Follow-Up Engine');

// Test 1: Load sample leads
const leads = getGoldenHourLeads();
if (!leads || leads.length < 3) {
  throw new Error(`Expected at least 3 golden hour leads, found ${leads?.length}`);
}
console.log(`✅ Test 1 Passed: Loaded ${leads.length} golden hour leads, top lead: ${leads[0].customerName} (Score: ${leads[0].intentScore})`);

// Test 2: Calculate buyer intent
const readyToBuy = calculateBuyerIntent(4, 250, true, true, true);
if (readyToBuy.score < 90 || readyToBuy.level !== 'READY_TO_BUY') {
  throw new Error(`Expected READY_TO_BUY and score >= 90, got score ${readyToBuy.score}, level ${readyToBuy.level}`);
}

const casual = calculateBuyerIntent(1, 15, false, false, false);
if (casual.score >= 70 || casual.level === 'READY_TO_BUY') {
  throw new Error(`Expected lower score for casual browsing, got ${casual.score}`);
}
console.log(`✅ Test 2 Passed: Buyer intent accurately scored (Hot: ${readyToBuy.score}%, Casual: ${casual.score}%)`);

// Test 3: Follow-up outcome logging
const targetLeadId = leads[0].id;
recordGoldenHourFollowUpOutcome({
  leadId: targetLeadId,
  outcome: 'WON_BOOKING',
  notes: 'Khách hàng chốt ngay 2 cont sau khi nghe cam kết slot tàu thứ 6!'
}).then(updated => {
  if (!updated || !updated.isFollowedUp || updated.followUpOutcome !== 'WON_BOOKING') {
    throw new Error('Failed to record follow-up outcome');
  }
  console.log(`✅ Test 3 Passed: Successfully recorded WON_BOOKING outcome for lead ${updated.customerName}`);
  console.log('🎉 ALL PHASE 61 TESTS PASSED SUCCESSFULLY!\n');
}).catch(err => {
  console.error('Phase 61 Test Failed:', err);
  process.exit(1);
});
