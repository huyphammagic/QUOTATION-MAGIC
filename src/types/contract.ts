import { Currency, FeeCategory, ChargeLocation, TransportMode, ContainerType, IncotermCode } from './logistics';
import { ChargeBasis } from './pricing';

export type ContractType = 'CUSTOMER' | 'SUPPLIER';

export type ContractStatus = 
  | 'DRAFT' 
  | 'IN_REVIEW' 
  | 'APPROVED' 
  | 'ACTIVE' 
  | 'EXPIRED' 
  | 'SUSPENDED' 
  | 'CANCELLED';

export type ContractServiceMode = 'SEA' | 'AIR' | 'TRUCKING' | 'CUSTOMS' | 'WAREHOUSING' | 'MULTIMODAL' | 'ALL';

export interface ContractVolumeTier {
  id: string;
  tierLabel: string;
  minVolume: number;
  maxVolume?: number;
  unit: string; // TEU, CBM, KGS, Trips, Declarations
  discountPercent?: number;
  specialRateUsd?: number;
}

export interface ContractVolumeCommitment {
  period: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'TOTAL';
  targetTeu?: number;
  targetWeightTon?: number;
  targetCbm?: number;
  minVolume?: number;
  maxVolume?: number;
  tiers?: ContractVolumeTier[];
  penaltyOrIncentiveNotes?: string;
}

export interface ContractCommercialTerms {
  freeTimeDays?: number;
  freeTimeDetails?: string; // e.g. "14 days Demurrage & Detention combined at Cat Lai"
  demurrageTerms?: string;
  detentionTerms?: string;
  paymentTerms: string;     // e.g. "Net 30 days from B/L date"
  creditDays: number;       // e.g. 30
  creditLimit: number;      // e.g. 50000 (USD)
  creditCurrency: Currency; // USD | VND
  validityConditions?: string;
  specialInstructions?: string;
  customerNotes?: string;
  supplierNotes?: string;
}

export interface ContractItem {
  id: string;
  companyId: string;
  contractNumber: string;   // e.g. CTR-CUST-2026-001, CTR-SUPP-MSC-2026-01
  contractType: ContractType;
  partyId: string;          // customerId or supplierId
  partyName: string;        // Customer company name or Supplier name
  partyCode: string;        // Customer code or Supplier code
  contractName: string;     // Short descriptive name
  contractDescription?: string;
  currency: Currency;       // Primary currency USD or VND
  effectiveDate: string;    // YYYY-MM-DD
  expiryDate: string;       // YYYY-MM-DD
  status: ContractStatus;
  currentVersion: number;   // 1, 2, 3...
  totalRatesCount: number;  // Summary counter for performance
  commercialTerms: ContractCommercialTerms;
  volumeCommitment: ContractVolumeCommitment;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  reviewRemarks?: string;
}

export interface ContractVersionItem {
  id: string;
  contractId: string;
  versionNumber: number;
  effectiveDate: string;
  expiryDate: string;
  status: ContractStatus;
  changeSummary: string;
  changesDetail?: string;
  commercialTermsSnapshot: ContractCommercialTerms;
  volumeCommitmentSnapshot: ContractVolumeCommitment;
  ratesCount: number;
  createdBy: string;
  createdAt: string;
}

export interface ContractWeightBreak {
  label: string; // e.g. "-45KG", "+45KG", "+100KG", "+300KG", "+500KG", "+1000KG"
  minWeightKg: number;
  maxWeightKg?: number;
  ratePerKg: number;
}

export interface ContractSurchargeItem {
  code: string;           // THC, BAF, CAF, DOC, CIC, PSS, LSS
  name: string;
  amount: number;
  currency: Currency;
  basis: ChargeBasis;
  unit: string;
}

export interface ContractRateItem {
  id: string;
  companyId: string;
  contractId: string;
  contractNumber: string;
  contractVersion: number;
  contractType: ContractType; // CUSTOMER (SELL) or SUPPLIER (BUY)
  rateType: 'BUY' | 'SELL';
  rateCode: string;
  rateName: string;
  serviceMode: 'SEA' | 'AIR' | 'TRUCKING' | 'CUSTOMS' | 'OTHER';
  shipmentType?: 'FCL' | 'LCL' | 'AIR' | 'TRUCK' | 'CUSTOMS' | 'OTHER';
  
  // Carrier & Route
  carrier?: string;
  carrierId?: string;
  supplierId?: string;
  supplierName?: string;
  origin: string;
  originCode?: string;
  originCountry?: string;
  destination: string;
  destinationCode?: string;
  destinationCountry?: string;
  pol?: string;
  pod?: string;
  
  // Equipment & Specifications
  equipmentType?: string;   // "20'GP", "40'HC", "Xe Tải 5 Tấn", etc.
  containerType?: ContainerType;
  incoterm?: IncotermCode;
  basis: ChargeBasis;
  unit: string;
  baseRate: number;         // Buying or Selling price
  currency: Currency;
  vatRate: number;          // 0, 5, 8, 10
  
  // Limits & Weight breaks
  minimumCharge?: number;
  maximumCharge?: number;
  weightBreaks?: ContractWeightBreak[];
  truckingBasis?: 'TRIP' | 'TRUCK' | 'CONTAINER' | 'KM' | 'TON' | 'CBM';
  customsBasis?: 'SHIPMENT' | 'DECLARATION' | 'HS_CODE' | 'DOCUMENT' | 'JOB';
  
  // Surcharges & Local charges
  surcharges?: ContractSurchargeItem[];
  
  // Validity & Priority
  validFrom: string;        // YYYY-MM-DD
  validTo: string;          // YYYY-MM-DD
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  priority: number;         // 100: Exact Lane, 90: Country Lane, 80: General Lane
  
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ContractDocumentType = 
  | 'SIGNED_CONTRACT' 
  | 'RATE_AGREEMENT' 
  | 'ADDENDUM' 
  | 'APPENDIX' 
  | 'RATE_SHEET' 
  | 'OTHER';

export interface ContractDocumentItem {
  id: string;
  contractId: string;
  contractVersion: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  downloadUrl?: string;
  documentType: ContractDocumentType;
  uploadedBy: string;
  uploadedAt: string;
  notes?: string;
}

export interface ContractAuditLogItem {
  id: string;
  contractId: string;
  action: 
    | 'CONTRACT_CREATED'
    | 'CONTRACT_UPDATED'
    | 'STATUS_CHANGED'
    | 'VERSION_CREATED'
    | 'RATE_CREATED'
    | 'RATE_UPDATED'
    | 'RATE_DELETED'
    | 'RATES_IMPORTED'
    | 'DOCUMENT_UPLOADED'
    | 'DOCUMENT_DELETED';
  performedBy: string;
  timestamp: string;
  details: string;
  oldValue?: string;
  newValue?: string;
}

export interface ContractRateOverlapResult {
  hasOverlap: boolean;
  overlapType?: 'EXACT_DUPLICATE' | 'DATE_OVERLAP' | 'WEIGHT_BREAK_OVERLAP';
  conflictingRateId?: string;
  conflictingRateCode?: string;
  messageVi: string;
  messageEn: string;
  severity: 'WARNING' | 'BLOCK';
}
