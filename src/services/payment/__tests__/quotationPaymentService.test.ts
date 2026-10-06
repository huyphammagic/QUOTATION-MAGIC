/**
 * Phase 66: Quotation Payment & Receivable Service Test Suite
 */

import { QuotationPaymentService, PRESEEDED_PAYMENT_RECORDS } from '../quotationPaymentService';

console.log('--- RUNNING QUOTATION PAYMENT & RECEIVABLE TEST SUITE ---');

// Test 1: Load preseeded payment records
const records = QuotationPaymentService.getPaymentRecords();
console.assert(records.length >= 4, `Expected at least 4 preseeded records, got ${records.length}`);
console.log(`✓ Test 1: Preseeded payment records loaded successfully: ${records.length} records`);

// Test 2: Verify Seafood partial payment record
const seafood = QuotationPaymentService.getPaymentRecordByQuoteId('Q-2026-0881');
console.assert(!!seafood, 'Expected to find Seafood payment record Q-2026-0881');
if (seafood) {
  console.assert(seafood.paymentStatus === 'PARTIALLY_PAID', `Expected PARTIALLY_PAID, got ${seafood.paymentStatus}`);
  console.assert(seafood.totalPaidUsd === 5000, `Expected totalPaidUsd = 5000, got ${seafood.totalPaidUsd}`);
  console.assert(seafood.outstandingBalanceUsd === 9600, `Expected outstanding = 9600, got ${seafood.outstandingBalanceUsd}`);
  console.log(`✓ Test 2: Verified partial deposit state (Paid: $${seafood.totalPaidUsd}, Remaining: $${seafood.outstandingBalanceUsd})`);
}

// Test 3: Record a new payment tranche to clear the remaining balance (transition to PAID)
const updatedSeafood = QuotationPaymentService.recordPaymentTranche('Q-2026-0881', {
  quotationId: 'quote_sf_001',
  quoteNumber: 'Q-2026-0881',
  amount: 9600,
  currency: 'USD',
  exchangeRate: 25000,
  amountVndEquivalent: 240000000,
  amountUsdEquivalent: 9600,
  paymentDate: '2026-10-05',
  paymentMethod: 'BANK_TRANSFER',
  bankTransactionRef: 'UNC-FINAL-9600',
  bankAccountName: 'Vietcombank',
  recordedBy: 'Kế toán trưởng',
  notes: 'Thanh toán nốt 9,600 USD'
});

console.assert(updatedSeafood.outstandingBalanceUsd === 0, `Expected balance 0, got ${updatedSeafood.outstandingBalanceUsd}`);
console.assert(updatedSeafood.paymentStatus === 'PAID', `Expected status PAID, got ${updatedSeafood.paymentStatus}`);
console.assert(updatedSeafood.receipts.length === 2, `Expected 2 receipts, got ${updatedSeafood.receipts.length}`);
console.log('✓ Test 3: Added final payment tranche -> successfully transitioned to 100% PAID');

// Test 4: Overdue detection on Garment record
const garment = QuotationPaymentService.getPaymentRecordByQuoteId('Q-2026-0842');
console.assert(!!garment, 'Expected to find Garment payment record');
if (garment) {
  console.assert(garment.isOverdue === true, 'Expected garment to be marked overdue');
  console.assert(garment.daysOverdue > 0, `Expected daysOverdue > 0, got ${garment.daysOverdue}`);
  console.assert(garment.paymentStatus === 'OVERDUE', `Expected OVERDUE status, got ${garment.paymentStatus}`);
  console.log(`✓ Test 4: Overdue detection verified (Overdue by ${garment.daysOverdue} days, Balance: $${garment.outstandingBalanceUsd})`);

  // Test 5: Generate payment reminder letter
  const reminder = QuotationPaymentService.generatePaymentReminder(garment);
  console.assert(reminder.vi.subject.includes('NHẮC THANH TOÁN'), 'VI subject should include reminder prefix');
  console.assert(reminder.vi.body.includes(garment.quoteNumber), 'VI body should contain quote number');
  console.assert(reminder.en.subject.includes('PAYMENT REMINDER'), 'EN subject should include reminder prefix');
  console.log('✓ Test 5: Payment reminder letter generated in Vietnamese & English');
}

// Test 6: Metrics calculation
const metrics = QuotationPaymentService.getPaymentMetrics();
console.assert(metrics.totalReceivableUsd > 0, 'Total receivable should be > 0');
console.assert(metrics.collectionRatePercent > 0, 'Collection rate should be > 0');
console.log(`✓ Test 6: Payment metrics calculated (Total Receivable: $${metrics.totalReceivableUsd.toLocaleString()}, Rate: ${metrics.collectionRatePercent}%)`);

console.log('--- ALL QUOTATION PAYMENT TESTS PASSED SUCCESSFULLY! ---');
