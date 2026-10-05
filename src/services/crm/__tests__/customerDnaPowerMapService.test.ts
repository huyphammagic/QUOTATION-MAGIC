/**
 * Phase 63: Customer Logistics DNA & Buying Center Power Map Service Test Suite
 */

import { CustomerDnaPowerMapService, PRESEEDED_CUSTOMER_DNA_PROFILES } from '../customerDnaPowerMapService';
import { OrgPowerContact, ShipperSensitivityScores } from '../../../types/customerDnaPowerMap';

// Simple Assert Helper
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('--- RUNNING CUSTOMER DNA & POWER MAP SERVICE TESTS ---');

// Test 1: Preseeded profiles retrieval
const profiles = CustomerDnaPowerMapService.getProfiles();
assert(profiles.length >= 3, `Expected at least 3 preseeded profiles, found: ${profiles.length}`);
console.log('✓ Test 1: Profiles successfully loaded:', profiles.length);

// Test 2: Find profile by customer name fuzzy match
const seafoodProfile = CustomerDnaPowerMapService.getProfileByCustomerName('Thủy Sản Biển Đông');
assert(!!seafoodProfile, 'Expected to find seafood profile');
assert(seafoodProfile?.personaType === 'RELIABILITY_FIRST', 'Expected RELIABILITY_FIRST persona');
console.log('✓ Test 2: Fuzzy match find by name passed:', seafoodProfile?.customerName);

// Test 3: Auto analyze persona based on scores
const priceHunterScores: ShipperSensitivityScores = {
  priceSensitivity: 9,
  transitTimeSensitivity: 3,
  freeTimeDemDetSensitivity: 6,
  creditTermSensitivity: 4,
  customsReliabilitySensitivity: 5
};
const analysis = CustomerDnaPowerMapService.autoAnalyzePersona(priceHunterScores);
assert(analysis.personaType === 'PRICE_HUNTER', 'Expected PRICE_HUNTER persona for high price sensitivity');
console.log('✓ Test 3: Auto analysis for price sensitivity passed:', analysis.labelVi);

// Test 4: Add new contact to power map
if (seafoodProfile) {
  const newContact: OrgPowerContact = {
    id: `contact-test-${Date.now()}`,
    name: 'Anh Hoàng Văn Tuấn',
    title: 'Phó Phòng Kỹ Thuật & Bảo Quản',
    department: 'FACTORY_OPS',
    roleInDeal: 'INFLUENCER',
    influenceLevel: 6,
    personalityStyle: 'CONSCIENTIOUS',
    stanceTowardUs: 'LEANING_POSITIVE',
    personalPainPoint: 'Lo lắng về nhiệt độ container bảo quản -20C',
    hiddenAgenda: 'Muốn có báo cáo nhiệt độ tự động không phải chép tay',
    preferredChannel: 'ZALO',
    notes: 'Rất chu đáo, hay hỏi kỹ về loại máy lạnh Daikin hay Carrier'
  };

  const updatedProfile = CustomerDnaPowerMapService.addPowerMapContact(seafoodProfile.id, newContact);
  assert(
    !!updatedProfile?.powerMapContacts.some(c => c.name === 'Anh Hoàng Văn Tuấn'),
    'Expected newly added contact in powerMapContacts'
  );
  console.log('✓ Test 4: Add contact to power map passed');
}

// Test 5: Generate instant Zalo & Call scripts
if (seafoodProfile && seafoodProfile.powerMapContacts.length > 0) {
  const primaryContact = seafoodProfile.powerMapContacts[0];
  const zaloScript = CustomerDnaPowerMapService.generateInstantScript(seafoodProfile, primaryContact, 'ZALO');
  assert(zaloScript.content.length > 20, 'Expected non-empty Zalo script');
  assert(zaloScript.title.includes(primaryContact.title), 'Script title should mention contact title');

  const callScript = CustomerDnaPowerMapService.generateInstantScript(seafoodProfile, primaryContact, 'CALL');
  assert(callScript.content.includes('MỞ ĐẦU THU HÚT'), 'Expected phone script structure');
  assert(callScript.content.includes(primaryContact.title), 'Call script content should mention title');
  console.log('✓ Test 5: Instant script generation passed (Zalo & Call)');
}

console.log('--- ALL CUSTOMER DNA & POWER MAP TESTS PASSED SUCCESSFULLY! ---');
