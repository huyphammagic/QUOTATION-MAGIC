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
  CallScriptTemplate,
  QuotationReadReceipt,
  QuotationReadStats,
  ReadReceiptEventType
} from '../../types/goldenHourFollowUp';
import { QuoteData } from '../../types/logistics';

// Dữ liệu nhật ký đọc báo giá thực tế ban đầu (Live Read Receipts Feed)
export const SAMPLE_READ_RECEIPTS: QuotationReadReceipt[] = [
  {
    id: 'rcpt-001',
    quotationId: 'quote-2026-001',
    quotationNumber: 'QUO-2026-1008-01',
    customerName: 'Công ty Cổ phần Thủy Sản Biển Xanh',
    contactPerson: 'Anh Trần Minh Tuấn (Trưởng phòng XNK)',
    customerPhone: '0903123456',
    eventType: 'LINK_OPENED',
    eventTitleVi: 'Khách hàng vừa click mở xem link báo giá trực tuyến',
    device: 'Desktop (Windows / Mac)',
    ipLocation: 'Quận 7, TP. Hồ Chí Minh, VN',
    timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(), // 3 phút trước
    dwellTimeSeconds: 145,
    isCurrentlyOnline: true,
    pageSection: 'Bảng cước chính'
  },
  {
    id: 'rcpt-002',
    quotationId: 'quote-2026-001',
    quotationNumber: 'QUO-2026-1008-01',
    customerName: 'Công ty Cổ phần Thủy Sản Biển Xanh',
    contactPerson: 'Anh Trần Minh Tuấn (Trưởng phòng XNK)',
    customerPhone: '0903123456',
    eventType: 'DWELL_PRICING',
    eventTitleVi: 'Dừng lại đọc kỹ bảng cước biển & phụ phí THC',
    device: 'Desktop (Windows / Mac)',
    ipLocation: 'Quận 7, TP. Hồ Chí Minh, VN',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 phút trước
    dwellTimeSeconds: 95,
    isCurrentlyOnline: true,
    pageSection: 'Bảng cước chính'
  },
  {
    id: 'rcpt-003',
    quotationId: 'quote-2026-002',
    quotationNumber: 'QUO-2026-1009-02',
    customerName: 'Tập đoàn Dệt May Phong Phú Sài Gòn',
    contactPerson: 'Chị Nguyễn Thị Bích Ngọc (Phó Giám Đốc)',
    customerPhone: '0918765432',
    eventType: 'PDF_DOWNLOADED',
    eventTitleVi: 'Đã tải tệp Báo Giá PDF A4 chính thức về máy tính',
    device: 'Desktop (Windows / Mac)',
    ipLocation: 'Quận 1, TP. Hồ Chí Minh, VN',
    timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(), // 14 phút trước
    dwellTimeSeconds: 180,
    isCurrentlyOnline: false,
    pageSection: 'Toàn bộ báo giá'
  },
  {
    id: 'rcpt-004',
    quotationId: 'quote-2026-003',
    quotationNumber: 'QUO-2026-1010-03',
    customerName: 'Công ty Gỗ & Nội Thất Tân Uyên',
    contactPerson: 'Anh Hoàng Văn Nam',
    customerPhone: '0988776655',
    eventType: 'SIGNATURE_SECTION',
    eventTitleVi: 'Cuộn chuột xuống xem kỹ Điều khoản thanh toán & Ký duyệt',
    device: 'Mobile (iPhone / Android)',
    ipLocation: 'Thủ Dầu Một, Bình Dương, VN',
    timestamp: new Date(Date.now() - 28 * 60 * 1000).toISOString(), // 28 phút trước
    dwellTimeSeconds: 70,
    isCurrentlyOnline: false,
    pageSection: 'Điều khoản thanh toán'
  },
  {
    id: 'rcpt-005',
    quotationId: 'quote-2026-004',
    quotationNumber: 'QUO-2026-1011-04',
    customerName: 'Công ty TNHH Cơ Khí Chính Xác Sakura VN',
    contactPerson: 'Chị Lê Thu Trang',
    customerPhone: '0933221144',
    eventType: 'REVISITED',
    eventTitleVi: 'Khách mở lại báo giá lần thứ 2 trong ngày',
    device: 'Mobile (iPhone / Android)',
    ipLocation: 'KCN Nomura, Hải Phòng, VN',
    timestamp: new Date(Date.now() - 36 * 60 * 1000).toISOString(), // 36 phút trước
    dwellTimeSeconds: 110,
    isCurrentlyOnline: false,
    pageSection: 'Bảng cước chính'
  }
];

// Dữ liệu khách hàng Giờ Vàng ban đầu (Golden Hour Hot Leads)
export const SAMPLE_GOLDEN_HOUR_LEADS: GoldenHourLeadEvent[] = [
  {
    id: 'gh-lead-001',
    quotationId: 'quote-2026-001',
    quotationNumber: 'QUO-2026-1008-01',
    customerName: 'Công ty Cổ phần Thủy Sản Biển Xanh',
    contactPerson: 'Anh Trần Minh Tuấn (Trưởng phòng XNK)',
    customerPhone: '0903123456',
    customerEmail: 'tuan.tm@seablue.vn',
    carrier: 'Ocean Network Express (ONE)',
    pol: 'Cát Lái, TP.HCM',
    pod: 'Tokyo Port, Nhật Bản',
    grandTotalUsd: 4850,
    intentLevel: 'READY_TO_BUY',
    intentScore: 95,
    triggerType: 'MULTIPLE_REVISITS_SAME_DAY',
    triggerTitleVi: 'Khách Đang Online & Xem Lại Lần Thứ 3',
    triggerDescriptionVi: 'Khách vừa mở lại báo giá lần 3 trong ngày và dừng lại 145s tại mục Cước biển & Phụ phí THC.',
    detectedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    goldenWindowRemainingMinutes: 42,
    isCurrentlyOnline: true,
    viewCountTotal: 3,
    timeSpentSeconds: 240,
    callScript: {
      hookVi: 'Dạ em chào anh Tuấn! Em thấy bên mình đang chuẩn bị lô hàng thủy sản đi Tokyo tuần tới, em gọi hỗ trợ anh kiểm tra lịch tàu hãng ONE ạ.',
      pitchVi: 'Dạ anh Tuấn ơi, hãng ONE chuyến thứ 5 tuần này đang có chương trình giữ chỗ ưu tiên và bên em xin thêm được 14 ngày Free DEM/DET tại Tokyo cho công ty mình.',
      closingQuestionVi: 'Dạ nếu lịch trình này phù hợp với tiến độ đóng hàng, em giữ luôn 2 cont 40 lạnh chuyến này cho bên mình nhé ạ?',
      zaloQuickNoteVi: 'Chào anh Tuấn, em bên Forwarding hỗ trợ tuyến Cát Lái - Tokyo của mình. Chuyến thứ 5 tuần này hãng ONE đang có giá giữ chỗ cực tốt + 14 ngày Free DEM/DET. Anh xem báo giá nếu OK báo em lock cont luôn nhé!'
    },
    isFollowedUp: false
  },
  {
    id: 'gh-lead-002',
    quotationId: 'quote-2026-002',
    quotationNumber: 'QUO-2026-1009-02',
    customerName: 'Tập đoàn Dệt May Phong Phú Sài Gòn',
    contactPerson: 'Chị Nguyễn Thị Bích Ngọc (Phó Giám Đốc)',
    customerPhone: '0918765432',
    customerEmail: 'ngoc.ntb@phongphutex.com.vn',
    carrier: 'Maersk Line',
    pol: 'Cát Lái, TP.HCM',
    pod: 'Los Angeles (LAX), Hoa Kỳ',
    grandTotalUsd: 8200,
    intentLevel: 'PRICE_EVALUATION',
    intentScore: 88,
    triggerType: 'PDF_DOWNLOAD_AND_RETURN',
    triggerTitleVi: 'Đã Tải Bản In PDF A4 Về Máy Tính',
    triggerDescriptionVi: 'Chị Ngọc vừa tải file PDF báo giá chính thức về máy để trình ban giám đốc xem xét phê duyệt.',
    detectedAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    goldenWindowRemainingMinutes: 31,
    isCurrentlyOnline: false,
    viewCountTotal: 2,
    timeSpentSeconds: 180,
    callScript: {
      hookVi: 'Dạ em chào chị Ngọc! Em thấy bản báo giá xuất hàng may mặc đi Los Angeles bên em gửi, chị đã tải về xem qua chưa ạ?',
      pitchVi: 'Dạ chị Ngọc ơi, tuyến Bờ Tây Mỹ giá cước đang có xu hướng tăng nhẹ vào cuối tháng, nhưng bên em đã giữ được mức giá cam kết không tăng phụ phí GRI cho hợp đồng này.',
      closingQuestionVi: 'Dạ chị cần bên em hỗ trợ chuẩn bị thêm hợp đồng dịch vụ vận tải hay xác nhận booking confirmation trước không ạ?',
      zaloQuickNoteVi: 'Chào chị Ngọc, em gửi hỗ trợ thêm thông tin lô hàng đi Los Angeles. Cước tháng này bên em cam kết cố định không phát sinh phụ phí GRI. Chị cần duyệt booking sớm cứ nhắn em nhé!'
    },
    isFollowedUp: false
  },
  {
    id: 'gh-lead-003',
    quotationId: 'quote-2026-003',
    quotationNumber: 'QUO-2026-1010-03',
    customerName: 'Công ty Gỗ & Nội Thất Tân Uyên',
    contactPerson: 'Anh Hoàng Văn Nam',
    customerPhone: '0988776655',
    customerEmail: 'nam.hv@tanuyenfurniture.com',
    carrier: 'Evergreen Marine',
    pol: 'Cát Lái, TP.HCM',
    pod: 'Hamburg, Đức',
    grandTotalUsd: 5400,
    intentLevel: 'READY_TO_BUY',
    intentScore: 92,
    triggerType: 'SIGNATURE_SECTION_INSPECTED',
    triggerTitleVi: 'Xem Kỹ Mục Chữ Ký & Thời Hạn Thanh Toán',
    triggerDescriptionVi: 'Khách hàng vừa cuộn chuột và dừng lại ở điều khoản công nợ và mẫu xác nhận báo giá.',
    detectedAt: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    goldenWindowRemainingMinutes: 17,
    isCurrentlyOnline: false,
    viewCountTotal: 2,
    timeSpentSeconds: 150,
    callScript: {
      hookVi: 'Dạ em chào anh Nam! Em gọi thăm hỏi xem điều khoản thanh toán 30 ngày cho tuyến Hamburg bên em đề xuất đã đúng như mong đợi của bên mình chưa ạ?',
      pitchVi: 'Dạ anh Nam ơi, chuyến tàu Evergreen bên em đã xin được vỏ cont Grade A chuyên chở đồ gỗ nội thất chống ẩm mốc đạt chuẩn Châu Âu.',
      closingQuestionVi: 'Dạ nếu thủ tục duyệt thanh toán ổn thỏa, em tiến hành release lệnh cấp vỏ cont cho nhà máy đóng hàng luôn anh nhé?',
      zaloQuickNoteVi: 'Chào anh Nam, lô hàng gỗ đi Hamburg bên em đã xin được duyệt hạn mức công nợ 30 ngày và vỏ cont Grade A. Anh xem ký duyệt giúp em để kịp kéo vỏ sớm nhé!'
    },
    isFollowedUp: false
  },
  {
    id: 'gh-lead-004',
    quotationId: 'quote-2026-004',
    quotationNumber: 'QUO-2026-1011-04',
    customerName: 'Công ty TNHH Cơ Khí Chính Xác Sakura VN',
    contactPerson: 'Chị Lê Thu Trang',
    customerPhone: '0933221144',
    customerEmail: 'trang.lt@sakuravn.com',
    carrier: 'Cosco Shipping',
    pol: 'Hải Phòng, VN',
    pod: 'Busan, Hàn Quốc',
    grandTotalUsd: 2650,
    intentLevel: 'COMPARING_OPTIONS',
    intentScore: 78,
    triggerType: 'PEAK_COMMERCIAL_HOURS',
    triggerTitleVi: 'Khách Xem Lại Báo Giá Trong Giờ Vàng',
    triggerDescriptionVi: 'Khách đang mở xem lại báo giá lần 2 trong khung giờ đưa ra quyết định thương mại.',
    detectedAt: new Date(Date.now() - 36 * 60 * 1000).toISOString(),
    goldenWindowRemainingMinutes: 9,
    isCurrentlyOnline: false,
    viewCountTotal: 2,
    timeSpentSeconds: 110,
    callScript: {
      hookVi: 'Dạ em chào chị Trang! Em gọi kiểm tra xem lịch tàu Hải Phòng đi Busan hôm nay bên mình đã chọn được ngày xuất hàng chưa ạ?',
      pitchVi: 'Dạ chị Trang ơi, bên em có chuyến direct của hãng Cosco đi Busan chỉ mất 4 ngày, rất phù hợp với hàng cơ khí cần giao gấp.',
      closingQuestionVi: 'Dạ em có thể chốt giữ slot giá ưu đãi này cho lô hàng xuất tuần tới của bên mình được không ạ?',
      zaloQuickNoteVi: 'Chào chị Trang, tuyến Hải Phòng - Busan bên em có tàu chạy direct 4 ngày rất nhanh. Chị cần giữ chỗ giá tốt thì nhắn em hỗ trợ ngay nhé!'
    },
    isFollowedUp: false
  }
];

let memoryReadReceipts: QuotationReadReceipt[] = [...SAMPLE_READ_RECEIPTS];
let memoryGoldenLeads: GoldenHourLeadEvent[] = [...SAMPLE_GOLDEN_HOUR_LEADS];

/**
 * Lấy toàn bộ nhật ký đọc báo giá (hoặc lọc theo mã báo giá)
 */
export function getQuotationReadReceipts(quotationId?: string): QuotationReadReceipt[] {
  if (!quotationId) {
    return [...memoryReadReceipts].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  return memoryReadReceipts
    .filter(r => r.quotationId === quotationId || r.quotationNumber === quotationId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Ghi nhận một sự kiện đọc báo giá mới
 */
export async function recordQuotationReadReceipt(receipt: QuotationReadReceipt): Promise<void> {
  memoryReadReceipts.unshift(receipt);

  try {
    if (db) {
      const ref = doc(db, 'quotationReadReceipts', receipt.id);
      await setDoc(ref, {
        ...receipt,
        createdAt: serverTimestamp()
      });
    }
  } catch {
    // In-memory fallback
  }
}

/**
 * Thống kê tình trạng đọc của 1 báo giá cụ thể
 */
export function getQuotationReadStats(quotationId: string, quotationNumber?: string): QuotationReadStats {
  const events = memoryReadReceipts.filter(
    r => r.quotationId === quotationId || (quotationNumber && r.quotationNumber === quotationNumber)
  );

  const totalViews = events.filter(e => e.eventType === 'LINK_OPENED' || e.eventType === 'REVISITED').length || (events.length > 0 ? events.length : 0);
  const hasDownloadedPdf = events.some(e => e.eventType === 'PDF_DOWNLOADED');
  const isCurrentlyOnline = events.some(e => e.isCurrentlyOnline && (Date.now() - new Date(e.timestamp).getTime()) < 5 * 60 * 1000);
  
  const sorted = [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const lastViewedAt = sorted[0]?.timestamp || null;
  const firstViewedAt = sorted[sorted.length - 1]?.timestamp || null;

  const totalDwellTimeSeconds = events.reduce((sum, e) => sum + (e.dwellTimeSeconds || 0), 0);

  // Check if inside golden window (45 minutes)
  let isInGoldenWindow = false;
  let goldenWindowRemainingMinutes = 0;

  if (lastViewedAt) {
    const elapsedMinutes = Math.floor((Date.now() - new Date(lastViewedAt).getTime()) / (60 * 1000));
    if (elapsedMinutes < 45) {
      isInGoldenWindow = true;
      goldenWindowRemainingMinutes = Math.max(1, 45 - elapsedMinutes);
    }
  }

  const { score, level } = calculateBuyerIntent(
    totalViews || 1,
    totalDwellTimeSeconds || 60,
    isCurrentlyOnline,
    hasDownloadedPdf,
    events.some(e => e.eventType === 'SIGNATURE_SECTION')
  );

  return {
    quotationId,
    quotationNumber: quotationNumber || quotationId,
    totalViews,
    lastViewedAt,
    firstViewedAt,
    isCurrentlyOnline,
    hasDownloadedPdf,
    totalDwellTimeSeconds,
    isInGoldenWindow,
    goldenWindowRemainingMinutes,
    highestIntentScore: score,
    intentLevel: level
  };
}

/**
 * Tự động tạo kịch bản gọi điện phá băng (Ice-Breaker Call Script) theo ngữ cảnh báo giá thực tế
 */
export function generateScriptForQuote(
  quote: QuoteData, 
  intentType: IntentTriggerType = 'MULTIPLE_REVISITS_SAME_DAY'
): CallScriptTemplate {
  const contact = quote.customer?.contactPerson || 'Anh / Chị phụ trách XNK';
  const customerName = quote.customer?.companyName || 'Quý công ty';
  const pol = quote.shipment?.pol || 'Cảng đi';
  const pod = quote.shipment?.pod || 'Cảng đến';
  const carrier = quote.shipment?.carrier || 'hãng tàu chính';
  const containerType = quote.shipment?.containerType || "40'HC";
  const qty = quote.shipment?.quantity || 1;

  if (intentType === 'PDF_DOWNLOAD_AND_RETURN') {
    return {
      hookVi: `Dạ em chào ${contact}! Em gọi thăm hỏi xem bản báo giá lô hàng ${qty}x${containerType} tuyến ${pol} đi ${pod} bên em gửi đã đầy đủ thông tin để bên mình trình ban giám đốc duyệt chưa ạ?`,
      pitchVi: `Dạ ${contact} ơi, hãng ${carrier} vừa thông báo mức phụ phí có thể biến động từ tuần sau. Em gọi ngay để giúp ${customerName} giữ trước mức cước gốc và nhận thêm ưu đãi 14 ngày Free DEM/DET tại ${pod}.`,
      closingQuestionVi: `Dạ nếu các điều khoản đã phù hợp, em giữ luôn slot chuyến tàu sớm nhất và gửi Booking Confirmation qua email cho bên mình nhé ạ?`,
      zaloQuickNoteVi: `Chào ${contact}, em thấy bên mình đã xem qua file báo giá tuyến ${pol} - ${pod}. Hãng ${carrier} đang có slot cước rất tốt, ${contact} xem nếu OK báo em lock chỗ ngay kẻo lỡ chuyến tuần này nhé!`
    };
  }

  if (intentType === 'SIGNATURE_SECTION_INSPECTED') {
    return {
      hookVi: `Em chào ${contact}! Em thấy bên mình đang chuẩn bị đóng hàng cho tuyến ${pol} đi ${pod} đúng không ạ?`,
      pitchVi: `Dạ chuyến tàu hãng ${carrier} tuần này bên em vừa xin được duyệt cơ chế cấp vỏ sạch đạt chuẩn loại A kèm chính sách miễn phí lưu kho bãi mở rộng tại cảng đến ${pod}.`,
      closingQuestionVi: `Em gửi anh link ký điện tử 1-chạm hoặc làm thủ tục Booking Request luôn để kịp kéo cont đóng hàng đúng tiến độ nhé anh?`,
      zaloQuickNoteVi: `Dạ ${contact} ơi, lô hàng ${qty}x${containerType} đi ${pod} bên em đã hoàn tất mọi điều khoản ưu đãi. Em gửi link xác nhận đặt chỗ, ${contact} bấm duyệt là em cho xe kéo cont qua bốc ngay ạ!`
    };
  }

  // Default: Multiple revisits or deep dwell
  return {
    hookVi: `Dạ em chào ${contact}! Em vừa rà soát lại tiến độ lô hàng xuất khẩu ${qty}x${containerType} đi ${pod} của bên mình, thấy chuyến tàu của ${carrier} vừa mở thêm slot cước đặc biệt.`,
    pitchVi: `Em biết ${customerName} đang cân nhắc kỹ về chi phí và thời gian chuyển tải. Chuyến này bên em hỗ trợ kiểm soát 100% không rớt tàu (No-roll guarantee) và giá đã bao gồm trọn gói phụ phí.`,
    closingQuestionVi: `Nếu ${contact} duyệt sớm trong hôm nay, em giữ luôn slot cước này và gửi mã xác nhận đặt chỗ cho bên mình được không ạ?`,
    zaloQuickNoteVi: `${contact} ơi, báo giá ${quote.quoteNumber} tuyến ${pol} đi ${pod} bên em đang giữ giá tốt nhất thị trường tuần này. ${contact} xem duyệt sớm giúp em để em khóa cước ưu đãi nhé!`
  };
}

/**
 * Mô phỏng tương tác của khách hàng (Dùng để kiểm thử & kích hoạt radar tương tác)
 */
export function simulateCustomerInteraction(
  quote: QuoteData,
  eventType: ReadReceiptEventType = 'LINK_OPENED'
): { receipt: QuotationReadReceipt; lead: GoldenHourLeadEvent } {
  const now = new Date().toISOString();
  const receiptId = `rcpt-sim-${Date.now()}`;
  
  let eventTitleVi = 'Khách hàng vừa mở xem link báo giá trực tuyến';
  let triggerType: IntentTriggerType = 'MULTIPLE_REVISITS_SAME_DAY';
  let triggerTitleVi = 'Khách Vừa Mở Xem Báo Giá Trực Tuyến';
  let triggerDescVi = 'Khách hàng đang online tại mục Bảng Cước Biển. Đây là khung giờ vàng để liên hệ hỗ trợ!';

  if (eventType === 'PDF_DOWNLOADED') {
    eventTitleVi = 'Đã tải tệp Báo Giá PDF A4 chính thức về máy tính';
    triggerType = 'PDF_DOWNLOAD_AND_RETURN';
    triggerTitleVi = 'Khách Vừa Tải File PDF Báo Giá Về Máy';
    triggerDescVi = 'Khách đã tải bản in A4 về máy (thường để in trình ký hoặc gửi nội bộ). Cần gọi ngay để giải đáp các phụ phí trước khi khách so sánh đối thủ!';
  } else if (eventType === 'SIGNATURE_SECTION') {
    eventTitleVi = 'Khách đang xem kỹ mục Điều Khoản & Ký Duyệt';
    triggerType = 'SIGNATURE_SECTION_INSPECTED';
    triggerTitleVi = 'Đang Xem Mục Chữ Ký & Điều Khoản Phê Duyệt';
    triggerDescVi = 'Khách dừng lại ở khu vực ký duyệt và thời hạn thanh toán. Rất có thể chuẩn bị ra quyết định chốt đơn!';
  } else if (eventType === 'DWELL_PRICING') {
    eventTitleVi = 'Khách dừng lại đọc kỹ bảng cước & chi phí phụ';
    triggerType = 'DEEP_DWELL_ON_PRICING';
    triggerTitleVi = 'Dừng Lại Hơn 60 Giây Tại Bảng Chi Phí Cước';
    triggerDescVi = 'Khách đang cân nhắc chi tiết từng dòng phí (Ocean Freight / Local Charges). Cơ hội tuyệt vời để tư vấn tối ưu cước!';
  }

  const receipt: QuotationReadReceipt = {
    id: receiptId,
    quotationId: quote.id || quote.quoteNumber,
    quotationNumber: quote.quoteNumber,
    customerName: quote.customer?.companyName || quote.customer?.customerName || 'Khách hàng',
    contactPerson: quote.customer?.contactPerson || 'Phụ trách XNK',
    customerPhone: quote.customer?.phone || '0901234567',
    eventType,
    eventTitleVi,
    device: 'Mobile (iPhone / Android)',
    ipLocation: 'TP. Hồ Chí Minh, VN',
    timestamp: now,
    dwellTimeSeconds: 85,
    isCurrentlyOnline: true,
    pageSection: eventType === 'SIGNATURE_SECTION' ? 'Điều khoản thanh toán' : 'Bảng cước chính'
  };

  recordQuotationReadReceipt(receipt);

  // Cập nhật hoặc tạo Golden Lead Event
  const leadId = `gh-lead-${quote.id || quote.quoteNumber}`;
  const existingLeadIdx = memoryGoldenLeads.findIndex(l => l.quotationId === quote.id || l.quotationNumber === quote.quoteNumber);

  const callScript = generateScriptForQuote(quote, triggerType);

  const newLead: GoldenHourLeadEvent = {
    id: leadId,
    quotationId: quote.id || quote.quoteNumber,
    quotationNumber: quote.quoteNumber,
    customerName: quote.customer?.companyName || quote.customer?.customerName || 'Khách hàng',
    contactPerson: quote.customer?.contactPerson || 'Phụ trách XNK',
    customerPhone: quote.customer?.phone || '0901234567',
    customerEmail: quote.customer?.email || 'customer@logistics.vn',
    carrier: quote.shipment?.carrier || 'Hãng tàu chính',
    pol: quote.shipment?.pol || 'Cảng đi',
    pod: quote.shipment?.pod || 'Cảng đến',
    grandTotalUsd: quote.grandTotalUsd || 5000,
    intentLevel: eventType === 'SIGNATURE_SECTION' ? 'READY_TO_BUY' : 'PRICE_EVALUATION',
    intentScore: eventType === 'SIGNATURE_SECTION' ? 96 : 88,
    triggerType,
    triggerTitleVi,
    triggerDescriptionVi: triggerDescVi,
    detectedAt: now,
    goldenWindowRemainingMinutes: 45,
    isCurrentlyOnline: true,
    viewCountTotal: (existingLeadIdx >= 0 ? memoryGoldenLeads[existingLeadIdx].viewCountTotal + 1 : 1),
    timeSpentSeconds: 120,
    callScript,
    isFollowedUp: false
  };

  if (existingLeadIdx >= 0) {
    memoryGoldenLeads[existingLeadIdx] = newLead;
  } else {
    memoryGoldenLeads.unshift(newLead);
  }

  return { receipt, lead: newLead };
}

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

