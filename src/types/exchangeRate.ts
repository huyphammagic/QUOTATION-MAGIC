export type ExchangeRateBankSource = 'VCB' | 'SBV' | 'INTERBANK' | 'TECHCOMBANK' | 'BIDV' | 'CUSTOM';

export interface ExchangeRateDetail {
  currency: 'USD';
  baseCurrency: 'VND';
  rate: number;             // Tỷ giá áp dụng chính (Chuẩn Bán Chuyển Khoản VCB)
  buyCash: number;          // Mua tiền mặt
  buyTransfer: number;      // Mua chuyển khoản
  sellTransfer: number;     // Bán chuyển khoản (chuẩn logistics)
  sellCash: number;         // Bán tiền mặt
  centralRate: number;      // Tỷ giá trung tâm Ngân hàng Nhà nước
  sourceName: string;       // "Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank)"
  sourceCode: ExchangeRateBankSource;
  lastUpdated: string;      // ISO string
  effectiveDate: string;    // YYYY-MM-DD
  change24h: number;        // e.g. +15 (+0.06%)
  changePercent24h: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  isLive: boolean;
  reliabilityScore: number; // 100%
  historicalRates?: {
    date: string;
    rate: number;
  }[];
}

export interface ExchangeRateConfig {
  autoSyncEnabled: boolean;           // Tự động đồng bộ realtime vào báo giá
  syncIntervalMinutes: number;        // Chu kỳ đồng bộ (5, 15, 30, 60)
  preferredSource: ExchangeRateBankSource;
  applyRateType: 'SELL_TRANSFER' | 'BUY_TRANSFER' | 'CENTRAL' | 'CUSTOM';
  rateSpreadAdjustmentVnd: number;    // Biên độ cộng thêm (ví dụ +50đ dự phòng trượt giá)
  notifyOnRateChange: boolean;        // Thông báo khi tỷ giá biến động
  minChangeToNotifyVnd: number;       // Ngưỡng biến động để cảnh báo (ví dụ 10đ)
  lockRateForActiveQuote: boolean;    // Khóa tỷ giá cho báo giá hiện tại
}
