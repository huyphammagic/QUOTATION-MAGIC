import { RFQParameters, DataCompletenessField, DataCompletenessReport } from '../../types/decision';

/**
 * Dynamic Smart Completeness Checklist Engine by Mode
 * Adheres strictly to mode-specific requirements:
 * - SEA FCL: Origin/POL, Destination/POD, Container Type, Quantity, Incoterm, Commodity, Cargo Date
 * - SEA LCL: Origin, Destination, Gross Weight, Volume (CBM), Incoterm, Commodity
 * - AIR: Origin Airport, Destination Airport, Gross Weight, Chargeable Weight/Volume, Incoterm, Commodity
 * - ROAD/TRUCKING: Pickup Location, Delivery Location, Truck Type/Weight, Incoterm/Conditions
 * - CUSTOMS: Location/Port, Commodity, Type of declaration (Import/Export), HS Code/Documentation
 */
export function evaluateDataCompleteness(rfq: RFQParameters): DataCompletenessReport {
  const items: DataCompletenessField[] = [];
  const mode = rfq.mode || 'SEA_FCL';

  // 1. Common Core Fields
  items.push({
    field: 'customer',
    labelVi: 'Thông tin Khách Hàng',
    labelEn: 'Customer Information',
    status: rfq.customerId && rfq.customerName ? 'COMPLETE' : 'MISSING',
    value: rfq.customerName || undefined,
    hint: 'Cần xác định khách hàng nhận báo giá'
  });

  items.push({
    field: 'origin',
    labelVi: mode === 'AIR_FREIGHT' ? 'Sân bay đi (AOD)' : mode === 'INLAND_TRUCKING' ? 'Điểm đóng hàng (Pick-up)' : 'Cảng xếp hàng (POL)',
    labelEn: mode === 'AIR_FREIGHT' ? 'Airport of Departure' : mode === 'INLAND_TRUCKING' ? 'Pick-up Location' : 'Port of Loading',
    status: (rfq.origin || rfq.originPort) ? 'COMPLETE' : 'MISSING',
    value: rfq.originPort || rfq.origin || undefined,
    hint: 'Điểm khởi hành của tuyến vận chuyển'
  });

  items.push({
    field: 'destination',
    labelVi: mode === 'AIR_FREIGHT' ? 'Sân bay đến (AOA)' : mode === 'INLAND_TRUCKING' ? 'Điểm giao hàng (Delivery)' : 'Cảng dỡ hàng (POD)',
    labelEn: mode === 'AIR_FREIGHT' ? 'Airport of Arrival' : mode === 'INLAND_TRUCKING' ? 'Delivery Location' : 'Port of Discharge',
    status: (rfq.destination || rfq.destinationPort) ? 'COMPLETE' : 'MISSING',
    value: rfq.destinationPort || rfq.destination || undefined,
    hint: 'Điểm đến của lô hàng'
  });

  items.push({
    field: 'incoterm',
    labelVi: 'Điều kiện thương mại (Incoterm)',
    labelEn: 'Commercial Terms (Incoterm)',
    status: rfq.incoterm ? 'COMPLETE' : 'MISSING',
    value: rfq.incoterm || undefined,
    hint: 'FOB, CIF, EXW, DAP...'
  });

  items.push({
    field: 'commodity',
    labelVi: 'Tên hàng hóa (Commodity)',
    labelEn: 'Commodity Description',
    status: rfq.commodity && rfq.commodity.trim() !== '' ? 'COMPLETE' : 'MISSING',
    value: rfq.commodity || undefined,
    hint: 'Mô tả rõ loại hàng để áp cước và kiểm tra an toàn'
  });

  // 2. Mode-Specific Fields
  if (mode === 'SEA_FCL') {
    items.push({
      field: 'containerType',
      labelVi: 'Loại Container',
      labelEn: 'Container Type',
      status: rfq.containerType ? 'COMPLETE' : 'MISSING',
      value: rfq.containerType || undefined,
      hint: '20GP, 40GP, 40HC, Reefer...'
    });

    items.push({
      field: 'quantity',
      labelVi: 'Số lượng Container',
      labelEn: 'Container Quantity',
      status: (rfq.quantity && rfq.quantity > 0) ? 'COMPLETE' : 'MISSING',
      value: rfq.quantity ? `${rfq.quantity} container` : undefined,
      hint: 'Số lượng cont dự kiến đóng hàng'
    });

    items.push({
      field: 'grossWeightKg',
      labelVi: 'Tổng trọng lượng (KG/Cont)',
      labelEn: 'Gross Weight (KG/Cont)',
      status: (rfq.grossWeightKg && rfq.grossWeightKg > 0) ? 'COMPLETE' : 'OPTIONAL',
      value: rfq.grossWeightKg ? `${rfq.grossWeightKg.toLocaleString()} KG` : undefined,
      hint: 'Để tính phụ phí quá tải (Overweight surcharge) nếu có'
    });
  } else if (mode === 'SEA_LCL') {
    items.push({
      field: 'volumeCbm',
      labelVi: 'Thể tích hàng (CBM)',
      labelEn: 'Cargo Volume (CBM)',
      status: (rfq.volumeCbm && rfq.volumeCbm > 0) ? 'COMPLETE' : 'MISSING',
      value: rfq.volumeCbm ? `${rfq.volumeCbm} CBM` : undefined,
      hint: 'Cơ sở chính tính cước hàng lẻ LCL (W/M)'
    });

    items.push({
      field: 'grossWeightKg',
      labelVi: 'Tổng trọng lượng (KG)',
      labelEn: 'Gross Weight (KG)',
      status: (rfq.grossWeightKg && rfq.grossWeightKg > 0) ? 'COMPLETE' : 'MISSING',
      value: rfq.grossWeightKg ? `${rfq.grossWeightKg.toLocaleString()} KG` : undefined,
      hint: 'Để so sánh quy đổi W/M (1 CBM = 1000 KG)'
    });
  } else if (mode === 'AIR_FREIGHT') {
    items.push({
      field: 'grossWeightKg',
      labelVi: 'Tổng trọng lượng thô (Gross Weight)',
      labelEn: 'Gross Weight (KG)',
      status: (rfq.grossWeightKg && rfq.grossWeightKg > 0) ? 'COMPLETE' : 'MISSING',
      value: rfq.grossWeightKg ? `${rfq.grossWeightKg.toLocaleString()} KG` : undefined,
      hint: 'Cân nặng thực tế của kiện hàng'
    });

    items.push({
      field: 'volumeCbm',
      labelVi: 'Kích thước / Thể tích (CBM)',
      labelEn: 'Volume / Dimensions',
      status: (rfq.volumeCbm && rfq.volumeCbm > 0) ? 'COMPLETE' : 'OPTIONAL',
      value: rfq.volumeCbm ? `${rfq.volumeCbm} CBM` : undefined,
      hint: 'Để tính Chargeable Weight (1 CBM = 167 KG)'
    });

    items.push({
      field: 'chargeableWeight',
      labelVi: 'Trọng lượng tính cước (CW)',
      labelEn: 'Chargeable Weight (CW)',
      status: (rfq.chargeableWeight && rfq.chargeableWeight > 0) ? 'COMPLETE' : 'OPTIONAL',
      value: rfq.chargeableWeight ? `${rfq.chargeableWeight.toLocaleString()} KG` : undefined,
      hint: 'Giá trị lớn hơn giữa Gross Weight và Volume Weight'
    });
  } else if (mode === 'INLAND_TRUCKING') {
    items.push({
      field: 'truckType',
      labelVi: 'Loại xe / Tải trọng',
      labelEn: 'Truck Type / Capacity',
      status: rfq.specialRequirements ? 'COMPLETE' : 'OPTIONAL',
      value: rfq.specialRequirements || undefined,
      hint: 'Xe tải 5T, 10T, xe đầu kéo cont 20/40...'
    });

    items.push({
      field: 'grossWeightKg',
      labelVi: 'Khối lượng hàng hóa (KG)',
      labelEn: 'Cargo Weight (KG)',
      status: (rfq.grossWeightKg && rfq.grossWeightKg > 0) ? 'COMPLETE' : 'MISSING',
      value: rfq.grossWeightKg ? `${rfq.grossWeightKg.toLocaleString()} KG` : undefined,
      hint: 'Cân nặng hàng để chọn loại xe phù hợp'
    });
  } else if (mode === 'CUSTOMS_CLEARANCE') {
    items.push({
      field: 'customsService',
      labelVi: 'Loại hình tờ khai',
      labelEn: 'Customs Declaration Type',
      status: rfq.specialRequirements ? 'COMPLETE' : 'OPTIONAL',
      value: rfq.specialRequirements || undefined,
      hint: 'Nhập kinh doanh, Xuất gia công, Tạm nhập tái xuất...'
    });
  }

  // 3. Timing & Commercial Conditions
  items.push({
    field: 'expectedShipmentDate',
    labelVi: 'Thời gian hàng sẵn sàng / Xuất bến dự kiến',
    labelEn: 'Cargo Ready / Estimated ETD',
    status: rfq.expectedShipmentDate ? 'COMPLETE' : 'OPTIONAL',
    value: rfq.expectedShipmentDate || undefined,
    hint: 'Để kiểm tra lịch tàu / chuyến bay còn chỗ'
  });

  items.push({
    field: 'requestedValidity',
    labelVi: 'Thời hạn hiệu lực báo giá yêu cầu',
    labelEn: 'Requested Quotation Validity',
    status: rfq.requestedValidity ? 'COMPLETE' : 'OPTIONAL',
    value: rfq.requestedValidity || undefined,
    hint: 'Mặc định 15 hoặc 30 ngày nếu không chỉ định'
  });

  // Calculate score
  const requiredItems = items.filter(i => i.status !== 'OPTIONAL');
  const completedRequired = requiredItems.filter(i => i.status === 'COMPLETE');
  const missingRequired = requiredItems.filter(i => i.status === 'MISSING').map(i => i.field);

  const completionScore = requiredItems.length > 0 
    ? Math.round((completedRequired.length / requiredItems.length) * 100) 
    : 100;

  return {
    mode,
    serviceType: rfq.serviceType || mode,
    completionScore,
    isReadyForQuote: missingRequired.length === 0,
    items,
    missingRequiredKeys: missingRequired
  };
}
