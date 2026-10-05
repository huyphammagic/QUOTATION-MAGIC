/**
 * Logistics Quotation Management Platform - Phase 61 (Gợi Ý 4)
 * "Golden Hour" Smart Follow-Up & Intent Trigger Engine Service
 * Nhận diện giờ vàng chốt đơn, đọc vị ý định khách hàng & trợ lý cuộc gọi mở đầu
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import {
  GoldenHourLeadEvent,
  BuyerIntentLevel,
  IntentTriggerType,
  FollowUpOutcomePayload,
  CallScriptTemplate
} from '../../types/goldenHourFollowUp';

// Dữ liệu mẫu thực tế về các khách hàng đang trong "Khung Giờ Vàng" (Golden Hour Window)
export const SAMPLE_GOLDEN_HOUR_LEADS: GoldenHourLeadEvent[] = [
  {
    id: 'gh-lead-001',
    quotationId: 'quote-2026-001',
    quotationNumber: 'QUO-2026-1008-01',
    customerName: 'Công ty Cổ phần Thủy Sản Biển Xanh',
    contactPerson: 'Anh Trần Minh Tuấn (Trưởng phòng XNK)',
    customerPhone: '0903123456',
    customerEmail: 'tuantm@xanhseafood.vn',
    carrier: 'ONE (Ocean Network Express)',
    pol: 'Cát Lái (VNCLI)',
    pod: 'Long Beach (USLGB)',
    grandTotalUsd: 7700,
    intentLevel: 'READY_TO_BUY',
    intentScore: 95,
    triggerType: 'MULTIPLE_REVISITS_SAME_DAY',
    triggerTitleVi: 'Khách Đang Xem Trực Tuyến & Mở Lại 4 Lần Trong 24H',
    triggerDescriptionVi: 'Khách hàng đang online tại mục Bảng Cước Biển và dừng lại hơn 90 giây. Đây là thời điểm vàng 10/10 để gọi điện chốt đơn!',
    detectedAt: '2026-10-03T20:40:00',
    goldenWindowRemainingMinutes: 28,
    isCurrentlyOnline: true,
    viewCountTotal: 4,
    timeSpentSeconds: 245,
    callScript: {
      hookVi: 'Dạ em chào anh Tuấn! Em vừa rà soát lại tiến độ lô hàng thủy sản 2x40HC đi Long Beach của bên mình, thấy hệ thống hãng tàu ONE vừa mở thêm đúng 2 slot cước tốt cho chuyến tàu thứ 6 tuần này.',
      pitchVi: 'Em biết bên anh đang cân nhắc lịch chạy và chi phí. Chuyến này tàu chạy direct chỉ 16 ngày và bên em đã xin sẵn chính sách 14 ngày Combined Free-time tại cảng đến cho bên mình.',
      closingQuestionVi: 'Nếu anh Tuấn duyệt sớm trong sáng nay, em giữ luôn 2 slot này và làm Booking Confirmation gửi anh ngay trong 15 phút được không anh?',
      zaloQuickNoteVi: 'Anh Tuấn ơi, em vừa kiểm tra tàu ONE đi Long Beach chuyến thứ 6 này còn đúng 2 slot giá ưu đãi $3,850/cont kèm 14 ngày Free DEM/DET. Anh xem qua báo giá QUO-2026-1008-01 nếu OK báo em lock chỗ ngay nhé anh!'
    },
    isFollowedUp: false
  },
  {
    id: 'gh-lead-002',
    quotationId: 'quote-2026-002',
    quotationNumber: 'QUO-2026-1009-02',
    customerName: 'Tập đoàn Dệt May Phong Phú Sài Gòn',
    contactPerson: 'Chị Nguyễn Thị Bích Ngọc (Phó Giám Đốc Supply Chain)',
    customerPhone: '0918765432',
    customerEmail: 'ngoc.ntb@phongphu.com.vn',
    carrier: 'COSCO Shipping Lines',
    pol: 'Hải Phòng (VNHPH)',
    pod: 'New York (USNYC)',
    grandTotalUsd: 14400,
    intentLevel: 'PRICE_EVALUATION',
    intentScore: 84,
    triggerType: 'PDF_DOWNLOAD_AND_RETURN',
    triggerTitleVi: 'Đã Tải Báo Giá PDF & Mở Lại Link Trực Tuyến',
    triggerDescriptionVi: 'Chị Ngọc đã in/tải PDF trình ban giám đốc và vừa mở lại link lúc 20:35 để kiểm tra phụ phí mùa cao điểm PSS.',
    detectedAt: '2026-10-03T20:35:00',
    goldenWindowRemainingMinutes: 35,
    isCurrentlyOnline: false,
    viewCountTotal: 3,
    timeSpentSeconds: 180,
    callScript: {
      hookVi: 'Em chào chị Ngọc ạ! Em gọi thăm hỏi xem bản báo giá lô hàng dệt may đi New York bên em gửi đã đầy đủ thông tin để chị trình ban giám đốc chưa ạ?',
      pitchVi: 'Dạ chị ơi, hãng tàu COSCO vừa có thông báo sẽ áp dụng phụ phí PSS $600/40HC từ tuần sau. Em gọi ngay để nhắc chị nhằm giúp công ty khóa trước mức cước gốc tiết kiệm được hơn $1,800 USD cho 3 cont đợt này.',
      closingQuestionVi: 'Chị Ngọc có cần em bổ sung điều khoản cam kết không rớt tàu (No-roll guarantee) vào hợp đồng để ban giám đốc yên tâm ký duyệt luôn không chị?',
      zaloQuickNoteVi: 'Chị Ngọc ơi, COSCO sắp tăng phụ phí mùa cao điểm PSS từ tuần sau. Chị duyệt sớm báo giá QUO-2026-1009-02 để em chốt giữ giá gốc $4,800/40HC tiết kiệm cho bên mình hơn $1,800 USD chị nhé!'
    },
    isFollowedUp: false
  },
  {
    id: 'gh-lead-003',
    quotationId: 'quote-2026-003',
    quotationNumber: 'QUO-2026-1010-03',
    customerName: 'Công ty Gỗ & Nội Thất Tân Uyên',
    contactPerson: 'Anh Hoàng Văn Nam (Phòng Mua Hàng Logistics)',
    customerPhone: '0988776655',
    customerEmail: 'nam.hv@tanuyenwood.vn',
    carrier: 'Maersk Line',
    pol: 'Cát Lái (VNCLI)',
    pod: 'Rotterdam (NLRTM)',
    grandTotalUsd: 9300,
    intentLevel: 'READY_TO_BUY',
    intentScore: 91,
    triggerType: 'SIGNATURE_SECTION_INSPECTED',
    triggerTitleVi: 'Lăn Chuột Đến Khu Vực Ký Duyệt & Điều Khoản',
    triggerDescriptionVi: 'Khách hàng vừa dừng lại 70 giây tại phần điều khoản thanh toán và khu vực xác nhận đặt chỗ. Rất có thể chuẩn bị ra quyết định.',
    detectedAt: '2026-10-03T20:25:00',
    goldenWindowRemainingMinutes: 15,
    isCurrentlyOnline: false,
    viewCountTotal: 5,
    timeSpentSeconds: 310,
    callScript: {
      hookVi: 'Em chào anh Nam! Em thấy bên mình đang chuẩn bị đóng hàng cho lô nội thất đi cảng Rotterdam châu Âu đúng không anh?',
      pitchVi: 'Em vừa trao đổi với đại diện hãng Maersk, bên em hỗ trợ cấp miễn phí trọn gói 21 ngày lưu bãi Combined DEM/DET tại Rotterdam để bên anh linh hoạt làm thủ tục thông quan không lo phát sinh phụ phí.',
      closingQuestionVi: 'Em gửi anh link ký điện tử 1-chạm hoặc làm thủ tục Booking Request luôn để anh em mình triển khai kịp chuyến tàu sớm nhất nhé?',
      zaloQuickNoteVi: 'Anh Nam ơi, Maersk tuyến Rotterdam bên em đã xin duyệt xong chính sách 21 ngày Free DEM/DET cho lô hàng của anh rồi ạ. Anh bấm xác nhận trên báo giá hoặc nhắn em làm Booking ngay nhé!'
    },
    isFollowedUp: false
  },
  {
    id: 'gh-lead-004',
    quotationId: 'quote-2026-004',
    quotationNumber: 'QUO-2026-1011-04',
    customerName: 'Công ty TNHH Cơ Khí Chính Xác Sakura VN',
    contactPerson: 'Chị Lê Thu Trang (Logistics Specialist)',
    customerPhone: '0933221144',
    customerEmail: 'trang.lt@sakura-vn.com',
    carrier: 'Evergreen Marine',
    pol: 'Cát Lái (VNCLI)',
    pod: 'Tokyo (JPTYO)',
    grandTotalUsd: 2250,
    intentLevel: 'COMPARING_OPTIONS',
    intentScore: 68,
    triggerType: 'PEAK_COMMERCIAL_HOURS',
    triggerTitleVi: 'Đang Xem Trong Khung Giờ Mua Hàng Trọng Điểm',
    triggerDescriptionVi: 'Khách hàng xem lại báo giá lần 2 trong khung giờ hành chính. Cần chủ động tư vấn để vượt lên trước các báo giá đối thủ.',
    detectedAt: '2026-10-03T20:15:00',
    goldenWindowRemainingMinutes: 10,
    isCurrentlyOnline: false,
    viewCountTotal: 2,
    timeSpentSeconds: 110,
    callScript: {
      hookVi: 'Dạ em chào chị Trang! Em gọi thăm hỏi xem tuyến Cát Lái đi Tokyo của bên mình có yêu cầu đặc biệt gì về vỏ container đạt chuẩn linh kiện cơ khí không ạ?',
      pitchVi: 'Bên em cam kết cấp vỏ cont khô sạch cấp độ A (Grade A food/electronics) để không ảnh hưởng đến bề mặt máy móc của Sakura.',
      closingQuestionVi: 'Chị Trang cần em giữ vỏ sạch tại Depot Cát Lái trước 2 ngày đóng hàng không để em điều xe qua bốc luôn ạ?',
      zaloQuickNoteVi: 'Chị Trang ơi, lô hàng đi Tokyo bên em cam kết cấp vỏ container Grade A đạt chuẩn Nhật Bản cho bên mình. Chị xem cần em giữ chỗ chuyến tuần này không nhé!'
    },
    isFollowedUp: false
  }
];

let memoryGoldenLeads: GoldenHourLeadEvent[] = [...SAMPLE_GOLDEN_HOUR_LEADS];

/**
 * Lấy danh sách khách hàng đang trong Giờ Vàng (sắp xếp theo điểm nóng và thời gian còn lại)
 */
export function getGoldenHourLeads(): GoldenHourLeadEvent[] {
  return [...memoryGoldenLeads].sort((a, b) => {
    if (a.isCurrentlyOnline && !b.isCurrentlyOnline) return -1;
    if (!a.isCurrentlyOnline && b.isCurrentlyOnline) return 1;
    return b.intentScore - a.intentScore;
  });
}

/**
 * Đọc vị ý định mua hàng (Buyer Intent Calculation)
 */
export function calculateBuyerIntent(
  viewCount: number,
  timeSpentSeconds: number,
  isCurrentlyOnline: boolean,
  downloadedPdf: boolean,
  openedSignature: boolean
): { score: number; level: BuyerIntentLevel; trigger: IntentTriggerType } {
  let score = 30; // base score

  score += Math.min(viewCount * 12, 36);
  score += Math.min(Math.floor(timeSpentSeconds / 30) * 8, 24);
  if (isCurrentlyOnline) score += 20;
  if (downloadedPdf) score += 15;
  if (openedSignature) score += 25;

  score = Math.min(score, 99);

  let level: BuyerIntentLevel = 'CASUAL_BROWSING';
  let trigger: IntentTriggerType = 'PEAK_COMMERCIAL_HOURS';

  if (score >= 90) {
    level = 'READY_TO_BUY';
    trigger = openedSignature ? 'SIGNATURE_SECTION_INSPECTED' : 'MULTIPLE_REVISITS_SAME_DAY';
  } else if (score >= 70) {
    level = 'PRICE_EVALUATION';
    trigger = downloadedPdf ? 'PDF_DOWNLOAD_AND_RETURN' : 'DEEP_DWELL_ON_PRICING';
  } else if (score >= 50) {
    level = 'COMPARING_OPTIONS';
    trigger = 'MULTIPLE_REVISITS_SAME_DAY';
  }

  return { score, level, trigger };
}

/**
 * Ghi nhận kết quả cuộc gọi Follow-up trong Giờ Vàng
 */
export async function recordGoldenHourFollowUpOutcome(
  payload: FollowUpOutcomePayload
): Promise<GoldenHourLeadEvent | null> {
  const lead = memoryGoldenLeads.find(l => l.id === payload.leadId);
  if (!lead) return null;

  lead.isFollowedUp = true;
  lead.followedUpAt = new Date().toISOString();
  lead.followUpOutcome = payload.outcome;
  lead.followUpNotes = payload.notes;

  // Thử đồng bộ Firestore
  try {
    if (db) {
      const ref = doc(db, 'goldenHourLeadEvents', lead.id);
      await setDoc(ref, {
        ...lead,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  } catch {
    // In-memory fallback
  }

  return lead;
}
