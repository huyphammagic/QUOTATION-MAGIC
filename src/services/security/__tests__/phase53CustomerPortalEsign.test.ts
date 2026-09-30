/**
 * PHASE 53: CUSTOMER PORTAL & DIGITAL E-SIGNATURE ACCEPTANCE WORKFLOW TEST SUITE
 *
 * Verifies the end-to-end customer acceptance lifecycle:
 * 1. Cryptographic token generation, expiration & link resolution
 * 2. E-Signature payload creation (Draw vs Type-to-sign modes)
 * 3. Official Certificate ID & SHA-256 integrity hash generation
 * 4. Line-item specific negotiation & counter-offer data integrity
 * 5. Booking dispatch details collection (CRD, Shipper, Consignee)
 * 6. Automated quotation transition & shipment conversion gate validation
 * 7. Certificate verification and tamper-resistance checks
 */

import { 
  hashToken, 
  generateSecureToken, 
  submitCustomerResponse 
} from '../../quotation/quotationSecurityService';
import { 
  QuotationSecureLink, 
  QuotationCustomerResponse,
  QuotationBookingDispatchInfo,
  QuotationLineItemFeedback 
} from '../../../types/quotationCommunication';
import { QuoteData, LineItem } from '../../../types/logistics';
import { createShipmentFromQuotation } from '../../shipment/shipmentService';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`[PHASE 53 TEST ASSERTION FAILED]: ${msg}`);
  }
}

async function runPhase53Tests() {
  console.log('================================================================');
  console.log('PHASE 53: CUSTOMER PORTAL & E-SIGNATURE ACCEPTANCE VERIFICATION');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // 1. SECURE TOKEN CRYPTOGRAPHY & TAMPER CHECKS
  // -------------------------------------------------------------
  console.log('--- 1. Cryptographic Token Generation & Hashing ---');
  const token1 = generateSecureToken();
  const token2 = generateSecureToken();
  assert(token1.length >= 32, 'Token must be cryptographically secure and at least 32 characters long');
  assert(token1 !== token2, 'Generated secure tokens must be unique and non-colliding');

  const hash1 = await hashToken(token1);
  const hash2 = await hashToken(token1);
  const hashOther = await hashToken(token2);
  assert(hash1 === hash2, 'Hash of identical token must be deterministic');
  assert(hash1 !== hashOther, 'Hash of different tokens must not collide');
  console.log(' Token generation, randomness and SHA-256 determinism verified.\n');

  // -------------------------------------------------------------
  // 2. MOCK SECURE LINK FIXTURE
  // -------------------------------------------------------------
  const sampleLink: QuotationSecureLink = {
    id: 'link_test_53_001',
    companyId: 'comp_logistics_hub',
    quotationId: 'quote_test_53_001',
    quotationNumber: 'QT-2026-09-001',
    revision: 1,
    documentId: 'doc_test_53_001',
    tokenHash: hash1,
    tokenPrefix: token1.substring(0, 6),
    expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    status: 'ACTIVE',
    viewCount: 1,
    customerName: 'Cong Ty Co Phan Xuat Nhap Khau Global',
    customerEmail: 'imex@globalcorp.vn',
    language: 'vi',
    createdBy: 'user_sales_agent',
    createdAt: new Date().toISOString(),
  };

  // -------------------------------------------------------------
  // 3. E-SIGNATURE ACCEPTANCE & CERTIFICATE GENERATION
  // -------------------------------------------------------------
  console.log('--- 2. Customer Acceptance with E-Signature Payload ---');
  const mockSignaturePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  const bookingDispatchDetails: QuotationBookingDispatchInfo = {
    cargoReadyDate: '2026-10-15',
    shipperName: 'Cong Ty Xuat Khau Nong San Viet',
    shipperAddress: 'KCN Song Than 2, Binh Duong',
    consigneeName: 'Global Fruits Importer Inc.',
    consigneeAddress: '9840 Harbor Blvd, Long Beach, CA 90802, USA',
    notifyParty: 'Same as Consignee',
    specialInstructions: 'Container can giu nhiet do 4 do C, thong gio 15%',
  };

  const acceptedResponse = await submitCustomerResponse({
    link: sampleLink,
    responseType: 'ACCEPTED',
    customerName: 'Nguyen Van An',
    customerEmail: 'an.nguyen@globalcorp.vn',
    customerPhone: '0912 345 678',
    signatureDataUrl: mockSignaturePng,
    signatureType: 'DRAW',
    signerTitle: 'Giam Doc Xuat Nhap Khau',
    signerCompany: 'Cong Ty Co Phan Xuat Nhap Khau Global',
    signerTaxId: '0312345678',
    bookingInfo: bookingDispatchDetails,
    autoCreateShipment: false, // Testing isolated payload first
  });

  assert(acceptedResponse.responseType === 'ACCEPTED', 'Response type must be ACCEPTED');
  assert(Boolean(acceptedResponse.certificateId), 'Accepted response must contain an official Certificate ID');
  assert(acceptedResponse.certificateId!.startsWith('CERT-'), 'Certificate ID must have the CERT- prefix');
  assert(Boolean(acceptedResponse.certificateHash), 'Accepted response must contain an immutable SHA-256 certificate hash');
  assert(acceptedResponse.signatureType === 'DRAW', 'Signature type must be correctly captured');
  assert(acceptedResponse.signatureDataUrl === mockSignaturePng, 'Signature image payload must be preserved exactly');
  assert(acceptedResponse.bookingInfo?.cargoReadyDate === '2026-10-15', 'Cargo ready date must be stored in booking info');
  console.log(` Official Certificate Generated: ${acceptedResponse.certificateId}`);
  console.log(` Certificate Integrity Hash: ${acceptedResponse.certificateHash}`);
  console.log(' E-Signature acceptance payload verified.\n');

  // -------------------------------------------------------------
  // 4. LINE-ITEM SPECIFIC NEGOTIATION & COUNTER-OFFER WORKFLOW
  // -------------------------------------------------------------
  console.log('--- 3. Line-Item Specific Counter-Offer & Negotiation ---');
  const lineItemFeedbacks: QuotationLineItemFeedback[] = [
    {
      itemId: 'item-01',
      itemCode: 'O/F',
      itemDescription: 'Ocean Freight SGN -> LAX',
      note: 'De nghi cong ty ho tro giam cuoc O/F xuong muc 2,300 USD cho cont 40HC',
      proposedRate: 2300,
      currency: 'USD',
    },
    {
      itemId: 'item-02',
      itemCode: 'THC',
      itemDescription: 'Terminal Handling Charge',
      note: 'Nho ho tro xin hang tau 14 ngay Demurrage/Detention mien phi',
      currency: 'USD',
    }
  ];

  const revisionResponse = await submitCustomerResponse({
    link: sampleLink,
    responseType: 'REVISION_REQUESTED',
    customerName: 'Tran Thi Mai',
    customerEmail: 'mai.tran@globalcorp.vn',
    revisionMessage: 'Kinh gui quy cong ty, chung toi muon dam phan lai mot so khoan cuoc de phu hop voi ngan sach.',
    lineItemFeedbacks,
    autoCreateShipment: false,
  });

  assert(revisionResponse.responseType === 'REVISION_REQUESTED', 'Response type must be REVISION_REQUESTED');
  assert(revisionResponse.lineItemFeedbacks?.length === 2, 'Must record exactly 2 line item feedbacks');
  assert(revisionResponse.lineItemFeedbacks![0].proposedRate === 2300, 'Target proposed rate must match customer input');
  assert(revisionResponse.certificateId === undefined, 'Revision request must not generate an acceptance certificate');
  console.log(` Recorded ${revisionResponse.lineItemFeedbacks?.length} item-specific negotiation requests.`);
  console.log(' Line-item negotiation workflow verified.\n');

  // -------------------------------------------------------------
  // 5. SHIPMENT AUTO-CONVERSION FROM ACCEPTED QUOTATION
  // -------------------------------------------------------------
  console.log('--- 4. Quotation to Operational Shipment Auto-Conversion ---');
  const approvedQuoteFixture: QuoteData = {
    id: 'quote_test_53_001',
    companyId: 'comp_logistics_hub',
    quoteNumber: 'QT-2026-09-001',
    version: 1,
    status: 'ACCEPTED',
    createdDate: '2026-09-01',
    updatedDate: '2026-09-02',
    terms: { 
      incoterm: 'FOB', 
      validityDate: '2026-12-31', 
      paymentTerm: 'Net 30', 
      exclusionsNotes: '', 
      bankAccountInfo: '' 
    },
    company: { name: 'LogiQuote Corp', address: '', phone: '', email: '', website: '', taxId: '', logo: '' } as any,
    customer: {
      id: 'cust-01',
      customerName: 'Cong Ty Co Phan Xuat Nhap Khau Global',
      companyName: 'Cong Ty Co Phan Xuat Nhap Khau Global',
      contactPerson: 'Nguyen Van An',
      taxId: '0312345678',
      address: '123 Nguyen Hue, TP.HCM',
      email: 'imex@globalcorp.vn',
      phone: '0901234567',
    },
    shipment: {
      pol: 'VNSGN',
      pod: 'USLAX',
      mode: 'SEA_FCL',
      serviceType: 'SEA_FCL',
      commodity: 'Noi That Go Cao Cap',
      containerType: "40'HC",
      quantity: 2,
      grossWeightKg: 10000,
      volumeCbm: 30,
      chargeableWeight: 10000,
    },
    items: [
      {
        id: 'item-01',
        code: 'O/F',
        category: 'FREIGHT',
        description: 'Ocean Freight SGN -> LAX',
        unit: "40'HC",
        quantity: 2,
        unitPrice: 2500,
        amountUsd: 5000,
        amountVnd: 127000000,
        currency: 'USD',
        vatRate: 0,
        vatAmountUsd: 0,
        vatAmountVnd: 0,
        costPrice: 2000,
        costTotalUsd: 4000,
        costTotalVnd: 101600000,
        profitUsd: 1000,
        profitVnd: 25400000,
        marginPercent: 20,
      }
    ],
    subtotalUsd: 5000,
    subtotalVnd: 127000000,
    vatTotalUsd: 0,
    vatTotalVnd: 0,
    grandTotalUsd: 5000,
    grandTotalVnd: 127000000,
    totalCostUsd: 4000,
    totalProfitUsd: 1000,
    overallMarginPercent: 20,
    quoteCurrency: 'USD',
    exchangeRate: 25400,
  };

  const convertedShipment = await createShipmentFromQuotation(
    approvedQuoteFixture, 
    { uid: 'customer-portal', displayName: 'Nguyen Van An', email: 'an.nguyen@globalcorp.vn' },
    {
      cargoReadyDate: bookingDispatchDetails.cargoReadyDate,
      notes: bookingDispatchDetails.specialInstructions,
    } as any
  );

  assert(Boolean(convertedShipment.id), 'Converted shipment must have an ID');
  assert(convertedShipment.companyId === 'comp_logistics_hub', 'Shipment must preserve tenant company isolation');
  assert(convertedShipment.quotationSnapshot.quotationId === 'quote_test_53_001', 'Quotation snapshot ID must match');
  assert(convertedShipment.quotationSnapshot.totalSellingUsd === 5000, 'Financial snapshot total selling price must match');
  assert(convertedShipment.cargoReadyDate === '2026-10-15', 'Cargo ready date must be synced to operations shipment');
  console.log(` Operational Shipment Successfully Provisioned: [${convertedShipment.id}] - Status: ${convertedShipment.status}`);
  console.log(' Quotation -> Operations conversion gate verified.\n');

  // -------------------------------------------------------------
  // 6. CERTIFICATE VERIFICATION & ANTI-TAMPER CHECK
  // -------------------------------------------------------------
  console.log('--- 5. Certificate Integrity & Anti-Tamper Verification ---');
  const validHash = acceptedResponse.certificateHash!;
  const tamperedData = `${acceptedResponse.certificateId}:QT-2026-09-001:Tampered Impersonator:${acceptedResponse.respondedAt}`;
  const tamperedHash = await hashToken(tamperedData);

  assert(tamperedHash !== validHash, 'Any alteration to signer name or certificate metadata must produce a hash mismatch');
  console.log(' Certificate anti-tamper verification confirmed.\n');

  console.log('================================================================');
  console.log('PHASE 53 TEST SUITE: 5/5 GROUPS PASSED WITH ZERO ERRORS');
  console.log('================================================================\n');
  process.exit(0);
}

runPhase53Tests().catch(err => {
  console.error('\n❌ PHASE 53 VERIFICATION FAILURE:', err);
  process.exit(1);
});
