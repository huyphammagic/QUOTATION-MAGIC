import { ShipmentMilestone, ShipmentServiceMode } from '../../types/shipment';

export function getDefaultMilestonesForMode(mode: ShipmentServiceMode): ShipmentMilestone[] {
  const now = new Date().toISOString();

  if (mode === 'AIR') {
    return [
      {
        id: 'ms_air_1',
        milestoneCode: 'BOOKING_REQUESTED',
        titleVi: 'Yêu cầu Đặt chỗ (Booking Requested)',
        titleEn: 'Booking Requested',
        status: 'PENDING',
        sequence: 1,
      },
      {
        id: 'ms_air_2',
        milestoneCode: 'BOOKING_CONFIRMED',
        titleVi: 'Hãng bay xác nhận Booking (Booking Confirmed)',
        titleEn: 'Booking Confirmed',
        status: 'PENDING',
        sequence: 2,
      },
      {
        id: 'ms_air_3',
        milestoneCode: 'CARGO_PICKED_UP',
        titleVi: 'Hàng nhập kho Sân bay (Terminal Received)',
        titleEn: 'Terminal Cargo Received',
        status: 'PENDING',
        sequence: 3,
      },
      {
        id: 'ms_air_4',
        milestoneCode: 'CUSTOMS_CLEARED',
        titleVi: 'Thông quan xuất khẩu (Export Customs Cleared)',
        titleEn: 'Export Customs Cleared',
        status: 'PENDING',
        sequence: 4,
      },
      {
        id: 'ms_air_5',
        milestoneCode: 'VESSEL_DEPARTED',
        titleVi: 'Chuyến bay khởi hành (Flight Departed - ATD)',
        titleEn: 'Flight Departed',
        status: 'PENDING',
        sequence: 5,
      },
      {
        id: 'ms_air_6',
        milestoneCode: 'VESSEL_ARRIVED',
        titleVi: 'Chuyến bay hạ cánh (Flight Arrived - ATA)',
        titleEn: 'Flight Arrived',
        status: 'PENDING',
        sequence: 6,
      },
      {
        id: 'ms_air_7',
        milestoneCode: 'DISCHARGED',
        titleVi: 'Thông quan nhập khẩu (Import Customs Cleared)',
        titleEn: 'Import Customs Cleared',
        status: 'PENDING',
        sequence: 7,
      },
      {
        id: 'ms_air_8',
        milestoneCode: 'DELIVERED',
        titleVi: 'Giao hàng hoàn tất cho người nhận (Delivered)',
        titleEn: 'Cargo Delivered to Consignee',
        status: 'PENDING',
        sequence: 8,
      },
      {
        id: 'ms_air_9',
        milestoneCode: 'COMPLETED',
        titleVi: 'Đóng hồ sơ lô hàng (Shipment Completed)',
        titleEn: 'Shipment File Closed',
        status: 'PENDING',
        sequence: 9,
      },
    ];
  }

  if (mode === 'TRUCKING') {
    return [
      {
        id: 'ms_trk_1',
        milestoneCode: 'BOOKING_REQUESTED',
        titleVi: 'Tiếp nhận lệnh điều xe (Dispatch Order Created)',
        titleEn: 'Dispatch Order Received',
        status: 'PENDING',
        sequence: 1,
      },
      {
        id: 'ms_trk_2',
        milestoneCode: 'BOOKING_CONFIRMED',
        titleVi: 'Điều phối xe & Tài xế (Truck & Driver Assigned)',
        titleEn: 'Truck & Driver Assigned',
        status: 'PENDING',
        sequence: 2,
      },
      {
        id: 'ms_trk_3',
        milestoneCode: 'CARGO_PICKED_UP',
        titleVi: 'Đóng hàng & Bốc xếp tại kho gửi (Picked Up)',
        titleEn: 'Cargo Picked Up',
        status: 'PENDING',
        sequence: 3,
      },
      {
        id: 'ms_trk_4',
        milestoneCode: 'CONTAINER_GATE_OUT',
        titleVi: 'Xe lăn bánh trên đường (In Transit)',
        titleEn: 'In Transit',
        status: 'PENDING',
        sequence: 4,
      },
      {
        id: 'ms_trk_5',
        milestoneCode: 'DELIVERY_STARTED',
        titleVi: 'Xe đến điểm giao hàng (Arrived at Destination)',
        titleEn: 'Arrived at Destination',
        status: 'PENDING',
        sequence: 5,
      },
      {
        id: 'ms_trk_6',
        milestoneCode: 'DELIVERED',
        titleVi: 'Dỡ hàng & Ký nhận biên bản POD (Delivered & POD)',
        titleEn: 'Delivered & POD Signed',
        status: 'PENDING',
        sequence: 6,
      },
      {
        id: 'ms_trk_7',
        milestoneCode: 'COMPLETED',
        titleVi: 'Hoàn tất chuyến vận chuyển (Completed)',
        titleEn: 'Trucking Completed',
        status: 'PENDING',
        sequence: 7,
      },
    ];
  }

  if (mode === 'CUSTOMS') {
    return [
      {
        id: 'ms_cus_1',
        milestoneCode: 'BOOKING_REQUESTED',
        titleVi: 'Tiếp nhận chứng từ hải quan (Documents Received)',
        titleEn: 'Customs Documents Received',
        status: 'PENDING',
        sequence: 1,
      },
      {
        id: 'ms_cus_2',
        milestoneCode: 'CUSTOMS_STARTED',
        titleVi: 'Lên tờ khai & Truyền dữ liệu VNACCS (Declaration Drafted)',
        titleEn: 'Customs Declaration Transmitted',
        status: 'PENDING',
        sequence: 2,
      },
      {
        id: 'ms_cus_3',
        milestoneCode: 'TRANSSHIPMENT',
        titleVi: 'Phân luồng tờ khai (Xanh / Vàng / Đỏ)',
        titleEn: 'Customs Channel Routing',
        status: 'PENDING',
        sequence: 3,
      },
      {
        id: 'ms_cus_4',
        milestoneCode: 'CUSTOMS_CLEARED',
        titleVi: 'Nộp thuế & Thông quan tờ khai (Customs Cleared)',
        titleEn: 'Customs Cleared',
        status: 'PENDING',
        sequence: 4,
      },
      {
        id: 'ms_cus_5',
        milestoneCode: 'DELIVERY_STARTED',
        titleVi: 'Bàn giao chứng từ & tờ khai cho khách (Handover)',
        titleEn: 'Customs Documents Handover',
        status: 'PENDING',
        sequence: 5,
      },
      {
        id: 'ms_cus_6',
        milestoneCode: 'COMPLETED',
        titleVi: 'Hoàn tất dịch vụ Hải quan (Completed)',
        titleEn: 'Customs Service Completed',
        status: 'PENDING',
        sequence: 6,
      },
    ];
  }

  // Default: SEA (FCL / LCL) & MULTIMODAL
  const isFcl = mode === 'SEA_FCL';
  const list: ShipmentMilestone[] = [
    {
      id: 'ms_sea_1',
      milestoneCode: 'BOOKING_REQUESTED',
      titleVi: 'Gửi yêu cầu Booking tới Hãng tàu (Booking Requested)',
      titleEn: 'Booking Requested to Carrier',
      status: 'PENDING',
      sequence: 1,
    },
    {
      id: 'ms_sea_2',
      milestoneCode: 'BOOKING_CONFIRMED',
      titleVi: 'Hãng tàu xác nhận Booking Note (Booking Confirmed)',
      titleEn: 'Booking Confirmed (Booking Note)',
      status: 'PENDING',
      sequence: 2,
    },
    {
      id: 'ms_sea_3',
      milestoneCode: 'CARGO_PICKED_UP',
      titleVi: isFcl ? 'Lấy vỏ cont & Đóng hàng tại kho (Empty Released & Stuffed)' : 'Hàng nhập kho CFS (CFS Cargo Received)',
      titleEn: isFcl ? 'Empty Picked Up & Stuffed' : 'Cargo Received at CFS',
      status: 'PENDING',
      sequence: 3,
    },
    {
      id: 'ms_sea_4',
      milestoneCode: 'CONTAINER_GATE_OUT',
      titleVi: 'Hạ bãi xuất khẩu Cảng đi (CY Gate In / Cut-off)',
      titleEn: 'Port Gate In (POL Terminal)',
      status: 'PENDING',
      sequence: 4,
    },
    {
      id: 'ms_sea_5',
      milestoneCode: 'CUSTOMS_CLEARED',
      titleVi: 'Thông quan xuất khẩu (Export Customs Cleared)',
      titleEn: 'Export Customs Cleared',
      status: 'PENDING',
      sequence: 5,
    },
    {
      id: 'ms_sea_6',
      milestoneCode: 'LOADED_ON_VESSEL',
      titleVi: 'Xếp hàng lên tàu (Loaded on Vessel)',
      titleEn: 'Loaded on Vessel',
      status: 'PENDING',
      sequence: 6,
    },
    {
      id: 'ms_sea_7',
      milestoneCode: 'VESSEL_DEPARTED',
      titleVi: 'Tàu rời cảng xuất (Vessel Departed - ATD)',
      titleEn: 'Vessel Departed (ATD)',
      status: 'PENDING',
      sequence: 7,
    },
    {
      id: 'ms_sea_8',
      milestoneCode: 'VESSEL_ARRIVED',
      titleVi: 'Tàu cập cảng đích (Vessel Arrived - ATA)',
      titleEn: 'Vessel Arrived at POD (ATA)',
      status: 'PENDING',
      sequence: 8,
    },
    {
      id: 'ms_sea_9',
      milestoneCode: 'DISCHARGED',
      titleVi: 'Dỡ hàng khỏi tàu tại Cảng đến (Discharged at POD)',
      titleEn: 'Container / Cargo Discharged',
      status: 'PENDING',
      sequence: 9,
    },
    {
      id: 'ms_sea_10',
      milestoneCode: 'CUSTOMS_STARTED',
      titleVi: 'Làm thủ tục hải quan nhập khẩu (Import Customs)',
      titleEn: 'Import Customs Clearance',
      status: 'PENDING',
      sequence: 10,
    },
    {
      id: 'ms_sea_11',
      milestoneCode: 'DELIVERY_STARTED',
      titleVi: 'Vận chuyển giao hàng tới kho khách (Delivery Started)',
      titleEn: 'Inland Delivery to Consignee',
      status: 'PENDING',
      sequence: 11,
    },
    {
      id: 'ms_sea_12',
      milestoneCode: 'DELIVERED',
      titleVi: 'Giao hàng thành công & Ký nhận (Delivered & POD)',
      titleEn: 'Cargo Delivered & Signed',
      status: 'PENDING',
      sequence: 12,
    },
  ];

  if (isFcl) {
    list.push({
      id: 'ms_sea_13',
      milestoneCode: 'EMPTY_RETURNED',
      titleVi: 'Hạ rỗng trả vỏ cont về Depot hãng tàu (Empty Returned)',
      titleEn: 'Empty Container Returned to Depot',
      status: 'PENDING',
      sequence: 13,
    });
  }

  list.push({
    id: `ms_sea_${list.length + 1}`,
    milestoneCode: 'COMPLETED',
    titleVi: 'Hoàn tất hồ sơ lô hàng (Shipment Completed)',
    titleEn: 'Shipment File Closed',
    status: 'PENDING',
    sequence: list.length + 1,
  });

  return list;
}

export const SHIPMENT_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['BOOKING_REQUESTED', 'CANCELLED'],
  BOOKING_REQUESTED: ['BOOKED', 'DRAFT', 'CANCELLED'],
  BOOKED: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['CUSTOMS_CLEARANCE', 'DELIVERING', 'DELIVERED', 'CANCELLED'],
  CUSTOMS_CLEARANCE: ['DELIVERING', 'DELIVERED', 'ARRIVED', 'CANCELLED'],
  DELIVERING: ['DELIVERED', 'CUSTOMS_CLEARANCE', 'CANCELLED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: ['DRAFT'],
};

export function isValidStatusTransition(current: string, next: string): boolean {
  if (current === next) return true;
  const allowed = SHIPMENT_STATUS_TRANSITIONS[current] || [];
  return allowed.includes(next);
}
