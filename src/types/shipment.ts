import { ContainerType, Currency, QuoteCurrency } from './logistics';

export type ShipmentServiceMode = 
  | 'SEA_FCL' 
  | 'SEA_LCL' 
  | 'AIR' 
  | 'TRUCKING' 
  | 'CUSTOMS' 
  | 'MULTIMODAL' 
  | 'OTHER';

export type ShipmentStatus = 
  | 'DRAFT' 
  | 'BOOKING_REQUESTED' 
  | 'BOOKED' 
  | 'IN_TRANSIT' 
  | 'ARRIVED' 
  | 'CUSTOMS_CLEARANCE' 
  | 'DELIVERING' 
  | 'DELIVERED' 
  | 'COMPLETED' 
  | 'CANCELLED';

export type ShipmentContainerStatus = 
  | 'PLANNED' 
  | 'ASSIGNED' 
  | 'GATE_OUT' 
  | 'LOADED' 
  | 'IN_TRANSIT' 
  | 'DISCHARGED' 
  | 'EMPTY_RETURNED' 
  | 'COMPLETED';

export interface ShipmentContainer {
  id: string;
  containerNumber: string;
  containerType: ContainerType;
  sealNumber?: string;
  tareWeightKg?: number;
  grossWeightKg?: number;
  status: ShipmentContainerStatus;
  gateOutDate?: string;
  loadedDate?: string;
  dischargedDate?: string;
  emptyReturnedDate?: string;
  notes?: string;
}

export type ShipmentMilestoneCode =
  | 'BOOKING_REQUESTED'
  | 'BOOKING_CONFIRMED'
  | 'CARGO_PICKED_UP'
  | 'CONTAINER_GATE_OUT'
  | 'LOADED_ON_VESSEL'
  | 'VESSEL_DEPARTED'
  | 'TRANSSHIPMENT'
  | 'VESSEL_ARRIVED'
  | 'DISCHARGED'
  | 'CUSTOMS_STARTED'
  | 'CUSTOMS_CLEARED'
  | 'DELIVERY_STARTED'
  | 'DELIVERED'
  | 'EMPTY_RETURNED'
  | 'COMPLETED'
  | 'CUSTOM_MILESTONE';

export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'DELAYED';

export interface ShipmentMilestone {
  id: string;
  milestoneCode: ShipmentMilestoneCode | string;
  titleVi: string;
  titleEn: string;
  status: MilestoneStatus;
  sequence: number;
  plannedDate?: string;
  estimatedDate?: string;
  actualDate?: string;
  occurredAt?: string;
  location?: string;
  notes?: string;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNCONFIRMED';
  source?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface ShipmentAirDetails {
  airline?: string;
  mawb?: string;
  hawb?: string;
  flightNumber?: string;
  pieces?: number;
  chargeableWeightKg?: number;
  dimensions?: string;
}

export interface ShipmentTruckingDetails {
  pickupLocation?: string;
  deliveryLocation?: string;
  truckType?: string;
  vehiclePlate?: string;
  driverName?: string;
  driverPhone?: string;
  appointmentTime?: string;
  emptyReturnDepot?: string;
}

export interface ShipmentCustomsDetails {
  declarationNumber?: string;
  declarationType?: 'IMPORT' | 'EXPORT';
  customsBranch?: string;
  clearanceDate?: string;
  channel?: 'GREEN' | 'YELLOW' | 'RED';
  notes?: string;
}

export interface ShipmentQuotationSnapshot {
  quotationId: string;
  quoteNumber: string;
  version?: number;
  customerName: string;
  totalSellingUsd?: number;
  totalSellingVnd?: number;
  totalCostUsd?: number;
  totalCostVnd?: number;
  profitUsd?: number;
  profitVnd?: number;
  currency: QuoteCurrency;
  exchangeRate: number;
  lineItemsCount: number;
  snapshotAt: string;
}

export interface ShipmentRecord {
  id: string;
  companyId: string;
  shipmentNumber: string;
  quotationId?: string;
  quotationNumber?: string;
  quotationVersion?: number;
  quotationSnapshot?: ShipmentQuotationSnapshot;
  customerId: string;
  customerName: string;
  serviceMode: ShipmentServiceMode;
  status: ShipmentStatus;
  origin: string;
  originPort?: string;
  destination: string;
  destinationPort?: string;
  incoterm: string;
  commodity: string;
  cargoDescription?: string;
  packageType?: string;
  packageQuantity?: number;
  grossWeightKg?: number;
  netWeightKg?: number;
  volumeCbm?: number;
  chargeableWeightKg?: number;
  hsCode?: string;
  cargoValue?: number;
  cargoValueCurrency?: Currency;
  carrierName?: string;
  vesselFlightName?: string;
  voyageFlightNumber?: string;
  blAwbNumber?: string;
  bookingNumber?: string;
  etdPlanned?: string;
  etdEstimated?: string;
  etdActual?: string;
  etaPlanned?: string;
  etaEstimated?: string;
  etaActual?: string;
  etaSource?: 'CARRIER' | 'USER_CONFIRMED' | 'SYSTEM';
  etaConfidence?: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNCONFIRMED';
  etaLastUpdatedAt?: string;
  lastOperationalEventId?: string;
  lastOperationalEventTime?: string;
  lastOperationalEventTitle?: string;
  operationalFreshness?: 'FRESH' | 'STALE' | 'UNKNOWN';
  cargoReadyDate?: string;
  siCutoff?: string;
  vgmCutoff?: string;
  cyCutoff?: string;
  docCutoff?: string;
  assignedTo?: string;
  assignedToName?: string;
  notes?: string;
  containers: ShipmentContainer[];
  milestones: ShipmentMilestone[];
  linkedDocumentIds: string[];
  linkedTaskIds: string[];
  linkedCommunicationIds?: string[];
  airDetails?: ShipmentAirDetails;
  truckingDetails?: ShipmentTruckingDetails;
  customsDetails?: ShipmentCustomsDetails;
  version: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface ShipmentAuditLog {
  id: string;
  companyId: string;
  shipmentId: string;
  shipmentNumber: string;
  action: 
    | 'SHIPMENT_CREATED'
    | 'SHIPMENT_UPDATED'
    | 'STATUS_CHANGED'
    | 'ASSIGNED_USER_CHANGED'
    | 'CONTAINER_ADDED'
    | 'CONTAINER_UPDATED'
    | 'CONTAINER_REMOVED'
    | 'MILESTONE_UPDATED'
    | 'DOCUMENT_LINKED'
    | 'TASK_LINKED'
    | 'SHIPMENT_COMPLETED'
    | 'SHIPMENT_CANCELLED';
  performedBy: string;
  timestamp: string;
  details?: Record<string, any>;
  previousValue?: any;
  newValue?: any;
}

export interface ShipmentOperationalTask {
  id: string;
  companyId: string;
  shipmentId: string;
  shipmentNumber: string;
  taskType: 'BOOKING' | 'CUSTOMS' | 'TRUCKING' | 'DOCUMENT' | 'FOLLOW_UP' | 'DELIVERY';
  title: string;
  description?: string;
  dueDate: string;
  assignedTo: string;
  assignedToName?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
}
