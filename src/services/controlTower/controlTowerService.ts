/**
 * Logistics Control Tower Engine - Phase 42 Service
 * Real-time operational metrics, deadline calculation, risk evaluation, and batch detection
 */

import { getShipments } from '../shipment/shipmentService';
import { getExceptions, detectShipmentExceptions } from '../exception/exceptionService';
import { detectMilestoneOverdueExceptions } from '../shipment/eventIntelligenceService';
import { ControlTowerKPIs, UpcomingDeadline, OperationalRiskItem } from '../../types/controlTower';
import { ShipmentRecord } from '../../types/shipment';
import { ShipmentException } from '../../types/exception';

/**
 * Compute real Control Tower KPIs for the active company
 * STRICT RULE: Only real data from Firebase/Cache. Never synthetic or mock data.
 */
export async function getControlTowerKPIs(companyId: string): Promise<ControlTowerKPIs> {
  const effectiveCompanyId = companyId || 'default-company';

  // Fetch recent active shipments and exceptions without full-database scan
  const [{ shipments }, { exceptions }] = await Promise.all([
    getShipments(effectiveCompanyId, { pageLimit: 100 }),
    getExceptions(effectiveCompanyId, { pageLimit: 100 }),
  ]);

  const now = new Date();
  const todayYMD = now.toISOString().substring(0, 10);
  const nowMs = now.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const activeShipmentsList = shipments.filter(
    s => s.status !== 'COMPLETED' && s.status !== 'CANCELLED'
  );

  let dueTodayCount = 0;
  let overdueShipmentsCount = 0;
  let upcomingMilestonesCount = 0;
  let recentlyUpdatedCount = 0;

  activeShipmentsList.forEach((s) => {
    let isOverdue = false;
    let isDueToday = false;

    // Check ETD / ETA
    if (s.etdPlanned && s.etdPlanned.substring(0, 10) === todayYMD) isDueToday = true;
    if (s.etaPlanned && s.etaPlanned.substring(0, 10) === todayYMD) isDueToday = true;
    if (s.etaPlanned && s.etaPlanned.substring(0, 10) < todayYMD && s.status !== 'DELIVERED') {
      isOverdue = true;
    }

    // Check milestones
    if (s.milestones) {
      s.milestones.forEach((m) => {
        if (m.plannedDate && m.status !== 'COMPLETED' && m.status !== 'SKIPPED') {
          const mYMD = m.plannedDate.substring(0, 10);
          if (mYMD === todayYMD) {
            isDueToday = true;
          }
          if (mYMD < todayYMD && !m.actualDate) {
            isOverdue = true;
          }
          // Upcoming in next 3 days
          const diffDays = (new Date(m.plannedDate).getTime() - nowMs) / oneDayMs;
          if (diffDays >= 0 && diffDays <= 3) {
            upcomingMilestonesCount++;
          }
        }
      });
    }

    if (isDueToday) dueTodayCount++;
    if (isOverdue) overdueShipmentsCount++;

    // Recently updated in last 24h
    if (s.updatedAt) {
      const updatedMs = new Date(s.updatedAt).getTime();
      if (nowMs - updatedMs <= oneDayMs) {
        recentlyUpdatedCount++;
      }
    }
  });

  // Exceptions breakdown
  const totalExceptions = exceptions.length;
  const activeExceptions = exceptions.filter(
    e => e.status === 'OPEN' || e.status === 'ACKNOWLEDGED' || e.status === 'IN_PROGRESS'
  );
  const openExceptions = activeExceptions.length;
  const criticalExceptions = activeExceptions.filter(e => e.severity === 'CRITICAL').length;
  const missingDocuments = activeExceptions.filter(e => e.exceptionType === 'MISSING_REQUIRED_DOCUMENT').length;
  const overdueTasks = activeExceptions.filter(e => e.exceptionType === 'OVERDUE_TASK').length;

  return {
    activeShipments: activeShipmentsList.length,
    dueToday: dueTodayCount,
    overdueShipments: overdueShipmentsCount,
    totalExceptions,
    openExceptions,
    criticalExceptions,
    pendingTasks: 0,
    overdueTasks,
    missingDocuments,
    upcomingMilestones: upcomingMilestonesCount,
    recentlyUpdated: recentlyUpdatedCount,
  };
}

/**
 * Retrieve upcoming deadlines (milestones, cutoffs, ETA) from active shipments
 */
export async function getUpcomingDeadlines(
  companyId: string,
  limitCount = 15
): Promise<UpcomingDeadline[]> {
  const effectiveCompanyId = companyId || 'default-company';
  const { shipments } = await getShipments(effectiveCompanyId, { pageLimit: 50 });
  const active = shipments.filter(s => s.status !== 'COMPLETED' && s.status !== 'CANCELLED');

  const now = new Date();
  const nowMs = now.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const deadlines: UpcomingDeadline[] = [];

  active.forEach((s) => {
    // 1. SI Cutoff
    if (s.siCutoff) {
      const targetMs = new Date(s.siCutoff).getTime();
      const diffDays = Math.round((targetMs - nowMs) / oneDayMs);
      deadlines.push({
        id: `${s.id}_si_cutoff`,
        type: 'SI_CUTOFF',
        shipmentId: s.id,
        shipmentNumber: s.shipmentNumber,
        customerName: s.customerName,
        serviceMode: s.serviceMode,
        title: 'Hạn nộp SI (SI Cutoff)',
        dueAt: s.siCutoff,
        status: diffDays < 0 ? 'OVERDUE' : diffDays === 0 ? 'DUE_TODAY' : 'UPCOMING',
        assignedToName: s.assignedToName,
        isOverdue: diffDays < 0,
        daysRemaining: diffDays,
      });
    }

    // 2. CY Cutoff
    if (s.cyCutoff) {
      const targetMs = new Date(s.cyCutoff).getTime();
      const diffDays = Math.round((targetMs - nowMs) / oneDayMs);
      deadlines.push({
        id: `${s.id}_cy_cutoff`,
        type: 'CY_CUTOFF',
        shipmentId: s.id,
        shipmentNumber: s.shipmentNumber,
        customerName: s.customerName,
        serviceMode: s.serviceMode,
        title: 'Hạn đóng bãi hạ cont (CY Cutoff)',
        dueAt: s.cyCutoff,
        status: diffDays < 0 ? 'OVERDUE' : diffDays === 0 ? 'DUE_TODAY' : 'UPCOMING',
        assignedToName: s.assignedToName,
        isOverdue: diffDays < 0,
        daysRemaining: diffDays,
      });
    }

    // 3. Milestones
    if (s.milestones) {
      s.milestones.forEach((m) => {
        if (m.plannedDate && m.status !== 'COMPLETED' && m.status !== 'SKIPPED') {
          const targetMs = new Date(m.plannedDate).getTime();
          const diffDays = Math.round((targetMs - nowMs) / oneDayMs);
          // Only show overdue or within next 7 days
          if (diffDays <= 7) {
            deadlines.push({
              id: `${s.id}_m_${m.id}`,
              type: 'MILESTONE',
              shipmentId: s.id,
              shipmentNumber: s.shipmentNumber,
              customerName: s.customerName,
              serviceMode: s.serviceMode,
              title: m.titleVi || m.titleEn,
              dueAt: m.plannedDate,
              status: diffDays < 0 ? 'OVERDUE' : diffDays === 0 ? 'DUE_TODAY' : 'UPCOMING',
              assignedToName: s.assignedToName,
              isOverdue: diffDays < 0,
              daysRemaining: diffDays,
            });
          }
        }
      });
    }
  });

  // Sort by daysRemaining ascending (most urgent / overdue first)
  deadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);
  return deadlines.slice(0, limitCount);
}

/**
 * Compute rule-based Operational Risk view based on real shipment anomalies
 */
export async function getOperationalRisks(
  companyId: string,
  limitCount = 15
): Promise<OperationalRiskItem[]> {
  const effectiveCompanyId = companyId || 'default-company';
  const [{ shipments }, { exceptions }] = await Promise.all([
    getShipments(effectiveCompanyId, { pageLimit: 50 }),
    getExceptions(effectiveCompanyId, { status: 'ACTIVE', pageLimit: 100 }),
  ]);

  const active = shipments.filter(s => s.status !== 'COMPLETED' && s.status !== 'CANCELLED');
  const nowMs = new Date().getTime();
  const todayYMD = new Date().toISOString().substring(0, 10);
  const risks: OperationalRiskItem[] = [];

  active.forEach((s) => {
    const shipmentExceptions = exceptions.filter(e => e.shipmentId === s.id);
    const riskReasons: string[] = [];
    let highestSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

    // 1. Critical Exceptions
    if (shipmentExceptions.some(e => e.severity === 'CRITICAL')) {
      highestSeverity = 'CRITICAL';
      const titles = shipmentExceptions.filter(e => e.severity === 'CRITICAL').map(e => e.title);
      riskReasons.push(`Có ${titles.length} bất thường mức độ CRITICAL: ${titles[0]}`);
    } else if (shipmentExceptions.some(e => e.severity === 'HIGH')) {
      highestSeverity = 'HIGH';
      riskReasons.push(`Có ${shipmentExceptions.filter(e => e.severity === 'HIGH').length} cảnh báo mức độ HIGH`);
    }

    // 2. Unassigned PIC
    if (!s.assignedTo) {
      if (highestSeverity === 'LOW') highestSeverity = 'MEDIUM';
      riskReasons.push('Chưa phân công người phụ trách điều hành (Unassigned PIC)');
    }

    // 3. Overdue milestones
    if (s.milestones) {
      const overdueCount = s.milestones.filter(
        m => m.plannedDate && m.plannedDate.substring(0, 10) < todayYMD && !m.actualDate && m.status !== 'COMPLETED'
      ).length;
      if (overdueCount > 0) {
        if (highestSeverity === 'LOW' || highestSeverity === 'MEDIUM') highestSeverity = 'HIGH';
        riskReasons.push(`${overdueCount} mốc vận hành đã trễ kế hoạch`);
      }
    }

    // 4. Cutoff risks
    if (s.siCutoff && s.siCutoff.substring(0, 10) <= todayYMD && s.status === 'DRAFT') {
      highestSeverity = 'CRITICAL';
      riskReasons.push('Hạn nộp SI đã cận kề hoặc quá hạn');
    }

    // If any risks detected, add to list
    if (riskReasons.length > 0) {
      risks.push({
        shipmentId: s.id,
        shipmentNumber: s.shipmentNumber,
        customerName: s.customerName,
        serviceMode: s.serviceMode,
        status: s.status,
        origin: s.origin,
        destination: s.destination,
        riskLevel: highestSeverity,
        riskReasons,
        suggestedAction: highestSeverity === 'CRITICAL' 
          ? 'Cần can thiệp gấp: Liên hệ Hãng vận chuyển / Bổ sung chứng từ ngay'
          : highestSeverity === 'HIGH'
          ? 'Kiểm tra tiến độ mốc vận hành và cập nhật thông tin thực tế'
          : 'Phân công PIC phụ trách và kiểm tra lịch trình',
        activeExceptionsCount: shipmentExceptions.length,
        assignedToName: s.assignedToName,
      });
    }
  });

  // Sort by risk priority: CRITICAL > HIGH > MEDIUM > LOW
  const severityWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  risks.sort((a, b) => severityWeight[b.riskLevel] - severityWeight[a.riskLevel]);

  return risks.slice(0, limitCount);
}

/**
 * Trigger batch idempotent exception detection across active shipments
 */
export async function runCompanyExceptionDetection(
  companyId: string,
  user: { uid: string; displayName?: string; email?: string }
): Promise<{ totalScanned: number; newExceptionsCount: number }> {
  const effectiveCompanyId = companyId || 'default-company';
  const { shipments } = await getShipments(effectiveCompanyId, { pageLimit: 50 });
  const active = shipments.filter(s => s.status !== 'COMPLETED' && s.status !== 'CANCELLED');

  let count = 0;
  for (const s of active) {
    const res = await detectShipmentExceptions(s, effectiveCompanyId, user);
    count += res.length;
  }

  // Also run milestone intelligence overdue detection
  try {
    const milestoneRes = await detectMilestoneOverdueExceptions(effectiveCompanyId);
    count += milestoneRes.created;
  } catch (err) {
    console.warn('[controlTowerService] Notice detecting overdue milestone exceptions:', err);
  }

  return {
    totalScanned: active.length,
    newExceptionsCount: count,
  };
}
