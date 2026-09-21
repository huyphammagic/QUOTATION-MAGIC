import { UserRole } from '../types/analytics';

export type AppRouteId =
  // Main
  | 'main_dashboard'
  // Quotation
  | 'smart_quotation_workspace'
  | 'quotation_new'
  | 'quotations_all'
  | 'quotations_draft'
  | 'quotations_pending'
  | 'quotations_sent'
  | 'quotation_preview'
  | 'quotation_snapshots'
  | 'quotation_templates'
  | 'quotation_send'
  | 'quotation_communication'
  | 'quotation_document_center'
  | 'quotation_email_templates'
  | 'quotation_followup'
  // Pricing
  | 'pricing_rates'
  | 'pricing_contracts'
  | 'pricing_policies'
  | 'pricing_profit'
  | 'pricing_smart'
  | 'pricing_search'
  // Master Data
  | 'master_customers'
  | 'master_suppliers'
  | 'master_charges'
  | 'master_surcharges'
  | 'master_ports'
  | 'master_containers'
  | 'master_incoterms'
  | 'master_payment_terms'
  // Operations
  | 'ops_ocean'
  | 'ops_air'
  | 'ops_trucking'
  | 'ops_customs'
  // Analytics
  | 'analytics_overview'
  | 'analytics_funnel'
  | 'analytics_sales'
  | 'analytics_profit'
  | 'analytics_lanes'
  // System
  | 'sys_profile'
  | 'sys_sales_bank'
  | 'sys_financial'
  | 'sys_financial_config'
  | 'sys_audit'
  | 'sys_backup'
  | 'sys_integrity'
  // Portal / External
  | 'secure_quote_portal';

export interface RouteDefinition {
  id: AppRouteId;
  path: string; // e.g., '/dashboard', '/rates', '/customers'
  hash: string; // e.g., '#dashboard', '#rates'
  titleVi: string;
  titleEn: string;
  group: 'main' | 'quotation' | 'pricing' | 'masterData' | 'operations' | 'analytics' | 'system' | 'portal';
  requiredPermission?: 'profitability.view' | 'admin_manager';
  allowedRoles?: UserRole[];
  descriptionVi?: string;
  descriptionEn?: string;
}
