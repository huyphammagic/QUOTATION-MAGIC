/**
 * Logistics Quotation Management Platform - Phase 57 Test Suite
 * Smart Competitor Intelligence & Dynamic Win/Loss Price Benchmark Engine
 */

import { 
  findLaneBenchmark, 
  analyzeWinProbability, 
  STANDARD_COMPETITORS, 
  recordWinLossFeedback,
  getLocalWinLossRecords
} from '../competitorIntelligenceService';

async function runCompetitorIntelligenceTests() {
  console.log('🚀 Running Phase 57 Competitor Intelligence & Win-Rate Benchmark Verification Suite...\n');

  // Test 1: Find Lane Benchmark
  console.log('1. Verifying Lane Benchmark Lookup...');
  const bmHcmLax = findLaneBenchmark('Cát Lái, Hồ Chí Minh', 'Long Beach / Los Angeles, USA', 'SEA_FCL', "40'HC");
  if (!bmHcmLax || bmHcmLax.p50MedianPrice <= 0 || !bmHcmLax.carrierAverages['ONE']) {
    throw new Error('Failed to find HCM-LAX benchmark');
  }
  console.log(`   ✅ Matched Benchmark: ${bmHcmLax.pol} -> ${bmHcmLax.pod}, P50: $${bmHcmLax.p50MedianPrice}`);

  // Test 2: Win Probability - Aggressive Pricing (< P10)
  console.log('2. Verifying Aggressive Low Pricing Analysis (< P10)...');
  const aggressiveResult = analyzeWinProbability({
    proposedPrice: 1600,
    costPrice: 1400,
    benchmark: bmHcmLax
  });
  if (aggressiveResult.winProbabilityPercent < 85 || aggressiveResult.rating !== 'AGGRESSIVE_HIGH_WIN') {
    throw new Error(`Unexpected aggressive win probability: ${aggressiveResult.winProbabilityPercent}%`);
  }
  console.log(`   ✅ Price $1600 -> Win Prob: ${aggressiveResult.winProbabilityPercent}%, Rating: ${aggressiveResult.rating}`);

  // Test 3: Win Probability - Sweet Spot & Expected Value Optimization
  console.log('3. Verifying Sweet-Spot Optimization...');
  const normalResult = analyzeWinProbability({
    proposedPrice: 1850,
    costPrice: 1500,
    benchmark: bmHcmLax
  });
  if (normalResult.sweetSpotPrice <= 0 || normalResult.sweetSpotWinProbability < 65) {
    throw new Error('Invalid sweet spot recommendation');
  }
  console.log(`   ✅ Proposed $1850 -> Sweet-Spot: $${normalResult.sweetSpotPrice} (Win Prob: ${normalResult.sweetSpotWinProbability}%, Margin: ${normalResult.marginPercentAtSweetSpot}%)`);

  // Test 4: Overpriced High Risk (> P90)
  console.log('4. Verifying Overpriced High Risk Detection (> P90)...');
  const highRiskResult = analyzeWinProbability({
    proposedPrice: 2400,
    costPrice: 1500,
    benchmark: bmHcmLax
  });
  if (highRiskResult.winProbabilityPercent > 40 || highRiskResult.rating !== 'OVERPRICED_HIGH_RISK') {
    throw new Error(`Overpriced price should have low win probability: ${highRiskResult.winProbabilityPercent}%`);
  }
  console.log(`   ✅ High Price $2400 -> Win Prob: ${highRiskResult.winProbabilityPercent}%, Rating: ${highRiskResult.rating}`);

  // Test 5: Competitor Profiles & Counter-Tactics
  console.log('5. Verifying Competitor Battlecards Catalog...');
  if (STANDARD_COMPETITORS.length < 3) {
    throw new Error('Not enough competitor profiles');
  }
  const maerskSpot = STANDARD_COMPETITORS.find(c => c.code === 'MAERSK_SPOT');
  if (!maerskSpot || maerskSpot.winningCounterTactics.length === 0) {
    throw new Error('Maersk competitor counter-tactics missing');
  }
  console.log(`   ✅ Loaded Competitor: ${maerskSpot.name}, Weaknesses: ${maerskSpot.weaknesses.length}, Counter-tactics: ${maerskSpot.winningCounterTactics.length}`);

  // Test 6: Win/Loss Record
  console.log('6. Verifying Win/Loss Outcome Recording...');
  await recordWinLossFeedback({
    id: 'test_wl_001',
    companyId: 'company_profile',
    quotationId: 'quote_test_01',
    quoteNumber: 'LOG-2026-TEST',
    customerName: 'Cty Test Shippers',
    lane: 'Cát Lái -> Long Beach',
    outcome: 'WON',
    quotedPrice: 1800,
    winningPrice: 1800,
    primaryReason: 'PRICE',
    recordedBy: 'Sales Test',
    recordedAt: new Date().toISOString()
  });
  const localRecords = getLocalWinLossRecords();
  if (localRecords.length === 0) {
    throw new Error('Win/Loss feedback was not recorded in cache');
  }
  console.log(`   ✅ Recorded Win/Loss feedback properly, total cached: ${localRecords.length}`);

  console.log('\n🎉 All Phase 57 Competitor Intelligence & Win-Rate Benchmark tests passed successfully!');
}

runCompetitorIntelligenceTests().catch(err => {
  console.error('❌ Phase 57 Verification Failed:', err);
  process.exit(1);
});
