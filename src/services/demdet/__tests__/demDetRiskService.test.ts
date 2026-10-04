/**
 * Logistics Quotation Management Platform - Phase 60 Test Suite
 * AI Container Free-Time DEM/DET Cost Optimizer & Port Congestion Risk Radar Tests
 */

import {
  CARRIER_FREE_TIME_POLICIES,
  PORT_CONGESTION_DATA,
  simulateDemDetCost,
  generateFreeTimeSalesWeapon
} from '../demDetRiskService';

console.log('🧪 RUNNING SUITE: Phase 60 - DEM/DET Cost Optimizer & Port Congestion Risk Radar');

// Test 1: Carriers database
if (!CARRIER_FREE_TIME_POLICIES || CARRIER_FREE_TIME_POLICIES.length < 5) {
  throw new Error(`Expected at least 5 carriers, found ${CARRIER_FREE_TIME_POLICIES?.length}`);
}
console.log(`✅ Test 1 Passed: Loaded ${CARRIER_FREE_TIME_POLICIES.length} carrier free-time policies`);

// Test 2: Port Congestion Data
if (!PORT_CONGESTION_DATA || PORT_CONGESTION_DATA.length < 4) {
  throw new Error(`Expected at least 4 ports, found ${PORT_CONGESTION_DATA?.length}`);
}
const catLai = PORT_CONGESTION_DATA.find(p => p.portCode === 'VNCLI');
if (!catLai || !catLai.yardDensityPercent) {
  throw new Error('Port Cát Lái data missing');
}
console.log(`✅ Test 2 Passed: Loaded ${PORT_CONGESTION_DATA.length} port congestion monitors including Cát Lái (${catLai.yardDensityPercent}% yard density)`);

// Test 3: Simulation within free time (0 overdue days)
const safeSim = simulateDemDetCost({
  containerType: '40HC',
  quantity: 2,
  freeDaysGranted: 14,
  expectedStorageDays: 10,
  carrierCode: 'MAERSK',
  portCode: 'VNCLI'
});

if (safeSim.overdueDays !== 0 || safeSim.totalDemDetFeeUsd !== 0 || safeSim.riskLevel !== 'SAFE') {
  throw new Error(`Expected SAFE and 0 fee, got fee ${safeSim.totalDemDetFeeUsd}, risk ${safeSim.riskLevel}`);
}
console.log('✅ Test 3 Passed: Free-time fully covers 10 days, 0 USD fee calculated');

// Test 4: Simulation with 18 days storage (overdue by 4 days in Tier 1)
const overdueSim = simulateDemDetCost({
  containerType: '40HC',
  quantity: 2,
  freeDaysGranted: 14,
  expectedStorageDays: 18,
  carrierCode: 'MAERSK',
  portCode: 'VNCLI'
});

if (overdueSim.overdueDays !== 4) {
  throw new Error(`Expected 4 overdue days, got ${overdueSim.overdueDays}`);
}
// 4 days * $65/day * 2 containers = $520
if (overdueSim.totalDemDetFeeUsd !== 520) {
  throw new Error(`Expected $520 USD total fee, got $${overdueSim.totalDemDetFeeUsd}`);
}
console.log(`✅ Test 4 Passed: 4 overdue days for 2x40HC in Tier 1 computed exactly $${overdueSim.totalDemDetFeeUsd} USD`);

// Test 5: Sales Free-Time Value Weapon Generator
const weapon = generateFreeTimeSalesWeapon(
  'Tập đoàn Dệt May Phong Phú',
  'Cát Lái -> Long Beach',
  'MAERSK',
  21
);

if (!weapon.salesPitchParagraphVi.includes('Phong Phú') || weapon.guaranteedSavingsUsd <= 0) {
  throw new Error('Sales free-time pitch generator failed');
}
console.log(`✅ Test 5 Passed: Generated Sales Weapon pitch saving $${weapon.guaranteedSavingsUsd.toLocaleString()} USD with contract clause snippet`);
console.log('🎉 ALL PHASE 60 TESTS PASSED SUCCESSFULLY!\n');
