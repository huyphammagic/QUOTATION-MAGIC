/**
 * Logistics Quotation Management Platform - Phase 58 Test Suite
 * Customer Re-engagement & Lane Replenishment Radar
 */

import { 
  SAMPLE_DORMANT_CUSTOMERS, 
  generateReEngagementPitch, 
  convertDormantAlertToQuote,
  markAlertContacted,
  getLocalReengagementAlerts
} from '../customerReengagementService';
import { CompanyProfile } from '../../../types/logistics';

async function runCustomerReengagementTests() {
  console.log('🚀 Running Phase 58 Customer Re-engagement & Lane Replenishment Verification Suite...\n');

  // Test 1: Sample Dormant Customers
  console.log('1. Verifying Dormant Customers Catalog...');
  if (SAMPLE_DORMANT_CUSTOMERS.length < 3) {
    throw new Error('Not enough sample dormant customers');
  }
  const seafoodCust = SAMPLE_DORMANT_CUSTOMERS[0];
  console.log(`   ✅ Sample loaded: ${seafoodCust.companyName} (${seafoodCust.healthStatus}, Risk Score: ${seafoodCust.riskScore}/100, Days since quote: ${seafoodCust.daysSinceLastQuote})`);

  // Test 2: Multi-Channel Pitch Generation (Zalo, Email, WhatsApp)
  console.log('2. Verifying Multi-Channel Pitch Generator...');
  const zaloPitch = generateReEngagementPitch(seafoodCust, 'ZALO');
  const emailPitch = generateReEngagementPitch(seafoodCust, 'EMAIL');
  const whatsappPitch = generateReEngagementPitch(seafoodCust, 'WHATSAPP');

  if (!zaloPitch.messageContent.includes(seafoodCust.suggestedOffer.code)) {
    throw new Error('Zalo pitch missing offer code');
  }
  if (!emailPitch.messageContent.includes('Kính gửi') || !whatsappPitch.messageContent.includes('Hello')) {
    throw new Error('Pitch message format invalid');
  }
  console.log(`   ✅ Zalo Pitch generated (${zaloPitch.messageContent.length} chars)`);
  console.log(`   ✅ Email Pitch generated (${emailPitch.messageContent.length} chars)`);
  console.log(`   ✅ WhatsApp Pitch generated (${whatsappPitch.messageContent.length} chars)`);

  // Test 3: 1-Click Re-Quote Conversion
  console.log('3. Verifying 1-Click Re-Quote Converter...');
  const dummyCompany: CompanyProfile = {
    companyId: 'company_profile',
    name: 'CÔNG TY LOGISTICS QUỐC TẾ',
    englishName: 'GLOBAL LOGISTICS CORP',
    taxId: '0314999888',
    address: 'Tòa nhà Logistics Hub, Quận 1, TP.HCM',
    phone: '028.3888.9999',
    email: 'pricing@globallogistics.vn',
    website: 'https://globallogistics.vn',
    bankName: 'Vietcombank',
    bankAccountNo: '0071001234567',
    bankAccountHolder: 'CONG TY LOGISTICS QUOC TE',
    bankSwiftCode: 'BFTVVNVX',
    salesRepName: 'Nguyễn Văn Sales',
    salesRepTitle: 'Trưởng phòng Báo giá',
    salesRepPhone: '0909.123.456',
    salesRepEmail: 'sales@globallogistics.vn'
  };

  const generatedQuote = convertDormantAlertToQuote({
    alert: seafoodCust,
    companyProfile: dummyCompany,
    exchangeRate: 25400
  });

  if (!generatedQuote.quoteNumber || generatedQuote.items.length === 0 || generatedQuote.grandTotalUsd <= 0) {
    throw new Error('Generated quote is invalid');
  }
  if (!generatedQuote.items[0].description.includes(seafoodCust.suggestedOffer.code)) {
    throw new Error('Generated quote line item missing reactivation code');
  }
  console.log(`   ✅ Re-Quote Created: ${generatedQuote.quoteNumber}, Total: $${generatedQuote.grandTotalUsd.toLocaleString()}, Items: ${generatedQuote.items.length}`);

  // Test 4: Outreach tracking
  console.log('4. Verifying Outreach Status Tracking...');
  await markAlertContacted(seafoodCust.id, 'ZALO');
  const alerts = getLocalReengagementAlerts();
  const updatedItem = alerts.find(a => a.id === seafoodCust.id);
  if (!updatedItem || updatedItem.outreachStatus !== 'SENT') {
    throw new Error('Outreach status was not updated');
  }
  console.log(`   ✅ Customer ${updatedItem.companyName} marked as SENT via ${updatedItem.outreachChannel}`);

  console.log('\n🎉 All Phase 58 Customer Re-engagement & Lane Replenishment tests passed successfully!');
}

runCustomerReengagementTests().catch(err => {
  console.error('❌ Phase 58 Verification Failed:', err);
  process.exit(1);
});
