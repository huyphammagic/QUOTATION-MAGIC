/**
 * Automated Test Suite for Quotation-to-Customer Validation & 1-Click Repair Engine
 */

import { 
  generateQuotationCustomerValidationReport,
  executeOneClickRepair,
  exportValidationReportAsText,
  exportValidationReportAsCsv,
} from '../quotationCustomerValidationService';
import { QuoteData, CustomerRecord } from '../../../types/logistics';

async function runQuotationCustomerValidationTests() {
  console.log('🚀 Running Quotation-to-Customer Validation & 1-Click Repair Suite...\n');

  // Test Fixtures
  const crmCustomers: CustomerRecord[] = [
    {
      id: 'cust_valid_001',
      code: 'KH-001',
      companyName: 'Công ty Cổ phần Thủy Sản Biển Đông',
      customerName: 'Chị Lan - Trưởng phòng XNK',
      taxId: '0301234567',
      address: 'Quận 7, TP.HCM',
      email: 'lan@biendongseafood.vn',
      phone: '0903123456',
      contactPerson: 'Nguyễn Thị Lan',
      group: 'Khách VIP',
      segment: 'VIP',
      isUserCreated: true,
      syncSource: 'CRM',
      createdDate: '2026-01-10',
      updatedDate: '2026-01-10',
    },
    {
      id: 'cust_valid_002',
      code: 'KH-002',
      companyName: 'Tập Đoàn Dệt May Quốc Tế An Phát',
      customerName: 'Anh Dũng - Giám đốc Mua Hàng',
      taxId: '0109876543',
      address: 'KCN Sài Đồng, Hà Nội',
      email: 'dung@anphatgarment.vn',
      phone: '0912345678',
      contactPerson: 'Trần Văn Dũng',
      group: 'Khách Thương Mại',
      segment: 'STANDARD',
      isUserCreated: true,
      syncSource: 'CRM',
      createdDate: '2026-02-15',
      updatedDate: '2026-02-15',
    }
  ];

  const quotations: QuoteData[] = ([
    // 1. Valid linked quotation
    {
      id: 'quote_valid_1',
      quoteNumber: 'LOG-2026-0001',
      status: 'APPROVED',
      createdDate: '2026-03-01',
      grandTotalUsd: 2500,
      grandTotalVnd: 63500000,
      customer: {
        id: 'cust_valid_001',
        code: 'KH-001',
        companyName: 'Công ty Cổ phần Thủy Sản Biển Đông',
        customerName: 'Chị Lan',
        taxId: '0301234567',
        address: 'Quận 7, TP.HCM',
        email: 'lan@biendongseafood.vn',
        phone: '0903123456',
        contactPerson: 'Nguyễn Thị Lan',
      },
      items: [],
      terms: {
        incoterm: 'FOB',
        validityDate: '2026-04-01',
        paymentTerm: 'Prepaid',
        exclusionsNotes: '',
        bankAccountInfo: '',
      },
    },
    // 2. Mismatched ID but matching Tax ID (Orphan with candidate)
    {
      id: 'quote_mismatched_tax',
      quoteNumber: 'LOG-2026-0002',
      status: 'DRAFT',
      createdDate: '2026-03-05',
      grandTotalUsd: 1800,
      grandTotalVnd: 45720000,
      customer: {
        id: 'old_deleted_id_999', // Non-existent in CRM
        customerName: 'Công ty Dệt May An Phát',
        companyName: 'Công ty Dệt May An Phát',
        taxId: '0109876543', // Matches cust_valid_002!
        address: 'Hà Nội',
        email: 'info@anphat.vn',
        phone: '0912345678',
        contactPerson: 'Anh Dũng',
      },
      items: [],
      terms: {
        incoterm: 'CIF',
        validityDate: '2026-04-05',
        paymentTerm: 'Prepaid',
        exclusionsNotes: '',
        bankAccountInfo: '',
      },
    },
    // 3. Non-existent Customer ID with business details (Unregistered in CRM)
    {
      id: 'quote_unregistered',
      quoteNumber: 'LOG-2026-0003',
      status: 'SENT',
      createdDate: '2026-03-10',
      grandTotalUsd: 3200,
      grandTotalVnd: 81280000,
      customer: {
        id: 'cust_temp_ghost_888',
        companyName: 'Công ty TNHH Cà Phê Tây Nguyên Xanh',
        customerName: 'Công ty TNHH Cà Phê Tây Nguyên Xanh',
        taxId: '6001239999',
        address: 'Đắk Lắk',
        email: 'xnk@taynguyencoffee.vn',
        phone: '0988999888',
        contactPerson: 'Lê Hoàng Nam',
      },
      items: [],
      terms: {
        incoterm: 'FOB',
        validityDate: '2026-04-10',
        paymentTerm: 'Prepaid',
        exclusionsNotes: '',
        bankAccountInfo: '',
      },
    },
    // 4. Completely missing customer ID
    {
      id: 'quote_missing_id',
      quoteNumber: 'LOG-2026-0004',
      status: 'DRAFT',
      createdDate: '2026-03-12',
      grandTotalUsd: 950,
      grandTotalVnd: 24130000,
      customer: {
        companyName: 'Hạt Điều Xuất Khẩu Bình Phước',
        customerName: 'Hạt Điều Xuất Khẩu Bình Phước',
        taxId: '',
        address: 'Bình Phước',
        email: 'info@binhphuoccash.vn',
        phone: '0977112233',
        contactPerson: 'Anh Tuấn',
      },
      items: [],
      terms: {
        incoterm: 'EXW',
        validityDate: '2026-04-12',
        paymentTerm: 'Prepaid',
        exclusionsNotes: '',
        bankAccountInfo: '',
      },
    }
  ] as unknown) as QuoteData[];

  // Test 1: Generate Validation Report
  console.log('1. Testing Validation Report Generation...');
  const report = generateQuotationCustomerValidationReport(quotations, crmCustomers);
  
  if (report.totalQuotationsChecked !== 4) {
    throw new Error(`Expected 4 quotes checked, got ${report.totalQuotationsChecked}`);
  }
  if (report.validLinkedCount !== 1) {
    throw new Error(`Expected 1 valid quote, got ${report.validLinkedCount}`);
  }
  if (report.orphanedCount !== 3) {
    throw new Error(`Expected 3 orphaned records, got ${report.orphanedCount}`);
  }
  if (report.integrityScore !== 25) {
    throw new Error(`Expected integrity score 25%, got ${report.integrityScore}%`);
  }
  console.log(`   ✅ Validation report generated: Checked 4 quotes, Found ${report.orphanedCount} orphans, Score: ${report.integrityScore}%`);

  // Test 2: Verify Root Cause Diagnostics
  console.log('2. Verifying Root Cause Categorization...');
  const mismatchedOrphan = report.orphanedRecords.find(r => r.quoteId === 'quote_mismatched_tax');
  if (!mismatchedOrphan || mismatchedOrphan.orphanReason !== 'MISMATCHED_NAME_OR_TAX') {
    throw new Error('Mismatched tax ID orphan not categorized properly');
  }
  if (!mismatchedOrphan.matchCandidate || mismatchedOrphan.matchCandidate.id !== 'cust_valid_002') {
    throw new Error('Match candidate for mismatched tax was not identified');
  }
  console.log(`   ✅ Correctly matched candidate: ${mismatchedOrphan.matchCandidate.companyName}`);

  const unregisteredOrphan = report.orphanedRecords.find(r => r.quoteId === 'quote_unregistered');
  if (!unregisteredOrphan || unregisteredOrphan.suggestedAction !== 'AUTO_CREATE_CRM_CUSTOMER') {
    throw new Error('Unregistered customer action not suggested as AUTO_CREATE_CRM_CUSTOMER');
  }
  console.log(`   ✅ Correctly diagnosed unregistered customer with AUTO_CREATE suggestion`);

  // Test 3: One-Click Auto Repair Execution
  console.log('3. Testing 1-Click Auto-Repair Engine...');
  const repairResult = await executeOneClickRepair(
    report.orphanedRecords,
    quotations,
    crmCustomers,
    { userId: 'Automated Test Runner' }
  );

  if (repairResult.repairedCount !== 3) {
    throw new Error(`Expected 3 repaired items, got ${repairResult.repairedCount}`);
  }
  if (repairResult.newCustomersCreated.length !== 2) {
    throw new Error(`Expected 2 new customers created in CRM, got ${repairResult.newCustomersCreated.length}`);
  }

  // Verify repaired quote has new customer ID
  const repairedMismatchedQuote = repairResult.fixedQuotes.find(q => q.id === 'quote_mismatched_tax');
  if (!repairedMismatchedQuote || repairedMismatchedQuote.customer?.id !== 'cust_valid_002') {
    throw new Error('Mismatched quote was not re-linked to candidate ID cust_valid_002');
  }

  // Test 4: Re-validation after repair
  console.log('4. Re-validating after 1-Click Repair...');
  const updatedCustomers = [...crmCustomers, ...repairResult.newCustomersCreated];
  const postRepairReport = generateQuotationCustomerValidationReport(repairResult.fixedQuotes, updatedCustomers);

  if (postRepairReport.orphanedCount !== 0) {
    throw new Error(`Post-repair orphaned count should be 0, got ${postRepairReport.orphanedCount}`);
  }
  if (postRepairReport.integrityScore !== 100) {
    throw new Error(`Post-repair integrity score should be 100%, got ${postRepairReport.integrityScore}%`);
  }
  console.log(`   ✅ Post-repair integrity: 100% (0 orphans, ${postRepairReport.validLinkedCount} valid linked)`);

  // Test 5: Exporting Reports
  console.log('5. Testing Export Formats (Text & CSV)...');
  const textReport = exportValidationReportAsText(report);
  if (!textReport.includes('BÁO CÁO ĐỐI SOÁT TOÀN VẸN DỮ LIỆU') || !textReport.includes('LOG-2026-0002')) {
    throw new Error('Text report output format invalid');
  }

  const csvReport = exportValidationReportAsCsv(report);
  if (!csvReport.includes('Số Báo Giá') || !csvReport.includes('LOG-2026-0002')) {
    throw new Error('CSV report output format invalid');
  }
  console.log(`   ✅ Text report (${textReport.length} chars) and CSV report (${csvReport.length} chars) generated successfully`);

  console.log('\n🎉 ALL QUOTATION-TO-CUSTOMER VALIDATION & 1-CLICK REPAIR TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runQuotationCustomerValidationTests().catch(err => {
  console.error('❌ Validation Test Failed:', err);
  process.exit(1);
});
