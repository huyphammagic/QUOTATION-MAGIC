/**
 * Logistics Quotation Management Platform - Phase 62 Test Suite
 * Smart Concession & Margin Floor Guard Tests
 */

import {
  simulateSmartConcessions
} from '../smartConcessionService';

console.log('🧪 RUNNING SUITE: Phase 62 - Smart Concession & Margin Floor Guard');

// Test 1: Simulation where requested discount is safe (above floor)
const safeSim = simulateSmartConcessions({
  customerName: 'Test Shipper Co',
  carrier: 'ONE',
  route: 'Cát Lái -> Long Beach',
  currentFreightSellUsd: 4000,
  currentFreightCostUsd: 3400,
  minMarginFloorPercent: 7.0,
  requestedDiscountUsd: 50, // sell = 3950, profit = 550, margin = 13.92% (well above 7%)
  containerQuantity: 2
});

if (safeSim.isBreachingFloor) {
  throw new Error('Expected discount to be safe and not breaching floor');
}
if (safeSim.options.length < 5) {
  throw new Error(`Expected at least 5 trade-off options, got ${safeSim.options.length}`);
}
console.log(`✅ Test 1 Passed: Safe simulation generated ${safeSim.options.length} trade-off strategies with margin ${safeSim.projectedMarginIfDirectDiscountPercent}%`);

// Test 2: Simulation where requested discount breaches floor
const dangerSim = simulateSmartConcessions({
  customerName: 'High Demand Shipper',
  carrier: 'Maersk',
  route: 'Cát Lái -> Rotterdam',
  currentFreightSellUsd: 3200,
  currentFreightCostUsd: 3000,
  minMarginFloorPercent: 6.0,
  requestedDiscountUsd: 150, // sell = 3050, profit = 50, margin = 1.63% (breaches 6% floor!)
  containerQuantity: 4
});

if (!dangerSim.isBreachingFloor) {
  throw new Error('Expected dangerSim to breach margin floor');
}
if (!dangerSim.floorWarningVi) {
  throw new Error('Expected floor warning message for dangerous discount');
}
console.log(`✅ Test 2 Passed: Successfully detected floor breach! Allowed max discount is $${dangerSim.allowedMaxDirectDiscountUsd} USD before touching 6% floor`);

// Test 3: Check Volume Trade-off and Non-Cash Perks
const volumeOpt = safeSim.options.find(o => o.strategyType === 'VOLUME_TRADEOFF');
const nonCashOpt = safeSim.options.find(o => o.strategyType === 'NON_CASH_PERKS');

if (!volumeOpt || !nonCashOpt) {
  throw new Error('Missing core concession options');
}
if (nonCashOpt.newFreightSellUsd !== 4000) {
  throw new Error('Non-cash perks must keep sell price unchanged');
}
console.log(`✅ Test 3 Passed: Non-cash perks preserves 100% sell price ($${nonCashOpt.newFreightSellUsd}) while providing $${nonCashOpt.customerPerceivedValueUsd} value to client`);
console.log('🎉 ALL PHASE 62 TESTS PASSED SUCCESSFULLY!\n');
