import { RateMasterItem, RateSearchContext } from '../../../types/masterRate';
import { LineItem, ShipmentDetails } from '../../../types/logistics';
import { 
  searchSmartRates, 
  scanSmartRatesForQuote, 
  evaluateRateMatch 
} from '../rateSearchService';
import { 
  convertRateToLineItemSnapshot, 
  compareLineItemWithLiveRate, 
  checkQuoteForRateUpdates, 
  applyLiveRateToLineItem, 
  recordLineItemOverride 
} from '../rateSnapshot';

// Test runner assertion shims
type TestFn = () => void | Promise<void>;
const describe = (name: string, fn: () => void) => {
  console.log(`\n=== Running Test Suite: ${name} ===`);
  fn();
};
const test = (name: string, fn: TestFn) => {
  try {
    fn();
    console.log(`  ✓ Passed: ${name}`);
  } catch (err: any) {
    console.error(`  ✗ Failed: ${name}\n    Error: ${err?.message || err}`);
    throw err;
  }
};
const expect = (actual: any) => ({
  toBe: (expected: any) => {
    if (actual !== expected) {
      throw new Error(`Expected ${expected} but received ${actual}`);
    }
  },
  toBeGreaterThan: (expected: number) => {
    if (actual <= expected) {
      throw new Error(`Expected ${actual} to be greater than ${expected}`);
    }
  },
  toBeLessThan: (expected: number) => {
    if (actual >= expected) {
      throw new Error(`Expected ${actual} to be less than ${expected}`);
    }
  },
  toEqual: (expected: any) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}`);
    }
  },
  toBeDefined: () => {
    if (actual === undefined || actual === null) {
      throw new Error(`Expected defined value but received ${actual}`);
    }
  },
  toBeUndefined: () => {
    if (actual !== undefined) {
      throw new Error(`Expected undefined but received ${actual}`);
    }
  },
  toBeTrue: () => {
    if (actual !== true) {
      throw new Error(`Expected true but received ${actual}`);
    }
  },
  toBeFalse: () => {
    if (actual !== false) {
      throw new Error(`Expected false but received ${actual}`);
    }
  }
});

// Sample Test Rates
const sampleRates: RateMasterItem[] = [
  // 1. Customer-Specific Rate (Samsung)
  {
    id: 'rate-cust-sam-01',
    rateCode: 'SEA-SAMS-40HC-01',
    rateName: 'Contract Rate for Samsung - Cat Lai to LAX',
    category: 'FREIGHT',
    chargeType: 'BASE_FREIGHT',
    chargeCode: 'O/F',
    chargeName: 'Ocean Freight',
    transportMode: 'SEA_FCL',
    origin: 'Cat Lai Port, Vietnam',
    destination: 'Los Angeles, USA',
    carrier: 'Maersk Line',
    containerType: "40'HC",
    customerCode: 'CUST-SAMS-01',
    customerName: 'Samsung Electronics VN',
    basis: 'PER_CONTAINER',
    unit: "Cont 40'HC",
    costAmount: 1200,
    costCurrency: 'USD',
    sellingAmount: 1450,
    sellingCurrency: 'USD',
    vatRate: 0,
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31',
    status: 'ACTIVE',
    version: 1,
    priority: 95,
  },

  // 2. Contract Preferential Rate (General)
  {
    id: 'rate-contract-01',
    rateCode: 'SEA-MSK-40HC-SVC01',
    rateName: 'Contract Rate MSK - Cat Lai to LAX',
    category: 'FREIGHT',
    chargeType: 'BASE_FREIGHT',
    chargeCode: 'O/F',
    chargeName: 'Ocean Freight',
    transportMode: 'SEA_FCL',
    origin: 'Cat Lai Port, Vietnam',
    destination: 'Los Angeles, USA',
    carrier: 'Maersk Line',
    containerType: "40'HC",
    contractNo: 'MSK-GLOBAL-2026',
    basis: 'PER_CONTAINER',
    unit: "Cont 40'HC",
    costAmount: 1400,
    costCurrency: 'USD',
    sellingAmount: 1750,
    sellingCurrency: 'USD',
    vatRate: 0,
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31',
    status: 'ACTIVE',
    version: 1,
    priority: 85,
  },

  // 3. Carrier Specific Rate (ONE)
  {
    id: 'rate-one-40hc',
    rateCode: 'SEA-ONE-40HC-01',
    rateName: 'ONE Ocean Freight - Cat Lai to LAX',
    category: 'FREIGHT',
    chargeType: 'BASE_FREIGHT',
    chargeCode: 'O/F',
    chargeName: 'Ocean Freight',
    transportMode: 'SEA_FCL',
    origin: 'Cat Lai Port, Vietnam',
    destination: 'Los Angeles, USA',
    carrier: 'ONE',
    containerType: "40'HC",
    basis: 'PER_CONTAINER',
    unit: "Cont 40'HC",
    costAmount: 1350,
    costCurrency: 'USD',
    sellingAmount: 1700,
    sellingCurrency: 'USD',
    vatRate: 0,
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31',
    status: 'ACTIVE',
    version: 1,
    priority: 50,
  },

  // 4. 20'GP Container Rate (Same route, different container)
  {
    id: 'rate-msk-20gp',
    rateCode: 'SEA-MSK-20GP-01',
    rateName: 'Maersk Ocean Freight 20GP - Cat Lai to LAX',
    category: 'FREIGHT',
    chargeType: 'BASE_FREIGHT',
    chargeCode: 'O/F',
    chargeName: 'Ocean Freight',
    transportMode: 'SEA_FCL',
    origin: 'Cat Lai Port, Vietnam',
    destination: 'Los Angeles, USA',
    carrier: 'Maersk Line',
    containerType: "20'GP",
    basis: 'PER_CONTAINER',
    unit: "Cont 20'GP",
    costAmount: 900,
    costCurrency: 'USD',
    sellingAmount: 1150,
    sellingCurrency: 'USD',
    vatRate: 0,
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31',
    status: 'ACTIVE',
    version: 1,
    priority: 50,
  },

  // 5. Expired Rate
  {
    id: 'rate-expired-01',
    rateCode: 'SEA-COSCO-EXPIRED',
    rateName: 'COSCO Old Rate - Cat Lai to LAX',
    category: 'FREIGHT',
    chargeType: 'BASE_FREIGHT',
    chargeCode: 'O/F',
    chargeName: 'Ocean Freight',
    transportMode: 'SEA_FCL',
    origin: 'Cat Lai Port, Vietnam',
    destination: 'Los Angeles, USA',
    carrier: 'COSCO',
    containerType: "40'HC",
    basis: 'PER_CONTAINER',
    unit: "Cont 40'HC",
    costAmount: 1000,
    costCurrency: 'USD',
    sellingAmount: 1200,
    sellingCurrency: 'USD',
    vatRate: 0,
    effectiveFrom: '2025-01-01',
    effectiveTo: '2025-12-31', // Expired!
    status: 'EXPIRED',
    version: 1,
    priority: 50,
  },

  // 6. Air Freight with Weight Breaks
  {
    id: 'rate-air-sgn-lax-100',
    rateCode: 'AIR-VN-LAX-100KG',
    rateName: 'Air Freight Vietnam Airlines (+100KG)',
    category: 'FREIGHT',
    chargeType: 'BASE_FREIGHT',
    chargeCode: 'A/F',
    chargeName: 'Air Freight',
    transportMode: 'AIR_FREIGHT',
    origin: 'SGN Airport, Ho Chi Minh',
    destination: 'LAX Airport, Los Angeles',
    carrier: 'Vietnam Airlines',
    basis: 'PER_KG',
    unit: 'KG (+100KG)',
    costAmount: 3.5,
    costCurrency: 'USD',
    sellingAmount: 4.8,
    sellingCurrency: 'USD',
    vatRate: 0,
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31',
    status: 'ACTIVE',
    version: 1,
    priority: 60,
  },
  {
    id: 'rate-air-sgn-lax-500',
    rateCode: 'AIR-VN-LAX-500KG',
    rateName: 'Air Freight Vietnam Airlines (+500KG)',
    category: 'FREIGHT',
    chargeType: 'BASE_FREIGHT',
    chargeCode: 'A/F',
    chargeName: 'Air Freight',
    transportMode: 'AIR_FREIGHT',
    origin: 'SGN Airport, Ho Chi Minh',
    destination: 'LAX Airport, Los Angeles',
    carrier: 'Vietnam Airlines',
    basis: 'PER_KG',
    unit: 'KG (+500KG)',
    costAmount: 2.8,
    costCurrency: 'USD',
    sellingAmount: 3.9,
    sellingCurrency: 'USD',
    vatRate: 0,
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31',
    status: 'ACTIVE',
    version: 1,
    priority: 70,
  },

  // 7. POL Local Charges
  {
    id: 'rate-pol-thc-40hc',
    rateCode: 'POL-THC-40HC',
    rateName: 'Terminal Handling Charge at POL (40HC)',
    category: 'LOCAL_CHARGE',
    chargeType: 'ORIGIN_LOCAL',
    chargeCode: 'THC',
    chargeName: 'Terminal Handling Charge',
    transportMode: 'SEA_FCL',
    origin: 'Cat Lai Port, Vietnam',
    containerType: "40'HC",
    basis: 'PER_CONTAINER',
    unit: 'Cont',
    costAmount: 110,
    costCurrency: 'USD',
    sellingAmount: 140,
    sellingCurrency: 'USD',
    vatRate: 8,
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31',
    status: 'ACTIVE',
    version: 1,
    priority: 80,
  },
  {
    id: 'rate-pol-bl',
    rateCode: 'POL-BL-FEE',
    rateName: 'Bill of Lading Fee (POL)',
    category: 'LOCAL_CHARGE',
    chargeType: 'ORIGIN_LOCAL',
    chargeCode: 'BL',
    chargeName: 'Bill of Lading Fee',
    transportMode: 'SEA_FCL',
    origin: 'Cat Lai Port, Vietnam',
    basis: 'PER_BL',
    unit: 'Bill',
    costAmount: 750000,
    costCurrency: 'VND',
    sellingAmount: 1000000,
    sellingCurrency: 'VND',
    vatRate: 8,
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31',
    status: 'ACTIVE',
    version: 1,
    priority: 80,
  },

  // 8. Inland Trucking
  {
    id: 'rate-truck-bd-catlai',
    rateCode: 'TRK-BD-CATLAI-40',
    rateName: 'Trucking Binh Duong -> Cat Lai (40ft)',
    category: 'TRUCKING',
    chargeType: 'INLAND_FREIGHT',
    chargeCode: 'TRUCKING',
    chargeName: 'Inland Trucking',
    transportMode: 'INLAND_TRUCKING',
    origin: 'Binh Duong IP, Vietnam',
    destination: 'Cat Lai Port, Vietnam',
    containerType: "40'HC",
    basis: 'PER_CONTAINER',
    unit: 'Chuyến',
    costAmount: 3200000,
    costCurrency: 'VND',
    sellingAmount: 4200000,
    sellingCurrency: 'VND',
    vatRate: 8,
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31',
    status: 'ACTIVE',
    version: 1,
    priority: 60,
  },

  // 9. Customs Clearance
  {
    id: 'rate-customs-catlai',
    rateCode: 'CUS-CATLAI-EXP',
    rateName: 'Customs Clearance Export at Cat Lai',
    category: 'CUSTOMS',
    chargeType: 'CUSTOMS_FEE',
    chargeCode: 'CUSTOMS_DECLARATION',
    chargeName: 'Customs Clearance',
    transportMode: 'CUSTOMS_CLEARANCE',
    origin: 'Cat Lai Port, Vietnam',
    basis: 'PER_SET',
    unit: 'Bộ tờ khai',
    costAmount: 600000,
    costCurrency: 'VND',
    sellingAmount: 900000,
    sellingCurrency: 'VND',
    vatRate: 8,
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31',
    status: 'ACTIVE',
    version: 1,
    priority: 70,
  }
];

describe('Phase C: Smart Rate Search & Auto Quote Building Tests', () => {

  // Test 1: Level 1 - Exact Customer Match
  test('Test 1: Level 1 Customer-Specific Rate is ranked first with highest priority', () => {
    const context: RateSearchContext = {
      transportMode: 'SEA_FCL',
      origin: 'Cat Lai Port',
      destination: 'Los Angeles',
      containerType: "40'HC",
      customerCode: 'CUST-SAMS-01',
      quotationDate: '2026-06-15',
    };

    const results = searchSmartRates(sampleRates, context);
    expect(results.activeMatches.length).toBeGreaterThan(0);
    const topMatch = results.activeMatches[0];
    expect(topMatch.rate.id).toBe('rate-cust-sam-01');
    expect(topMatch.priorityLevel).toBe(1);
    expect(topMatch.matchQuality).toBe('CUSTOMER_MATCH');
    expect(topMatch.matchScore).toBeGreaterThan(90);
  });

  // Test 2: Level 2 - Contract / Specific Rate
  test('Test 2: Level 2 Contract Rate is matched when no customer-specific rate applies', () => {
    const context: RateSearchContext = {
      transportMode: 'SEA_FCL',
      origin: 'Cat Lai',
      destination: 'Los Angeles',
      containerType: "40'HC",
      quotationDate: '2026-06-15',
    };

    const results = searchSmartRates(sampleRates, context);
    const contractMatch = results.activeMatches.find(r => r.rate.id === 'rate-contract-01');
    expect(contractMatch).toBeDefined();
    expect(contractMatch?.priorityLevel).toBe(2);
    expect(contractMatch?.matchQuality).toBe('CONTRACT_MATCH');
  });

  // Test 3: Level 3 - Carrier Match
  test('Test 3: Carrier filter specifically selects ONE carrier rate', () => {
    const context: RateSearchContext = {
      transportMode: 'SEA_FCL',
      origin: 'Cat Lai',
      destination: 'Los Angeles',
      containerType: "40'HC",
      carrier: 'ONE',
      quotationDate: '2026-06-15',
    };

    const results = searchSmartRates(sampleRates, context);
    const oneMatch = results.activeMatches.find(r => r.rate.carrier === 'ONE');
    expect(oneMatch).toBeDefined();
    expect(oneMatch?.rate.id).toBe('rate-one-40hc');
    expect(oneMatch?.matchScore).toBeGreaterThan(75);
  });

  // Test 4: Level 4 - Route Match
  test('Test 4: Route match properly identifies valid Cat Lai to LAX routes', () => {
    const context: RateSearchContext = {
      transportMode: 'SEA_FCL',
      origin: 'Cat Lai',
      destination: 'Los Angeles',
      quotationDate: '2026-06-15',
    };

    const results = searchSmartRates(sampleRates, context);
    expect(results.activeMatches.length).toBeGreaterThan(2);
  });

  // Test 5: Level 5 - General Rate Fallback
  test('Test 5: Mode only search returns general rates for that transport mode', () => {
    const context: RateSearchContext = {
      transportMode: 'INLAND_TRUCKING',
      quotationDate: '2026-06-15',
    };

    const results = searchSmartRates(sampleRates, context);
    expect(results.activeMatches.length).toBe(1);
    expect(results.activeMatches[0].rate.id).toBe('rate-truck-bd-catlai');
  });

  // Test 6: Date Validity - Active within range
  test('Test 6: Active rate within effective date range is valid', () => {
    const res = evaluateRateMatch(sampleRates[0], { quotationDate: '2026-05-01' });
    expect(res).toBeDefined();
    expect(res?.isValidForDate).toBe(true);
    expect(res?.isExpired).toBe(false);
  });

  // Test 7: Date Validity - Expired rate filtered out from active recommendations
  test('Test 7: Expired rate is flagged as expired and segregated', () => {
    const context: RateSearchContext = {
      transportMode: 'SEA_FCL',
      origin: 'Cat Lai',
      destination: 'Los Angeles',
      quotationDate: '2026-06-15',
    };

    const results = searchSmartRates(sampleRates, context);
    const expired = results.expiredMatches.find(r => r.rate.id === 'rate-expired-01');
    expect(expired).toBeDefined();
    expect(expired?.isValidForDate).toBe(false);
    expect(expired?.isExpired).toBe(true);

    // Expired item must NOT be in activeMatches
    const inActive = results.activeMatches.find(r => r.rate.id === 'rate-expired-01');
    expect(inActive).toBeUndefined();
  });

  // Test 8: Date Validity - Future date before effectiveFrom
  test('Test 8: Search with date outside range marks rate as not valid for date', () => {
    const res = evaluateRateMatch(sampleRates[0], { quotationDate: '2024-01-01' });
    expect(res?.isValidForDate).toBe(false);
  });

  // Test 9: FCL Strict Container Type Matching
  test('Test 9: FCL Container 20GP does NOT falsely match 40HC rate', () => {
    const context20: RateSearchContext = {
      transportMode: 'SEA_FCL',
      origin: 'Cat Lai',
      destination: 'Los Angeles',
      containerType: "20'GP",
      quotationDate: '2026-06-15',
    };

    const results20 = searchSmartRates(sampleRates, context20);
    const topMatch = results20.activeMatches[0];
    expect(topMatch.rate.containerType).toBe("20'GP");
    expect(topMatch.rate.id).toBe('rate-msk-20gp');
  });

  // Test 10: Air Freight Weight Break Matching
  test('Test 10: Air freight matches +500KG tier when chargeable weight is 600KG', () => {
    const contextAir: RateSearchContext = {
      transportMode: 'AIR_FREIGHT',
      origin: 'SGN',
      destination: 'LAX',
      chargeableWeight: 600,
      quotationDate: '2026-06-15',
    };

    const resultsAir = searchSmartRates(sampleRates, contextAir);
    expect(resultsAir.activeMatches.length).toBeGreaterThan(0);
    // +500KG rate should rank highest for 600KG shipment
    expect(resultsAir.activeMatches[0].rate.id).toBe('rate-air-sgn-lax-500');
  });

  // Test 11: Trucking Route Matching
  test('Test 11: Inland trucking matches route Binh Duong to Cat Lai', () => {
    const contextTruck: RateSearchContext = {
      transportMode: 'INLAND_TRUCKING',
      origin: 'Binh Duong',
      destination: 'Cat Lai',
      quotationDate: '2026-06-15',
    };

    const results = searchSmartRates(sampleRates, contextTruck);
    expect(results.activeMatches.length).toBe(1);
    expect(results.activeMatches[0].rate.id).toBe('rate-truck-bd-catlai');
  });

  // Test 12: Customs Clearance Location Matching
  test('Test 12: Customs clearance matches Cat Lai location', () => {
    const contextCustoms: RateSearchContext = {
      transportMode: 'CUSTOMS_CLEARANCE',
      origin: 'Cat Lai Port',
      quotationDate: '2026-06-15',
    };

    const results = searchSmartRates(sampleRates, contextCustoms);
    expect(results.activeMatches.length).toBe(1);
    expect(results.activeMatches[0].rate.id).toBe('rate-customs-catlai');
  });

  // Test 13: Automated Quote Building Scanner Groups
  test('Test 13: scanSmartRatesForQuote categorizes Main Freight, POL Local, Trucking, Customs', () => {
    const context: RateSearchContext = {
      transportMode: 'SEA_FCL',
      origin: 'Cat Lai Port',
      destination: 'Los Angeles',
      containerType: "40'HC",
      quotationDate: '2026-06-15',
    };

    const scan = scanSmartRatesForQuote(sampleRates, context);
    expect(scan.totalActiveMatches).toBeGreaterThan(3);
    expect(scan.hasExactFreightMatch).toBe(true);

    const freightGroup = scan.groups.find(g => g.categoryKey === 'MAIN_FREIGHT');
    const polGroup = scan.groups.find(g => g.categoryKey === 'POL_LOCAL');
    expect(freightGroup).toBeDefined();
    expect(polGroup).toBeDefined();
  });

  // Test 14: Rate Snapshot Immutability
  test('Test 14: convertRateToLineItemSnapshot preserves rate details in LineItem', () => {
    const rate = sampleRates[0];
    const shipment: ShipmentDetails = {
      mode: 'SEA_FCL',
      pol: 'Cat Lai Port, Vietnam',
      pod: 'Los Angeles, USA',
      containerType: "40'HC",
      quantity: 2,
      grossWeightKg: 20000,
      volumeCbm: 60,
      chargeableWeight: 60,
    };

    const item = convertRateToLineItemSnapshot(rate, shipment, 25400);
    expect(item.rateId).toBe('rate-cust-sam-01');
    expect(item.rateCode).toBe('SEA-SAMS-40HC-01');
    expect(item.rateVersion).toBe(1);
    expect(item.quantity).toBe(2);
    expect(item.unitPrice).toBe(1450);
    expect(item.costPrice).toBe(1200);
    expect(item.amountUsd).toBe(2900);
    expect(item.costTotalUsd).toBe(2400);
    expect(item.profitUsd).toBe(500);
  });

  // Test 15: Rate Refresh & Comparison Diff
  test('Test 15: compareLineItemWithLiveRate identifies price & version changes', () => {
    const currentItem: LineItem = {
      id: 'item-quote-01',
      category: 'FREIGHT',
      code: 'O/F',
      description: 'Ocean Freight',
      quantity: 1,
      unitPrice: 1450, // Old price
      costPrice: 1200,
      currency: 'USD',
      amountUsd: 1450,
      amountVnd: 1450 * 25400,
      rateId: 'rate-cust-sam-01',
      rateCode: 'SEA-SAMS-40HC-01',
      rateVersion: 1,
    };

    // Live Master Rate updated to version 2 with price increase to 1600 USD
    const updatedLiveRate: RateMasterItem = {
      ...sampleRates[0],
      version: 2,
      sellingAmount: 1600,
      costAmount: 1300,
    };

    const diff = compareLineItemWithLiveRate(currentItem, updatedLiveRate);
    expect(diff.hasChanges).toBe(true);
    expect(diff.diffSellAmount).toBe(150); // 1600 - 1450 = +150 USD
    expect(diff.latestUnitPrice).toBe(1600);

    // Apply the update
    const refreshedItem = applyLiveRateToLineItem(currentItem, updatedLiveRate, undefined, 25400);
    expect(refreshedItem.unitPrice).toBe(1600);
    expect(refreshedItem.costPrice).toBe(1300);
    expect(refreshedItem.rateVersion).toBe(2);
  });

  // Test 16: Manual Override Tracking
  test('Test 16: recordLineItemOverride marks item as overridden without altering Rate Master', () => {
    const originalItem: LineItem = {
      id: 'item-quote-02',
      category: 'FREIGHT',
      code: 'O/F',
      description: 'Ocean Freight',
      quantity: 1,
      unitPrice: 1450,
      costPrice: 1200,
      currency: 'USD',
      amountUsd: 1450,
      amountVnd: 1450 * 25400,
      rateId: 'rate-cust-sam-01',
      rateCode: 'SEA-SAMS-40HC-01',
      rateVersion: 1,
    };

    const overridden = recordLineItemOverride(
      originalItem,
      1380, // Sales discounted from 1450 to 1380
      1150,
      'Special discount approved by Director',
      'Sales Director',
      undefined,
      25400
    );

    expect(overridden.unitPrice).toBe(1380);
    expect(overridden.costPrice).toBe(1150);
    expect(overridden.isOverridden).toBe(true);
    expect(overridden.originalUnitPrice).toBe(1450);
    expect(overridden.originalCostPrice).toBe(1200);
    expect(overridden.overrideReason).toBe('Special discount approved by Director');
    expect(overridden.overriddenBy).toBe('Sales Director');

    // Verify sampleRates in database are intact
    expect(sampleRates[0].sellingAmount).toBe(1450);
    expect(sampleRates[0].costAmount).toBe(1200);
  });

});
