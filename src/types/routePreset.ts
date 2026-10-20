import { 
  TransportMode, 
  ContainerType, 
  IncotermCode, 
  ChargeLocation, 
  FeeCategory, 
  ChargeBasis,
  QuoteData 
} from './logistics';

export type TradeLane = 
  | 'ALL'
  | 'TRANSPACIFIC_US'      // Bắc Mỹ (Hoa Kỳ / Canada)
  | 'EUROPE'               // Châu Âu (EU - Hamburg, Rotterdam, Antwerp...)
  | 'INTRA_ASIA'           // Đông Bắc Á (Nhật Bản, Hàn Quốc, Đài Loan, Trung Quốc)
  | 'SOUTHEAST_ASIA'       // Đông Nam Á (Singapore, Thái Lan, Malaysia, Indonesia...)
  | 'MIDDLE_EAST_INDIA'    // Trung Đông & Nam Á (Dubai, Jebel Ali, Nhava Sheva...)
  | 'DOMESTIC_VIETNAM'     // Nội địa Việt Nam
  | 'DOOR_TO_DOOR_ALL';    // Trọn gói DDP / EXW

export interface RoutePresetItem {
  id: string;
  category: FeeCategory;
  location: ChargeLocation;
  code: string;
  description: string;
  basis: ChargeBasis | string;
  quantity: number;
  unit: string;
  unitPrice: number;
  costPrice: number;
  currency: 'USD' | 'VND';
  vatRate: number;
  note?: string;
}

export interface RoutePreset {
  id: string;
  name: string;
  shortName: string;
  serviceMode: TransportMode;
  tradeLane: TradeLane;
  badge?: string; // e.g. "Bán Chạy Nhất", "Direct 14 Ngày", "Trọn Gói Door-to-Door", "Chuyên Tuyến Mỹ"
  badgeColor?: 'emerald' | 'blue' | 'indigo' | 'amber' | 'purple' | 'rose';
  carrier?: string; // e.g. "Maersk / ONE / Evergreen", "Cosco", "Vietnam Airlines Cargo"
  description: string;
  incoterm: IncotermCode;
  pol: string;
  pod: string;
  containerType: ContainerType;
  defaultQuantity: number;
  transitTime: string;
  freeTime: string;
  estimatedTotalUsd: number;
  estimatedTotalVnd: number;
  estimatedProfitUsd: number;
  estimatedMarginPercent: number;
  items: RoutePresetItem[];
  defaultTerms: {
    incoterm: IncotermCode;
    validityDays: number;
    paymentTerm: string;
    exclusionsNotes: string;
  };
  isCustom?: boolean;
  isFavorite?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PresetApplyMode = 'NEW_QUOTE' | 'OVERWRITE_CURRENT' | 'APPEND_ITEMS_ONLY';
