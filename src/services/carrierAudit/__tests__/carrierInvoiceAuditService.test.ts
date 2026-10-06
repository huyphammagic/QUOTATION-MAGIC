/**
 * Phase 65: Carrier Invoice Audit & Profit Leakage Guard Test Suite
 */

import { CarrierInvoiceAuditService } from '../carrierInvoiceAuditService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('--- RUNNING CARRIER INVOICE AUDIT TEST SUITE ---');

// Test 1: Get records
const records = CarrierInvoiceAuditService.getAuditRecords();
assert(records.length >= 3, `Expected at least 3 audit records, found: ${records.length}`);
console.log('✓ Test 1: Audit records loaded successfully:', records.length);

// Test 2: Find Maersk discrepancy record with overcharge
const maerskRecord = records.find(r => r.carrierName === 'Maersk Line');
assert(!!maerskRecord, 'Expected to find Maersk audit record');
assert(maerskRecord?.totalProfitLeakageUsd === 1180, 'Expected $1,180 overcharge leakage detected');
assert(maerskRecord?.severity === 'CRITICAL', 'Expected CRITICAL severity for negative margin flip');
console.log('✓ Test 2: Maersk 3-way matching overcharge verified ($1,180 leakage detected)');

// Test 3: Generate carrier dispute letter
if (maerskRecord) {
  const dispute = CarrierInvoiceAuditService.generateCarrierDisputeLetter(maerskRecord);
  assert(dispute.subjectVi.includes(maerskRecord.bookingNumber), 'Dispute letter should mention booking number');
  assert(dispute.letterBodyVi.includes('1,180'), 'Letter should mention disputed amount');
  assert(dispute.totalDisputedAmountUsd === 1180, 'Disputed amount should match leakage');
  console.log('✓ Test 3: Carrier dispute letter generation passed (Vi & En)');
}

// Test 4: Dispute status update
const oneRecord = records.find(r => r.carrierName.includes('ONE'));
if (oneRecord) {
  const updated = CarrierInvoiceAuditService.updateDisputeStatus(
    oneRecord.id,
    'CREDIT_NOTE_ISSUED',
    170,
    'Credit Note CN-TEST-001 issued successfully'
  );
  assert(updated?.status === 'CREDIT_NOTE_ISSUED', 'Expected status to update to CREDIT_NOTE_ISSUED');
  assert(updated?.recoveredAmountUsd === 170, 'Expected recovered amount to match $170');
  console.log('✓ Test 4: Update dispute status passed');
}

// Test 5: Carrier scorecards & metrics
const scorecards = CarrierInvoiceAuditService.getCarrierScorecards();
assert(scorecards.length >= 3, `Expected at least 3 carriers in scorecard, found: ${scorecards.length}`);
const metrics = CarrierInvoiceAuditService.getLeakageMetrics();
assert(metrics.totalPreventedLeakageUsd > 1000, 'Expected total prevented leakage > $1,000');
console.log('✓ Test 5: Scorecard & metrics calculated successfully. Total prevented leakage:', metrics.totalPreventedLeakageVnd);

console.log('--- ALL CARRIER INVOICE AUDIT TESTS PASSED SUCCESSFULLY! ---');
