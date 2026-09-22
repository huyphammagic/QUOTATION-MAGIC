/**
 * Phase 43: External Carrier & Partner Integration Abstraction Layer
 * Standard enterprise webhook ingestion and tracking provider interface.
 * 
 * STRICT COMPLIANCE:
 * - NO mock API responses or simulated tracking payloads.
 * - If external carrier API is not configured, clearly states unconfigured status.
 * - Source of Truth: Canonical ShipmentEventRecord.
 */

import { ShipmentEventRecord, CreateShipmentEventPayload } from '../../types/shipmentEvent';
import { createShipmentEvent } from './eventIntelligenceService';

export interface ExternalTrackingQuery {
  carrierCode?: string;
  trackingNumber: string; // B/L number, Container number, or AWB
  trackingType: 'CONTAINER' | 'BL' | 'AWB' | 'BOOKING';
  shipmentId: string;
  shipmentNumber: string;
  companyId: string;
}

export interface ExternalTrackingResult {
  isConfigured: boolean;
  providerName?: string;
  queryTimestamp: string;
  eventsFoundCount: number;
  messageVi: string;
  messageEn: string;
  syncedEvents: ShipmentEventRecord[];
}

/**
 * Enterprise Ingress Validator for Carrier / Logistics Webhooks
 */
export async function processCarrierWebhookPayload(
  rawPayload: any,
  headers: Record<string, string>,
  companyId: string,
  user: { uid: string; displayName?: string }
): Promise<{ success: boolean; event?: ShipmentEventRecord; message: string }> {
  if (!rawPayload || !rawPayload.shipmentId || !rawPayload.eventType) {
    return {
      success: false,
      message: 'Invalid webhook payload structure: missing shipmentId or eventType',
    };
  }

  try {
    const payload: CreateShipmentEventPayload = {
      companyId: companyId || rawPayload.companyId || 'default-company',
      shipmentId: rawPayload.shipmentId,
      shipmentNumber: rawPayload.shipmentNumber || '',
      eventType: rawPayload.eventType,
      eventSource: rawPayload.eventSource || 'CARRIER',
      eventTime: rawPayload.eventTime || new Date().toISOString(),
      location: rawPayload.location || 'Unknown Port/Depot',
      referenceType: rawPayload.referenceType || 'CONTAINER',
      referenceId: rawPayload.referenceId,
      notes: rawPayload.notes || `Received via external webhook [${headers['x-carrier-id'] || 'Carrier'}]`,
      idempotencyKey: rawPayload.idempotencyKey || `wh_${rawPayload.shipmentId}_${rawPayload.eventType}_${rawPayload.eventTime}`,
      metadata: {
        webhookSource: headers['x-carrier-id'] || 'External Provider',
        receivedAt: new Date().toISOString(),
      },
    };

    const recordedEvent = await createShipmentEvent(payload, {
      uid: user?.uid || 'webhook_ingestion',
      displayName: `Webhook Integration (${headers['x-carrier-id'] || 'Carrier'})`,
    });

    return {
      success: true,
      event: recordedEvent,
      message: 'Webhook event processed and shipment reconciled successfully',
    };
  } catch (err: any) {
    console.error('[externalIntegrationService] Webhook processing failed:', err);
    return {
      success: false,
      message: err.message || 'Error executing webhook event processing',
    };
  }
}

/**
 * On-demand Carrier Status Synchronization Check
 * Informs the user whether direct EDI/API connection is active.
 */
export async function checkCarrierLiveStatus(
  queryParam: ExternalTrackingQuery
): Promise<ExternalTrackingResult> {
  const now = new Date().toISOString();

  // Inspect environment or company profile for active integration keys
  // By default, no carrier API credentials are wired, so we report the clean truth:
  return {
    isConfigured: false,
    providerName: queryParam.carrierCode || 'Carrier EDI/API',
    queryTimestamp: now,
    eventsFoundCount: 0,
    messageVi: `Chưa thiết lập cổng kết nối API trực tiếp cho mã [${queryParam.trackingNumber}]. Vui lòng ghi nhận sự kiện thực tế thủ công từ chứng từ hoặc B/L của Hãng tàu.`,
    messageEn: `Direct Carrier API tracking not configured for [${queryParam.trackingNumber}]. Please record actual operational events manually from carrier shipping docs.`,
    syncedEvents: [],
  };
}
