import { ParsedDocumentData } from '../types/documentParser';

export const SAMPLE_REAL_LOGISTICS_DOCUMENTS: ParsedDocumentData[] = [
  {
    id: 'sample_bl_maersk_01',
    documentType: 'BILL_OF_LADING',
    documentTypeNameVi: 'Vận Đơn Đường Biển (Maersk Ocean B/L)',
    documentNumber: 'MSK2026881923',
    issueDate: '2026-10-04',
    carrierOrIssuer: 'MAERSK LINE A/S',
    bookingReference: 'BKG-MSK-VN-88319',
    blNumber: 'MSK2026881923',
    vesselOrFlight: 'MAERSK MC-KINNEY MOLLER',
    voyageNo: '2603E',
    shipper: {
      name: 'CÔNG TY TNHH MAY MẶC XUẤT KHẨU VIỆT THÀNH',
      taxId: '3702849182',
      address: 'Số 18 Đường ĐT743, KCN VSIP 1, TP. Thuận An, Tỉnh Bình Dương, Việt Nam',
      phone: '+84 274 378 9922',
      email: 'logistics@vietthanhgarments.com',
      contactPerson: 'Trần Minh Trí',
    },
    consignee: {
      name: 'PACIFIC APPAREL WHOLESALE INC.',
      address: '2450 E ARTESIA BLVD, LONG BEACH, CA 90805, UNITED STATES',
      phone: '+1 562 890 4110',
      email: 'import.ops@pacificapparel.us',
      contactPerson: 'David Miller',
    },
    notifyParty: {
      name: 'SAME AS CONSIGNEE',
      address: '2450 E ARTESIA BLVD, LONG BEACH, CA 90805, USA',
    },
    mode: 'SEA_FCL',
    pol: 'Cat Lai Port, Ho Chi Minh, Vietnam',
    pod: 'Port of Long Beach, CA, USA',
    placeOfReceipt: 'Cat Lai ICD, Ho Chi Minh',
    placeOfDelivery: 'Long Beach Terminal, Pier T',
    etd: '2026-10-08',
    eta: '2026-10-26',
    transitTime: '18 - 20 ngày',
    freeTimeDemDet: '14 ngày DEM/DET kết hợp tại Cảng Đích',
    commodity: '100% Cotton Knitted T-Shirts & Polo Garments for Men',
    containerType: "40'HC",
    containerCount: 1,
    packageCount: 1240,
    packageUnit: 'Cartons',
    grossWeightKg: 18500,
    netWeightKg: 16800,
    volumeCbm: 65.4,
    chargeableWeightKg: 18500,
    hsCode: '6109.10.00',
    marksAndNumbers: 'PACIFIC APPAREL / PO#99201 / MADE IN VIETNAM / C/NO. 1-1240',
    containers: [
      {
        id: 'cont_1',
        containerNo: 'MSKU9081234',
        sealNo: 'ML-VN99218',
        type: "40'HC",
        tareWeightKg: 3880,
        maxPayloadKg: 28620,
        packageCount: 1240,
        grossWeightKg: 18500,
      },
    ],
    incoterm: 'FOB',
    currency: 'USD',
    charges: [
      { id: 'c1', code: 'O/F', description: 'Ocean Freight Cat Lai to Long Beach', amount: 2450, currency: 'USD', unit: 'Container', category: 'FREIGHT' },
      { id: 'c2', code: 'THC', description: 'Terminal Handling Charge at POL (Cat Lai)', amount: 140, currency: 'USD', unit: 'Container', category: 'LOCAL_CHARGE' },
      { id: 'c3', code: 'BL', description: 'Bill of Lading Issuance Fee', amount: 45, currency: 'USD', unit: 'Bill', category: 'LOCAL_CHARGE' },
      { id: 'c4', code: 'SEAL', description: 'Container High Security Seal Fee', amount: 10, currency: 'USD', unit: 'Container', category: 'LOCAL_CHARGE' },
      { id: 'c5', code: 'VGM', description: 'Verified Gross Mass Electronic Submission', amount: 25, currency: 'USD', unit: 'Container', category: 'LOCAL_CHARGE' },
    ],
    confidenceScore: 98,
    fieldConfidence: {
      documentNumber: 100,
      carrierOrIssuer: 100,
      shipper: 98,
      consignee: 97,
      pol: 99,
      pod: 99,
      containerNo: 100,
      sealNo: 99,
      grossWeightKg: 98,
      volumeCbm: 96,
    },
    warnings: [],
    extractionNotes: [
      'Nhận diện thành công Bill of Lading chính hãng Maersk Line.',
      'Khớp 100% số container MSKU9081234 và chì hải quan ML-VN99218.',
      'Đã tự động tính quy đổi trọng lượng tính cước FCL tiêu chuẩn.',
    ],
    rawSummary: 'Maersk B/L MSK2026881923 | 1x40HC 18,500 KGS / 65.4 CBM | Tuyến: Cát Lái -> Long Beach | Shipper: May mặc Việt Thành | Consignee: Pacific Apparel USA',
    parsedAt: '2026-10-08T08:30:00.000Z',
    processingTimeMs: 1420,
    fileName: 'MAERSK_BL_MSK2026881923.pdf',
    fileType: 'application/pdf',
    fileSize: 428000,
    rawText: `MAERSK LINE - BILL OF LADING FOR MULTIMODAL TRANSPORT
B/L Number: MSK2026881923  Booking No: BKG-MSK-VN-88319
Shipper: CÔNG TY TNHH MAY MẶC XUẤT KHẨU VIỆT THÀNH
Address: Số 18 Đường ĐT743, KCN VSIP 1, TP. Thuận An, Bình Dương, VN
Consignee: PACIFIC APPAREL WHOLESALE INC.
2450 E ARTESIA BLVD, LONG BEACH, CA 90805, USA
Notify Party: SAME AS CONSIGNEE
Vessel / Voyage: MAERSK MC-KINNEY MOLLER / 2603E
Port of Loading: CAT LAI PORT, HO CHI MINH, VIETNAM
Port of Discharge: PORT OF LONG BEACH, CA, USA
Place of Delivery: LONG BEACH TERMINAL PIER T
Container & Seal: MSKU9081234 / SEAL ML-VN99218 (40' HIGH CUBE)
Description of Goods: 1,240 CARTONS OF 100% COTTON KNITTED T-SHIRTS & POLO GARMENTS
Gross Weight: 18,500.00 KGS  Measurement: 65.40 CBM
HS CODE: 6109.10.00
Freight Term: FREIGHT PREPAID AS PER AGREEMENT
Free Time: 14 DAYS COMBINED DEMURRAGE AND DETENTION AT DESTINATION`,
  },
  {
    id: 'sample_booking_one_02',
    documentType: 'BOOKING_CONFIRMATION',
    documentTypeNameVi: 'Xác Nhận Đặt Chỗ (ONE Shipping Line Booking)',
    documentNumber: 'ONE-SGN-2026-9042',
    issueDate: '2026-10-06',
    carrierOrIssuer: 'OCEAN NETWORK EXPRESS (ONE)',
    bookingReference: 'ONE-SGN-2026-9042',
    vesselOrFlight: 'ONE HENRY HUDSON',
    voyageNo: '084W',
    shipper: {
      name: 'CÔNG TY CỔ PHẦN NÔNG SẢN VIỆT HƯNG',
      taxId: '0315998241',
      address: 'Km 19, Quốc lộ 1A, Huyện Bến Lức, Tỉnh Long An, Việt Nam',
      phone: '+84 272 388 1200',
      email: 'export@viethungagri.com.vn',
      contactPerson: 'Nguyễn Văn Hùng',
    },
    consignee: {
      name: 'EUROPEAN FRESH FRUITS IMPORT B.V.',
      address: 'HAVENNUMMER 3200, 3089 JK ROTTERDAM, NETHERLANDS',
      phone: '+31 10 494 2200',
      email: 'fresh@eurofruit-nl.com',
      contactPerson: 'Hans Van Dijk',
    },
    mode: 'SEA_FCL',
    pol: 'Cat Lai Port, Ho Chi Minh, Vietnam',
    pod: 'Port of Rotterdam, Netherlands',
    placeOfReceipt: 'Cat Lai Depot 2',
    placeOfDelivery: 'Rotterdam ECT Delta Terminal',
    etd: '2026-10-16',
    eta: '2026-11-12',
    cyCutOff: '2026-10-15 17:00 (Thứ Năm)',
    siCutOff: '2026-10-14 11:00 (Thứ Tư)',
    vgmCutOff: '2026-10-15 12:00 (Thứ Năm)',
    emptyDepot: 'Depot Tân Cảng Suối Tiên (Pick-up Cont Lạnh)',
    fullTerminal: 'Cảng Tân Cảng - Cát Lái (Bãi Lạnh)',
    transitTime: '26 - 28 ngày',
    freeTimeDemDet: '14 Days Combined Dem/Det (Plug-in 3 days included)',
    commodity: 'Thanh Long Ruột Đỏ & Chanh Leo Đông Lạnh (Frozen Dragon Fruit)',
    containerType: "40'RF",
    containerCount: 2,
    packageCount: 2400,
    packageUnit: 'Thùng carton',
    grossWeightKg: 44000,
    netWeightKg: 40000,
    volumeCbm: 128.0,
    chargeableWeightKg: 44000,
    hsCode: '0810.90.92',
    temperatureSetting: '-18.0°C (Vent: Closed, Humidity: 85%)',
    containers: [
      {
        id: 'cont_rf_1',
        containerNo: 'ONEY1192834',
        sealNo: 'ONE-VN-8812',
        type: "40'RF",
        packageCount: 1200,
        grossWeightKg: 22000,
      },
      {
        id: 'cont_rf_2',
        containerNo: 'ONEY1192835',
        sealNo: 'ONE-VN-8813',
        type: "40'RF",
        packageCount: 1200,
        grossWeightKg: 22000,
      },
    ],
    incoterm: 'CIF',
    currency: 'USD',
    charges: [
      { id: 'b1', code: 'O/F', description: 'Reefer Ocean Freight SGN to Rotterdam', amount: 3600, currency: 'USD', unit: 'Container', category: 'FREIGHT' },
      { id: 'b2', code: 'THC', description: 'Reefer Terminal Handling Charge (Cát Lái)', amount: 210, currency: 'USD', unit: 'Container', category: 'LOCAL_CHARGE' },
      { id: 'b3', code: 'PLUG', description: 'Reefer Monitoring & Electricity Plug-in', amount: 80, currency: 'USD', unit: 'Container', category: 'LOCAL_CHARGE' },
      { id: 'b4', code: 'PTI', description: 'Pre-Trip Inspection Cleanliness Test', amount: 30, currency: 'USD', unit: 'Container', category: 'LOCAL_CHARGE' },
    ],
    confidenceScore: 96,
    fieldConfidence: {
      documentNumber: 100,
      carrierOrIssuer: 99,
      cyCutOff: 98,
      siCutOff: 97,
      temperatureSetting: 100,
      pol: 99,
      pod: 99,
    },
    warnings: [
      'Lưu ý hạn chót SI Cut-off sớm hơn CY Cut-off 24 tiếng (Hạn SI: 14/10 11:00).',
      'Yêu cầu theo dõi cắm điện lạnh (Plug-in) và nhiệt độ cài đặt -18°C.',
    ],
    extractionNotes: [
      'Phát hiện chứng từ Booking Hãng Tàu ONE với hàng Cont Lạnh (Reefer 40 RF).',
      'Đã trích xuất chính xác hạn hạ bãi CY Cut-off, SI Cut-off và bãi cấp vỏ rỗng.',
    ],
    rawSummary: 'ONE Booking ONE-SGN-2026-9042 | 2x40RF Hàng Lạnh -18°C | Tuyến: Cát Lái -> Rotterdam | Tàu: ONE HENRY HUDSON 084W | CY Cut-off: 15/10 17:00',
    parsedAt: '2026-10-08T09:00:00.000Z',
    processingTimeMs: 1280,
    fileName: 'ONE_BOOKING_ONE-SGN-2026-9042.pdf',
    fileType: 'application/pdf',
    fileSize: 318000,
    rawText: `OCEAN NETWORK EXPRESS - BOOKING CONFIRMATION
Booking No: ONE-SGN-2026-9042
Carrier: OCEAN NETWORK EXPRESS (VIETNAM) CO., LTD.
Shipper: CÔNG TY CỔ PHẦN NÔNG SẢN VIỆT HƯNG (LONG AN)
Consignee: EUROPEAN FRESH FRUITS IMPORT B.V. (ROTTERDAM)
Vessel / Voyage: ONE HENRY HUDSON / 084W
POL: CAT LAI PORT, HO CHI MINH, VIETNAM
POD: PORT OF ROTTERDAM, NETHERLANDS
ETD: 16-OCT-2026 | ETA: 12-NOV-2026
CY Cut-Off: 15-OCT-2026 17:00 HRS
SI Cut-Off: 14-OCT-2026 11:00 HRS
VGM Cut-Off: 15-OCT-2026 12:00 HRS
Empty Pick-Up Depot: TAN CANG SUOI TIEN DEPOT
Full Return Terminal: CAT LAI TERMINAL REEFER YARD
Equipment: 2 X 40' HIGH CUBE REEFER (40'RF)
Cargo: FROZEN DRAGON FRUITS & PASSION FRUIT
Temperature Setting: -18.0 DEGREE CELSIUS | VENTILATION: CLOSED
Gross Weight: 44,000.00 KGS
Free Time Condition: 14 DAYS COMBINED DEM/DET AT DISCHARGE PORT`,
  },
  {
    id: 'sample_invoice_packing_03',
    documentType: 'COMMERCIAL_INVOICE',
    documentTypeNameVi: 'Hóa Đơn Thương Mại & Packing List (Invoice/PL)',
    documentNumber: 'INV-2026-EX-088',
    issueDate: '2026-10-05',
    carrierOrIssuer: 'CÔNG TY TNHH ĐIỆN TỬ VÀ VI MẠCH SÀI GÒN',
    invoiceNumber: 'INV-2026-EX-088',
    contractNumber: 'PO-DE-2026-3829',
    shipper: {
      name: 'CÔNG TY TNHH ĐIỆN TỬ VÀ VI MẠCH SÀI GÒN',
      taxId: '0312093849',
      address: 'Lô T2-4, Đường D1, Khu Công Nghệ Cao (SHTP), TP. Thủ Đức, TP. Hồ Chí Minh',
      phone: '+84 28 3736 0090',
      email: 'finance@sg-semicon.vn',
      contactPerson: 'Lê Hoàng Nam',
    },
    consignee: {
      name: 'HANOVER ELECTRONICS GMBH & CO. KG',
      address: 'INDUSTRIESTRASSE 45, 30159 HANNOVER, GERMANY',
      phone: '+49 511 839 200',
      email: 'purchasing@hanover-electronics.de',
      contactPerson: 'Klaus Weber',
    },
    mode: 'SEA_FCL',
    pol: 'Cat Lai Port, Ho Chi Minh',
    pod: 'Port of Hamburg, Germany',
    etd: '2026-10-18',
    eta: '2026-11-14',
    commodity: 'Linh kiện bán dẫn, Bo mạch vi điều khiển MCU (Semiconductor Modules & PCB)',
    containerType: "20'GP",
    containerCount: 1,
    packageCount: 45,
    packageUnit: 'Pallets (900 Cartons)',
    grossWeightKg: 12300,
    netWeightKg: 11200,
    volumeCbm: 48.6,
    chargeableWeightKg: 12300,
    hsCode: '8542.31.00',
    incoterm: 'CIF Hamburg (Incoterms 2020)',
    currency: 'USD',
    totalInvoiceAmount: 148500,
    paymentTerms: 'T/T 30% Deposit, 70% against Bill of Lading copy',
    containers: [
      {
        id: 'cont_inv_1',
        containerNo: 'TCLU3920194',
        sealNo: 'SGS-00819',
        type: "20'GP",
        packageCount: 45,
        grossWeightKg: 12300,
      },
    ],
    charges: [],
    confidenceScore: 97,
    fieldConfidence: {
      invoiceNumber: 100,
      totalInvoiceAmount: 99,
      incoterm: 98,
      packageCount: 96,
      grossWeightKg: 97,
      netWeightKg: 97,
    },
    warnings: [],
    extractionNotes: [
      'Trích xuất tự động Hóa đơn thương mại kết hợp Packing List.',
      'Tổng giá trị thương mại: 148,500.00 USD, điều kiện CIF Hamburg.',
      'Tổng trọng lượng: Gross 12,300 KGS / Net 11,200 KGS đóng trên 45 Pallets.',
    ],
    rawSummary: 'Commercial Invoice INV-2026-EX-088 | Trị giá: $148,500 USD CIF Hamburg | 45 Pallets / 12,300 KGS | Hàng: Bo mạch bán dẫn MCU | Người mua: Hanover Electronics (Đức)',
    parsedAt: '2026-10-08T09:10:00.000Z',
    processingTimeMs: 1150,
    fileName: 'INVOICE_PACKING_INV-2026-EX-088.pdf',
    fileType: 'application/pdf',
    fileSize: 284000,
    rawText: `COMMERCIAL INVOICE & PACKING LIST
Invoice No: INV-2026-EX-088  Date: 05-OCT-2026
Purchase Order No: PO-DE-2026-3829
SELLER: CÔNG TY TNHH ĐIỆN TỬ VÀ VI MẠCH SÀI GÒN
Address: Lô T2-4, Đường D1, Khu Công Nghệ Cao (SHTP), TP. Thủ Đức, TP.HCM, VN
Tax ID: 0312093849
BUYER: HANOVER ELECTRONICS GMBH & CO. KG
Address: INDUSTRIESTRASSE 45, 30159 HANNOVER, GERMANY
Delivery Terms: CIF HAMBURG PORT, GERMANY (INCOTERMS 2020)
Payment Terms: T/T 30% DEPOSIT, 70% AGAINST COPY OF ORIGINAL B/L
Port of Loading: CAT LAI PORT, HO CHI MINH, VIETNAM
Port of Discharge: HAMBURG PORT, GERMANY
ITEM DESCRIPTION: MICROCONTROLLER UNITS & SENSOR PCB MODULES
HS CODE: 8542.31.00
Quantity: 90,000 PCS packed in 900 Cartons / 45 Wooden Pallets
Unit Price: $1.65 / PC
TOTAL INVOICE VALUE: $148,500.00 USD
PACKING DETAILS:
TOTAL PACKAGES: 45 PALLETS (ISPM 15 HEAT-TREATED)
TOTAL GROSS WEIGHT: 12,300.00 KGS
TOTAL NET WEIGHT: 11,200.00 KGS
TOTAL MEASUREMENT: 48.60 CBM`,
  },
  {
    id: 'sample_customs_vnaccs_04',
    documentType: 'CUSTOMS_DECLARATION',
    documentTypeNameVi: 'Tờ Khai Hải Quan Điện Tử (VNACCS/VCIS)',
    documentNumber: '105829103920',
    issueDate: '2026-10-07',
    carrierOrIssuer: 'CHI CỤC HẢI QUAN CỬA KHẨU CẢNG SÀI GÒN KV 1 (MÃ 02CI)',
    declarationNumber: '105829103920',
    invoiceNumber: 'INV-KR-2026-9921',
    shipper: {
      name: 'SAMSUNG SDI CO., LTD. (KOREA)',
      address: '150-20, GONGSE-RO, GIHEUNG-GU, YONGIN-SI, GYEONGGI-DO, KOREA',
      contactPerson: 'Park Sun Woo',
    },
    consignee: {
      name: 'CÔNG TY CỔ PHẦN THƯƠNG MẠI CÔNG NGHỆ Á CHÂU',
      taxId: '0314892182',
      address: 'Số 42 Ung Văn Khiêm, Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh',
      phone: '+84 28 3512 8844',
      email: 'customs@achau-tech.vn',
      contactPerson: 'Đặng Thanh Hà',
    },
    mode: 'SEA_FCL',
    pol: 'Busan Port, Republic of Korea',
    pod: 'Cat Lai Port, Ho Chi Minh, Vietnam',
    commodity: 'Cell pin lithium-ion dung lượng cao dùng cho xe điện & thiết bị lưu trữ năng lượng',
    containerType: "40'GP",
    containerCount: 1,
    packageCount: 680,
    packageUnit: 'Kiện pallet tiêu chuẩn UN',
    grossWeightKg: 19800,
    netWeightKg: 18200,
    volumeCbm: 58.2,
    chargeableWeightKg: 19800,
    hsCode: '8507.60.90',
    dgClass: 'Class 9 (UN 3480 - Lithium Ion Batteries)',
    incoterm: 'CIF Ho Chi Minh',
    currency: 'USD',
    totalInvoiceAmount: 215000,
    containers: [
      {
        id: 'cont_vnaccs_1',
        containerNo: 'TGHU8192031',
        sealNo: 'KR-CUS-88219',
        type: "40'GP",
        packageCount: 680,
        grossWeightKg: 19800,
      },
    ],
    charges: [],
    confidenceScore: 99,
    fieldConfidence: {
      declarationNumber: 100,
      taxId: 100,
      hsCode: 99,
      grossWeightKg: 99,
      totalInvoiceAmount: 98,
    },
    warnings: [
      'Hàng hóa thuộc nhóm pin Lithium nguy hiểm (Class 9 - UN 3480), cần chứng chỉ MSDS và UN38.3 khi thông quan.',
    ],
    extractionNotes: [
      'Tờ khai nhập khẩu loại hình A11 (Nhập kinh doanh tiêu dùng).',
      'Đã đối chiếu thông tin Chi cục Hải quan Cát Lái và Thuế nhập khẩu ưu đãi.',
    ],
    rawSummary: 'Tờ Khai Hải Quan 105829103920 (Loại hình A11) | Hàng: Pin Lithium UN3480 | Busan -> Cát Lái | Trị giá $215,000 USD | Đơn vị: Á Châu Tech',
    parsedAt: '2026-10-08T09:15:00.000Z',
    processingTimeMs: 1350,
    fileName: 'TO_KHAI_HAI_QUAN_105829103920.pdf',
    fileType: 'application/pdf',
    fileSize: 512000,
    rawText: `TỔNG CỤC HẢI QUAN - TỜ KHAI HÀNG HÓA NHẬP KHẨU (THÔNG QUAN ĐIỆN TỬ VNACCS)
Số tờ khai: 105829103920  Mã phân loại kiểm tra: Luồng Vàng
Cơ quan Hải quan tiếp nhận: 02CI - Chi cục HQ CK Cảng Sài Gòn KV 1
Mã loại hình: A11 (Nhập kinh doanh tiêu dùng)
Ngày đăng ký: 07/10/2026
Người nhập khẩu: CÔNG TY CỔ PHẦN THƯƠNG MẠI CÔNG NGHỆ Á CHÂU
Mã số thuế: 0314892182
Địa chỉ: Số 42 Ung Văn Khiêm, Phường 25, Bình Thạnh, TP.HCM
Người xuất khẩu: SAMSUNG SDI CO., LTD. (HÀN QUỐC)
Cảng xếp hàng: BUSAN, KOREA (KR PUS)
Cảng dỡ hàng: CAT LAI, TP. HỒ CHÍ MINH (VN SGN)
Phương tiện vận chuyển: WAN HAI 315 / 092S
Số vận đơn (B/L): WHSL26099210
Số lượng container: 01 CONT 40'GP (TGHU8192031 / NIÊM PHONG: KR-CUS-88219)
Tên hàng: Cell pin lithium-ion dung lượng cao (Lithium Ion Cells UN3480)
Mã HS: 8507.60.90
Trọng lượng Gross: 19,800.00 KGS (680 Kiện Pallet)
Tổng trị giá hóa đơn: 215,000.00 USD (Điều kiện CIF Cát Lái)
Thuế suất thuế nhập khẩu ưu đãi: 0% (Áp dụng C/O Form VK / AK)`,
  },
];
