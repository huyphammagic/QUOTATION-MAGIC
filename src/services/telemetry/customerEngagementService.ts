import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp, 
  increment 
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { 
  QuotationEngagementSession, 
  EngagementSection, 
  EngagementActionType, 
  LeadTier,
  LiveEngagementAlert 
} from '../../types/customerEngagement';

const COLLECTION_ENGAGEMENTS = 'quotationEngagements';

// In-memory cache for offline / test runner
let memorySessions: QuotationEngagementSession[] = [];

export function getLocalEngagements(): QuotationEngagementSession[] {
  return memorySessions;
}

export function saveLocalEngagements(list: QuotationEngagementSession[]) {
  memorySessions = list;
}

/**
 * Deterministic Hot Lead Scoring Algorithm (0 - 100)
 */
export function calculateHotLeadScore(params: {
  viewCount: number;
  durationSeconds: number;
  sectionDurations: {
    HEADER: number;
    RATES_TABLE: number;
    TERMS_PAYMENT: number;
    SHIPMENT_SPECS: number;
    SIGNATURE_AREA: number;
  };
  downloadedPdf: boolean;
  openedSignature: boolean;
  submittedFeedback: boolean;
  lastActiveAt: string;
  customerName?: string;
  quotationNumber?: string;
  routePol?: string;
  routePod?: string;
}): {
  score: number;
  tier: LeadTier;
  reasons: string[];
  recommendedAction: string;
  callScript: string;
} {
  let score = 0;
  const reasons: string[] = [];

  // 1. View count signals (Up to 35 pts)
  if (params.viewCount >= 3) {
    score += 35;
    reasons.push(`Khách đã xem báo giá ${params.viewCount} lần (tần suất rất cao)`);
  } else if (params.viewCount === 2) {
    score += 25;
    reasons.push('Khách xem lại báo giá lần 2 (đang cân nhắc nghiêm túc)');
  } else if (params.viewCount === 1) {
    score += 15;
    reasons.push('Khách vừa mở báo giá lần đầu');
  }

  // 2. Reading duration signals (Up to 25 pts)
  if (params.durationSeconds >= 120) {
    score += 25;
    reasons.push(`Thời gian đọc kỹ: ${Math.round(params.durationSeconds / 60)} phút`);
  } else if (params.durationSeconds >= 45) {
    score += 15;
    reasons.push(`Thời gian xem: ${params.durationSeconds} giây`);
  } else if (params.durationSeconds >= 15) {
    score += 8;
  }

  // 3. Section focus: Rates table engagement (Up to 20 pts)
  if (params.sectionDurations.RATES_TABLE >= 45) {
    score += 20;
    reasons.push('Dừng lại đọc kỹ bảng cước & phụ phí (>45s)');
  } else if (params.sectionDurations.RATES_TABLE >= 20) {
    score += 10;
    reasons.push('Tập trung xem bảng cước');
  }

  // 4. High-Intent Actions (Up to 40 pts)
  if (params.openedSignature) {
    score += 40;
    reasons.push('⚡ Đã mở bảng ký số điện tử (Ý định chốt hợp đồng cực cao)');
  }

  if (params.downloadedPdf) {
    score += 20;
    reasons.push(' Đã tải bản in PDF (chuẩn bị trình duyệt nội bộ/kế toán)');
  }

  if (params.submittedFeedback) {
    score += 25;
    reasons.push(' Có gửi đề xuất điều chỉnh chi phí (thiện chí đàm phán cao)');
  }

  // Cap score at 100
  score = Math.min(100, Math.max(5, score));

  // Determine Recency
  const minutesSinceActive = (Date.now() - new Date(params.lastActiveAt).getTime()) / 60000;

  // Determine Tier
  let tier: LeadTier = 'COLD';
  if (score >= 80) tier = 'HOT';
  else if (score >= 50) tier = 'WARM';
  else if (score >= 25) tier = 'ENGAGED';

  // Generate Tailored Recommended Action & Call Script
  let recommendedAction = '';
  let callScript = '';

  const custName = params.customerName || 'Quý khách';
  const qNum = params.quotationNumber || 'báo giá';
  const pol = params.routePol || 'cảng đi';
  const pod = params.routePod || 'cảng đến';

  if (tier === 'HOT') {
    if (params.openedSignature) {
      recommendedAction = 'BỐC MÁY GỌI NGAY: Khách đang ở bước ký số, chỉ cần giải đáp 1 câu hỏi nhỏ là chốt đơn!';
      callScript = `Dạ chào anh/chị bên ${custName}, em là chuyên viên phụ trách báo giá ${qNum} tuyến ${pol} - ${pod}. Em thấy bên mình đang chuẩn bị xác nhận đặt chỗ booking, em gọi hỗ trợ chốt lịch tàu sớm nhất để kịp giữ chỗ cont cho công ty mình nhé ạ...`;
    } else {
      recommendedAction = 'GỌI TRONG VÒNG 15 PHÚT: Khách đang nghiên cứu kỹ bảng cước, cơ hội chốt cao nhất trong ngày!';
      callScript = `Dạ chào anh/chị bên ${custName}, em thấy bên mình đang xem lại phương án cước ${qNum}. Hiện tàu tuyến ${pol} - ${pod} tuần tới chỗ đang khá căng, em giữ trước cho mình 14 ngày free time DEM/DET, anh/chị có vướng mắc khoản phí nào em hỗ trợ cân đối ngay ạ!`;
    }
  } else if (tier === 'WARM') {
    recommendedAction = 'GỬI TIN NHẮN ZALO HOẶC GỌI TRONG 2 GIỜ: Khách đang so sánh giá với các đơn vị khác.';
    callScript = `Dạ chào anh/chị bên ${custName}, em gửi thêm lịch tàu chi tiết và cam kết vỏ cont cho lô hàng ${pol} - ${pod} theo báo giá ${qNum}, bên em có chính sách hỗ trợ thủ tục hải quan trọn gói nếu anh/chị chốt trong hôm nay...`;
  } else {
    recommendedAction = 'TIẾP TỤC THEO DÕI: Khách vừa mở xem lướt qua, gửi email nhắc lịch trình sau 24h.';
    callScript = `Chào anh/chị ${custName}, em gửi lại tóm tắt cước ${pol} - ${pod}, anh/chị cần check thêm free time hay lịch tàu nào cứ nhắn em hỗ trợ nhé ạ!`;
  }

  return {
    score,
    tier,
    reasons,
    recommendedAction,
    callScript,
  };
}

/**
 * Starts or retrieves an active engagement session when customer opens the link
 */
export async function recordCustomerSessionStart(params: {
  companyId: string;
  quotationId: string;
  quotationNumber: string;
  customerName: string;
  customerEmail?: string;
  linkId: string;
  deviceType?: 'DESKTOP' | 'MOBILE' | 'TABLET';
  routePol?: string;
  routePod?: string;
  totalAmount?: number;
  currency?: string;
}): Promise<string> {
  const sessionId = `ses_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  // Detect device type if not provided
  let detectedDevice: 'DESKTOP' | 'MOBILE' | 'TABLET' = params.deviceType || 'DESKTOP';
  if (typeof window !== 'undefined') {
    const ua = navigator.userAgent;
    if (/tablet|ipad/i.test(ua)) detectedDevice = 'TABLET';
    else if (/mobile|iphone|android/i.test(ua)) detectedDevice = 'MOBILE';
  }

  const initialSections = {
    HEADER: 3,
    RATES_TABLE: 0,
    TERMS_PAYMENT: 0,
    SHIPMENT_SPECS: 0,
    SIGNATURE_AREA: 0,
  };

  const scoreData = calculateHotLeadScore({
    viewCount: 1,
    durationSeconds: 3,
    sectionDurations: initialSections,
    downloadedPdf: false,
    openedSignature: false,
    submittedFeedback: false,
    lastActiveAt: now,
    customerName: params.customerName,
    quotationNumber: params.quotationNumber,
    routePol: params.routePol,
    routePod: params.routePod,
  });

  const sessionRecord: QuotationEngagementSession = {
    id: sessionId,
    companyId: params.companyId,
    quotationId: params.quotationId,
    quotationNumber: params.quotationNumber,
    customerName: params.customerName,
    customerEmail: params.customerEmail,
    linkId: params.linkId,
    startedAt: now,
    lastActiveAt: now,
    durationSeconds: 3,
    sectionDurations: initialSections,
    deviceType: detectedDevice,
    browserInfo: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 80) : 'Browser',
    isCurrentlyActive: true,
    hotScore: scoreData.score,
    leadTier: scoreData.tier,
    viewCount: 1,
    downloadedPdf: false,
    openedSignature: false,
    submittedFeedback: false,
    routePol: params.routePol,
    routePod: params.routePod,
    totalAmount: params.totalAmount,
    currency: params.currency || 'USD',
    scoreReasons: scoreData.reasons,
    recommendedAction: scoreData.recommendedAction,
    callScript: scoreData.callScript,
  };

  // Update in-memory cache
  const local = getLocalEngagements();
  saveLocalEngagements([sessionRecord, ...local]);

  if (db) {
    try {
      const docRef = doc(db, COLLECTION_ENGAGEMENTS, sessionId);
      await setDoc(docRef, {
        ...sessionRecord,
        _serverTimestamp: serverTimestamp(),
      });
    } catch (err) {
      console.warn('[EngagementTelemetry] Firestore session start notice:', err);
    }
  }

  return sessionId;
}

/**
 * Emits heartbeat every 8-10 seconds while customer has page open
 */
export async function recordCustomerHeartbeat(
  sessionId: string, 
  currentSection: EngagementSection, 
  additionalSeconds: number = 8
): Promise<void> {
  const now = new Date().toISOString();

  const local = getLocalEngagements();
  const idx = local.findIndex(s => s.id === sessionId);
  if (idx >= 0) {
    const s = { ...local[idx] };
    s.durationSeconds = (s.durationSeconds || 0) + additionalSeconds;
    s.lastActiveAt = now;
    s.isCurrentlyActive = true;
    s.sectionDurations = {
      ...s.sectionDurations,
      [currentSection]: (s.sectionDurations[currentSection] || 0) + additionalSeconds,
    };

    const scoreData = calculateHotLeadScore({
      viewCount: s.viewCount,
      durationSeconds: s.durationSeconds,
      sectionDurations: s.sectionDurations,
      downloadedPdf: s.downloadedPdf,
      openedSignature: s.openedSignature,
      submittedFeedback: s.submittedFeedback,
      lastActiveAt: now,
      customerName: s.customerName,
      quotationNumber: s.quotationNumber,
      routePol: s.routePol,
      routePod: s.routePod,
    });

    s.hotScore = scoreData.score;
    s.leadTier = scoreData.tier;
    s.scoreReasons = scoreData.reasons;
    s.recommendedAction = scoreData.recommendedAction;
    s.callScript = scoreData.callScript;

    local[idx] = s;
    saveLocalEngagements(local);

    if (db) {
      try {
        const docRef = doc(db, COLLECTION_ENGAGEMENTS, sessionId);
        await updateDoc(docRef, {
          durationSeconds: increment(additionalSeconds),
          [`sectionDurations.${currentSection}`]: increment(additionalSeconds),
          lastActiveAt: now,
          isCurrentlyActive: true,
          hotScore: s.hotScore,
          leadTier: s.leadTier,
          scoreReasons: s.scoreReasons,
          recommendedAction: s.recommendedAction,
          callScript: s.callScript,
          _updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('[EngagementTelemetry] Firestore heartbeat notice:', err);
      }
    }
  }
}

/**
 * Records explicit high-intent customer actions (PDF download, Signature pad opened, Counter-offer clicked)
 */
export async function recordCustomerAction(
  sessionId: string, 
  actionType: EngagementActionType, 
  metadata?: any
): Promise<void> {
  const now = new Date().toISOString();

  const local = getLocalEngagements();
  const idx = local.findIndex(s => s.id === sessionId);
  if (idx >= 0) {
    const s = { ...local[idx] };
    s.lastActiveAt = now;
    s.isCurrentlyActive = true;

    if (actionType === 'PDF_DOWNLOAD') s.downloadedPdf = true;
    if (actionType === 'SIGNATURE_PAD_OPEN') s.openedSignature = true;
    if (actionType === 'COUNTER_OFFER_CLICK') s.submittedFeedback = true;

    const scoreData = calculateHotLeadScore({
      viewCount: s.viewCount,
      durationSeconds: s.durationSeconds,
      sectionDurations: s.sectionDurations,
      downloadedPdf: s.downloadedPdf,
      openedSignature: s.openedSignature,
      submittedFeedback: s.submittedFeedback,
      lastActiveAt: now,
      customerName: s.customerName,
      quotationNumber: s.quotationNumber,
      routePol: s.routePol,
      routePod: s.routePod,
    });

    s.hotScore = scoreData.score;
    s.leadTier = scoreData.tier;
    s.scoreReasons = scoreData.reasons;
    s.recommendedAction = scoreData.recommendedAction;
    s.callScript = scoreData.callScript;

    local[idx] = s;
    saveLocalEngagements(local);

    if (db) {
      try {
        const docRef = doc(db, COLLECTION_ENGAGEMENTS, sessionId);
        const updates: any = {
          lastActiveAt: now,
          isCurrentlyActive: true,
          hotScore: s.hotScore,
          leadTier: s.leadTier,
          scoreReasons: s.scoreReasons,
          recommendedAction: s.recommendedAction,
          callScript: s.callScript,
          _updatedAt: serverTimestamp(),
        };

        if (actionType === 'PDF_DOWNLOAD') updates.downloadedPdf = true;
        if (actionType === 'SIGNATURE_PAD_OPEN') updates.openedSignature = true;
        if (actionType === 'COUNTER_OFFER_CLICK') updates.submittedFeedback = true;

        await updateDoc(docRef, updates);
      } catch (err) {
        console.warn('[EngagementTelemetry] Firestore record action notice:', err);
      }
    }
  }
}

/**
 * Subscribes in real-time to customer engagement sessions for a given company
 */
export function subscribeToLiveEngagements(
  companyId: string,
  callback: (sessions: QuotationEngagementSession[]) => void
): () => void {
  if (db && companyId) {
    try {
      const q = query(
        collection(db, COLLECTION_ENGAGEMENTS),
        where('companyId', '==', companyId),
        limit(50)
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const sessions: QuotationEngagementSession[] = [];
          const nowMs = Date.now();
          snapshot.forEach((d) => {
            const data = d.data() as QuotationEngagementSession;
            // Mark active if heartbeat received within last 60 seconds
            const lastMs = new Date(data.lastActiveAt).getTime();
            const isActive = (nowMs - lastMs) <= 60000;
            sessions.push({ ...data, id: d.id, isCurrentlyActive: isActive });
          });

          sessions.sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt));
          saveLocalEngagements(sessions);
          callback(sessions);
        },
        (error) => {
          console.warn('[EngagementTelemetry] onSnapshot listener warning:', error);
          callback(getLocalEngagements().filter(s => s.companyId === companyId));
        }
      );
    } catch (e) {
      console.warn('[EngagementTelemetry] Subscribe error, using local fallback:', e);
    }
  }

  // Fallback for offline / local mode
  const localList = getLocalEngagements().filter(s => s.companyId === companyId);
  callback(localList);
  return () => {};
}
