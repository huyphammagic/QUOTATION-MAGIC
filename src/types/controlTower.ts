/**
 * Logistics Control Tower - Phase 42 Types
 * Metrics, KPIs, Upcoming Deadlines, Operational Risks
 */

import { ExceptionSeverity, ExceptionStatus } from './exception';
import { ShipmentServiceMode, ShipmentStatus } from './shipment';

export interface ControlTowerKPIs {
  activeShipments: number;
  dueToday: number;
  overdueShipments: number;
  totalExceptions: number;
  openExceptions: number;
  criticalExceptions: number;
  pendingTasks: number;
  overdueTasks: number;
  missingDocuments: number;
  upcomingMilestones: number;
  recentlyUpdated: number;
}

export interface UpcomingDeadline {
  id: string;
  type: 'MILESTONE' | 'TASK' | 'SI_CUTOFF' | 'CY_CUTOFF' | 'VGM_CUTOFF' | 'ETA';
  shipmentId: string;
  shipmentNumber: string;
  customerName: string;
  serviceMode: ShipmentServiceMode;
  title: string;
  dueAt: string;
  status: string;
  assignedToName?: string;
  isOverdue: boolean;
  daysRemaining: number; // 0 = today, negative = overdue, positive = future
}

export interface OperationalRiskItem {
  shipmentId: string;
  shipmentNumber: string;
  customerName: string;
  serviceMode: ShipmentServiceMode;
  status: ShipmentStatus;
  origin: string;
  destination: string;
  riskLevel: ExceptionSeverity;
  riskReasons: string[];
  suggestedAction?: string;
  activeExceptionsCount: number;
  assignedToName?: string;
}

export type ControlTowerActiveTab = 
  | 'OVERVIEW' 
  | 'EXCEPTIONS' 
  | 'SHIPMENT_BOARD' 
  | 'DEADLINES' 
  | 'RISKS' 
  | 'ACTIVITY';
