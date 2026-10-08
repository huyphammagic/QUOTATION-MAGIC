import { 
  ParsedDocumentData, 
  LogisticsDocumentType, 
  CrossCheckResult, 
  CrossCheckFieldResult 
} from '../../types/documentParser';
import { QuoteData, LineItem, CustomerInfo, ShipmentDetails, TransportMode, ContainerType } from '../../types/logistics';
import { generateQuoteNumber, calculateLineItem } from '../../utils/formatters';

export interface ParseDocumentRequest {
  fileBase64?: string;
  mimeType?: string;
  fileName?: string;
  rawText?: string;
  docTypeHint?: LogisticsDocumentType;
}

export async function parseDocumentWithAi(params: ParseDocumentRequest): Promise<ParsedDocumentData> {
  const startTime = Date.now();
  try {
    const response = await fetch('/api/gemini/parse-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP ${response.status}: Failed to parse document`);
    }

    const data = await response.json();
    if (!data.success || !data.parsedData) {
      throw new Error(data.error || 'Server did not return parsed document data');
    }

    const result: ParsedDocumentData = {
      ...data.parsedData,
      id: data.parsedData.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      parsedAt: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime,
      fileName: params.fileName || 'Chung_tu_logistics',
      fileType: params.mimeType || 'application/pdf',
      fileSize: params.fileBase64 ? Math.round((params.fileBase64.length * 3) / 4) : 0,
      previewUrl: params.fileBase64 ? `data:${params.mimeType || 'image/jpeg'};base64,${params.fileBase64}` : undefined,
      rawText: data.parsedData.rawText || params.rawText,
    };

    return result;
  } catch (error: any) {
    console.warn('AI Document Parse server failed, falling back to heuristic parsing:', error);
    // Graceful fallback for offline or network issues using heuristic parser
    return fallbackHeuristicParser(params, startTime);
  }
}

/**
 * Heuristic fallback parser when AI endpoint is not reachable
 */
function fallbackHeuristicParser(params: ParseDocumentRequest, startTime: number): ParsedDocumentData {
  const text = params.rawText || '';
  const isBL = /bill of lading|b\/l|ocean bill/i.test(text);
  const isBooking = /booking|xác nhận đặt chỗ/i.test(text);
  const isInvoice = /commercial invoice|hóa đơn/i.test(text);
  const isCustoms = /tờ khai|vnaccs|customs declaration/i.test(text);

  let docType: LogisticsDocumentType = 'BILL_OF_LADING';
  let docTypeNameVi = 'Vận Đơn Đường Biển (B/L)';
  if (isBooking) {
    docType = 'BOOKING_CONFIRMATION';
    docTypeNameVi = 'Xác Nhận Đặt Chỗ Hãng Tàu (Booking)';
  } else if (isInvoice) {
    docType = 'COMMERCIAL_INVOICE';
    docTypeNameVi = 'Hóa Đơn Thương Mại (Commercial Invoice)';
  } else if (isCustoms) {
    docType = 'CUSTOMS_DECLARATION';
    docTypeNameVi = 'Tờ Khai Hải Quan Điện Tử (VNACCS)';
  }

  // Regex extract common patterns
  const polMatch = text.match(/(?:POL|Port of Loading|Cảng xếp|Cảng đi)[:\s]+([^\n\r,]+)/i);
  const podMatch = text.match(/(?:POD|Port of Discharge|Cảng dỡ|Cảng đến)[:\s]+([^\n\r,]+)/i);
  const contMatch = text.match(/([A-Z]{4}\d{7})/);
  const sealMatch = text.match(/(?:seal|chì)[:\s#]+([A-Z0-9-]+)/i);
  const weightMatch = text.match(/(?:gross weight|tổng trọng lượng|GW)[:\s]+([0-9.,]+)\s*(?:kgs|kg|tấn)/i);
  const cbmMatch = text.match(/(?:cbm|measurement|thể tích)[:\s]+([0-9.,]+)/i);

  const pol = polMatch ? polMatch[1].trim() : 'Cat Lai Port, Ho Chi Minh';
  const pod = podMatch ? podMatch[1].trim() : 'Port of Discharge';
  const grossWeightKg = weightMatch ? parseFloat(weightMatch[1].replace(/,/g, '')) : 15000;
  const volumeCbm = cbmMatch ? parseFloat(cbmMatch[1].replace(/,/g, '')) : 40;

  return {
    id: `doc_fb_${Date.now()}`,
    documentType: docType,
    documentTypeNameVi: docTypeNameVi,
    documentNumber: `DOC-${Date.now().toString().slice(-6)}`,
    issueDate: new Date().toISOString().split('T')[0],
    carrierOrIssuer: 'Hãng Tàu / Cơ Quan Vận Chuyển',
    shipper: {
      name: 'Doanh Nghiệp Xuất Khẩu (Shipper)',
      address: 'Việt Nam',
    },
    consignee: {
      name: 'Doanh Nghiệp Nhập Khẩu (Consignee)',
      address: 'Destination Country',
    },
    mode: 'SEA_FCL',
    pol,
    pod,
    commodity: 'Hàng Hóa Tổng Hợp (General Cargo)',
    containerType: "40'HC",
    containerCount: 1,
    packageCount: 500,
    packageUnit: 'Cartons',
    grossWeightKg,
    netWeightKg: Math.round(grossWeightKg * 0.9),
    volumeCbm,
    chargeableWeightKg: grossWeightKg,
    containers: contMatch ? [
      {
        id: 'c1',
        containerNo: contMatch[1],
        sealNo: sealMatch ? sealMatch[1] : 'SEAL-01',
        type: "40'HC",
        grossWeightKg,
      }
    ] : [],
    incoterm: 'FOB',
    currency: 'USD',
    charges: [],
    confidenceScore: 82,
    fieldConfidence: {
      pol: 85,
      pod: 85,
      grossWeightKg: 80,
      containerNo: contMatch ? 95 : 50,
    },
    warnings: ['Đang áp dụng bộ phân tích Heuristic do chưa kết nối được máy chủ AI Gemini.'],
    extractionNotes: ['Đã trích xuất cấu trúc cơ bản từ văn bản chứng từ.'],
    rawSummary: `${docTypeNameVi} | Tuyến: ${pol} -> ${pod} | Trọng lượng: ${grossWeightKg} KGS`,
    parsedAt: new Date().toISOString(),
    processingTimeMs: Date.now() - startTime,
    fileName: params.fileName || 'document.pdf',
    fileType: params.mimeType || 'application/pdf',
    fileSize: 1024,
    rawText: text,
  };
}

/**
 * Cross-Check discrepancies between two documents (e.g., Booking Confirmation vs Bill of Lading, or B/L vs Commercial Invoice)
 */
export function crossCheckDocuments(docA: ParsedDocumentData, docB: ParsedDocumentData): CrossCheckResult {
  const fields: CrossCheckFieldResult[] = [];
  const criticalAlerts: string[] = [];
  const recommendations: string[] = [];

  // 1. Check Gross Weight
  const diffWeight = Math.abs((docA.grossWeightKg || 0) - (docB.grossWeightKg || 0));
  if (diffWeight === 0) {
    fields.push({
      fieldName: 'grossWeightKg',
      labelVi: 'Tổng Trọng Lượng Gross (KG)',
      valueDocA: `${docA.grossWeightKg.toLocaleString()} KGS`,
      valueDocB: `${docB.grossWeightKg.toLocaleString()} KGS`,
      status: 'MATCH',
      message: 'Khớp chính xác 100%',
    });
  } else if (diffWeight < 50) {
    fields.push({
      fieldName: 'grossWeightKg',
      labelVi: 'Tổng Trọng Lượng Gross (KG)',
      valueDocA: `${docA.grossWeightKg.toLocaleString()} KGS`,
      valueDocB: `${docB.grossWeightKg.toLocaleString()} KGS`,
      status: 'WARNING',
      message: `Chênh lệch nhỏ: ${diffWeight.toFixed(1)} KGS (nằm trong dung sai cho phép)`,
    });
  } else {
    fields.push({
      fieldName: 'grossWeightKg',
      labelVi: 'Tổng Trọng Lượng Gross (KG)',
      valueDocA: `${docA.grossWeightKg.toLocaleString()} KGS`,
      valueDocB: `${docB.grossWeightKg.toLocaleString()} KGS`,
      status: 'MISMATCH',
      message: `CẢNH BÁO: Lệch ${diffWeight.toLocaleString()} KGS! Nguy cơ bị phạt sửa B/L hoặc hạ bãi sai VGM.`,
    });
    criticalAlerts.push(`Lệch trọng lượng hàng hóa ${diffWeight.toLocaleString()} KGS giữa ${docA.documentNumber} và ${docB.documentNumber}.`);
  }

  // 2. Check Container Numbers
  const contsA = docA.containers.map(c => c.containerNo.trim().toUpperCase()).filter(Boolean);
  const contsB = docB.containers.map(c => c.containerNo.trim().toUpperCase()).filter(Boolean);
  if (contsA.length > 0 && contsB.length > 0) {
    const isContsMatch = contsA.length === contsB.length && contsA.every(c => contsB.includes(c));
    if (isContsMatch) {
      fields.push({
        fieldName: 'containers',
        labelVi: 'Số Container & Danh Sách Vỏ',
        valueDocA: contsA.join(', '),
        valueDocB: contsB.join(', '),
        status: 'MATCH',
        message: 'Khớp toàn bộ các số container',
      });
    } else {
      fields.push({
        fieldName: 'containers',
        labelVi: 'Số Container & Danh Sách Vỏ',
        valueDocA: contsA.join(', '),
        valueDocB: contsB.join(', '),
        status: 'MISMATCH',
        message: 'Không khớp số cont! Kiểm tra lại biên bản cấp vỏ hoặc VGM.',
      });
      criticalAlerts.push('Danh sách số container không trùng khớp giữa hai chứng từ.');
    }
  }

  // 3. Check POL & POD
  const polMatch = docA.pol.toLowerCase().includes(docB.pol.toLowerCase()) || docB.pol.toLowerCase().includes(docA.pol.toLowerCase());
  fields.push({
    fieldName: 'pol',
    labelVi: 'Cảng Bốc Hàng (POL)',
    valueDocA: docA.pol,
    valueDocB: docB.pol,
    status: polMatch ? 'MATCH' : 'MISMATCH',
    message: polMatch ? 'Khớp cảng đi' : 'Cảng đi khác biệt, vui lòng xác nhận lại tuyến',
  });

  const podMatch = docA.pod.toLowerCase().includes(docB.pod.toLowerCase()) || docB.pod.toLowerCase().includes(docA.pod.toLowerCase());
  fields.push({
    fieldName: 'pod',
    labelVi: 'Cảng Dỡ Hàng (POD)',
    valueDocA: docA.pod,
    valueDocB: docB.pod,
    status: podMatch ? 'MATCH' : 'MISMATCH',
    message: podMatch ? 'Khớp cảng đến' : 'Cảng đến không đồng nhất',
  });

  // 4. Check Package Count
  if (docA.packageCount && docB.packageCount) {
    const isPackMatch = docA.packageCount === docB.packageCount;
    fields.push({
      fieldName: 'packageCount',
      labelVi: 'Số Lượng Kiện Hàng (Packages)',
      valueDocA: `${docA.packageCount} ${docA.packageUnit || ''}`,
      valueDocB: `${docB.packageCount} ${docB.packageUnit || ''}`,
      status: isPackMatch ? 'MATCH' : 'MISMATCH',
      message: isPackMatch ? 'Khớp số kiện' : `Chênh lệch ${Math.abs(docA.packageCount - docB.packageCount)} kiện`,
    });
    if (!isPackMatch) {
      criticalAlerts.push(`Số kiện đóng gói không khớp: ${docA.packageCount} kiện vs ${docB.packageCount} kiện.`);
    }
  }

  // Calculate Overall Match Score
  const matchCount = fields.filter(f => f.status === 'MATCH').length;
  const warningCount = fields.filter(f => f.status === 'WARNING').length;
  const total = fields.length || 1;
  const overallMatchScore = Math.round(((matchCount * 1.0 + warningCount * 0.5) / total) * 100);

  if (criticalAlerts.length === 0) {
    recommendations.push('Hai chứng từ có độ tương thích cao, đủ điều kiện làm bộ chứng từ thông quan và phát hành.');
  } else {
    recommendations.push('Yêu cầu Shipper hoặc Đại lý làm thủ tục Amendment (sửa đổi) trước thời hạn Cut-off SI.');
  }

  return {
    docAId: docA.id,
    docBId: docB.id,
    docAName: `${docA.documentTypeNameVi} (${docA.documentNumber})`,
    docBName: `${docB.documentTypeNameVi} (${docB.documentNumber})`,
    overallMatchScore,
    checkedAt: new Date().toISOString(),
    fields,
    criticalAlerts,
    recommendations,
  };
}

/**
 * Convert or merge parsed document data into QuoteData
 */
export function populateQuotationFromDocument(
  currentQuote: QuoteData,
  doc: ParsedDocumentData,
  mode: 'merge' | 'replace'
): QuoteData {
  const updatedCustomer: CustomerInfo = {
    ...currentQuote.customer,
    customerName: doc.shipper.contactPerson || doc.shipper.name || currentQuote.customer.customerName,
    companyName: doc.shipper.name || currentQuote.customer.companyName,
    address: doc.shipper.address || currentQuote.customer.address,
    phone: doc.shipper.phone || currentQuote.customer.phone,
    email: doc.shipper.email || currentQuote.customer.email,
    taxId: doc.shipper.taxId || currentQuote.customer.taxId,
  };

  const updatedShipment: ShipmentDetails = {
    ...currentQuote.shipment,
    mode: doc.mode || currentQuote.shipment.mode || 'SEA_FCL',
    pol: doc.pol || currentQuote.shipment.pol,
    pod: doc.pod || currentQuote.shipment.pod,
    commodity: doc.commodity || currentQuote.shipment.commodity,
    containerType: doc.containerType || currentQuote.shipment.containerType || "40'HC",
    quantity: doc.containerCount || currentQuote.shipment.quantity || 1,
    grossWeightKg: doc.grossWeightKg || currentQuote.shipment.grossWeightKg || 0,
    volumeCbm: doc.volumeCbm || currentQuote.shipment.volumeCbm || 0,
    chargeableWeight: doc.chargeableWeightKg || currentQuote.shipment.chargeableWeight || 0,
    transitTime: doc.transitTime || currentQuote.shipment.transitTime,
    freeTime: doc.freeTimeDemDet || currentQuote.shipment.freeTime,
    carrier: doc.carrierOrIssuer || currentQuote.shipment.carrier,
    etd: doc.etd || currentQuote.shipment.etd,
    eta: doc.eta || currentQuote.shipment.eta,
  };

  // Convert charges if available
  let updatedItems: LineItem[] = [...currentQuote.items];
  if (doc.charges && doc.charges.length > 0) {
    const docItems: LineItem[] = doc.charges.map((ch, idx) => {
      const isUsd = ch.currency === 'USD';
      const unitPrice = ch.amount;
      const exchangeRate = currentQuote.exchangeRate || 25400;
      const unitPriceUsd = isUsd ? unitPrice : unitPrice / exchangeRate;
      const unitPriceVnd = isUsd ? unitPrice * exchangeRate : unitPrice;

      return {
        id: `ocr_item_${Date.now()}_${idx}`,
        code: ch.code,
        description: ch.description,
        category: (ch.category as any) || 'LOCAL_CHARGE',
        location: ch.code === 'O/F' ? 'FREIGHT' : 'POL',
        basis: 'PER_CONTAINER',
        quantity: updatedShipment.quantity,
        unit: ch.unit || 'Container',
        unitPrice,
        currency: ch.currency,
        vatRate: 0,
        amountUsd: unitPriceUsd * updatedShipment.quantity,
        amountVnd: unitPriceVnd * updatedShipment.quantity,
      };
    });

    if (mode === 'replace') {
      updatedItems = docItems;
    } else {
      // Append non-duplicate charges
      const existingCodes = new Set(updatedItems.map(i => i.code.toUpperCase()));
      for (const dItem of docItems) {
        if (!existingCodes.has(dItem.code.toUpperCase())) {
          updatedItems.push(dItem);
        }
      }
    }
  }

  const docNotes = [
    currentQuote.terms?.exclusionsNotes || '',
    `[Trích xuất từ ${doc.documentTypeNameVi} #${doc.documentNumber} ngày ${doc.issueDate || 'gần đây'}]`,
    doc.containers.length > 0 ? `Số cont: ${doc.containers.map(c => `${c.containerNo} (Chì: ${c.sealNo})`).join(', ')}` : '',
    doc.cyCutOff ? `Hạn Closing time CY: ${doc.cyCutOff}` : '',
  ].filter(Boolean).join('\n');

  return {
    ...currentQuote,
    customer: updatedCustomer,
    shipment: updatedShipment,
    items: updatedItems,
    terms: {
      ...currentQuote.terms,
      exclusionsNotes: docNotes,
      incoterm: (doc.incoterm as any) || currentQuote.terms?.incoterm || 'FOB',
    },
    quoteNumber: mode === 'replace' ? generateQuoteNumber() : currentQuote.quoteNumber,
  };
}
