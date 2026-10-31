import { ContainerType, TransportMode } from '../../../types/logistics';

export interface EquipmentSpec {
  id: string;
  name: string;
  category: 'OCEAN' | 'AIR' | 'TRUCKING';
  maxGrossWeightKg: number;
  tareWeightKg: number;
  maxPayloadKg: number;
  maxVolumeCbm: number;
  innerLengthM: number;
  innerWidthM: number;
  innerHeightM: number;
  doorWidthM?: number;
  doorHeightM?: number;
  euroPalletCapacity: number; // 1200 x 800 mm
  standardPalletCapacity: number; // 1200 x 1000 mm
  descriptionVi: string;
}

export const EQUIPMENT_SPECS: Record<string, EquipmentSpec> = {
  "20'GP": {
    id: "20'GP",
    name: "Container 20' Dry Standard (20'DC)",
    category: 'OCEAN',
    maxGrossWeightKg: 30480,
    tareWeightKg: 2280,
    maxPayloadKg: 28200,
    maxVolumeCbm: 33.2,
    innerLengthM: 5.898,
    innerWidthM: 2.352,
    innerHeightM: 2.393,
    doorWidthM: 2.340,
    doorHeightM: 2.280,
    euroPalletCapacity: 11,
    standardPalletCapacity: 9,
    descriptionVi: 'Cont 20ft khô tiêu chuẩn quốc tế ISO, phù hợp hàng nặng có mật độ cao.'
  },
  "40'GP": {
    id: "40'GP",
    name: "Container 40' Dry Standard (40'DC)",
    category: 'OCEAN',
    maxGrossWeightKg: 32500,
    tareWeightKg: 3750,
    maxPayloadKg: 28750,
    maxVolumeCbm: 67.7,
    innerLengthM: 12.032,
    innerWidthM: 2.352,
    innerHeightM: 2.393,
    doorWidthM: 2.340,
    doorHeightM: 2.280,
    euroPalletCapacity: 25,
    standardPalletCapacity: 21,
    descriptionVi: 'Cont 40ft tiêu chuẩn, tối ưu cho hàng bách hóa tổng hợp thể tích vừa.'
  },
  "40'HC": {
    id: "40'HC",
    name: "Container 40' High Cube (40'HQ)",
    category: 'OCEAN',
    maxGrossWeightKg: 32500,
    tareWeightKg: 3900,
    maxPayloadKg: 28600,
    maxVolumeCbm: 76.4,
    innerLengthM: 12.032,
    innerWidthM: 2.352,
    innerHeightM: 2.698,
    doorWidthM: 2.340,
    doorHeightM: 2.585,
    euroPalletCapacity: 25,
    standardPalletCapacity: 21,
    descriptionVi: 'Cont 40ft cao tăng thêm ~30cm chiều cao, tối ưu tuyệt đối cho hàng cồng kềnh nhẹ.'
  },
  "45'HC": {
    id: "45'HC",
    name: "Container 45' High Cube",
    category: 'OCEAN',
    maxGrossWeightKg: 32500,
    tareWeightKg: 4700,
    maxPayloadKg: 27800,
    maxVolumeCbm: 86.0,
    innerLengthM: 13.556,
    innerWidthM: 2.352,
    innerHeightM: 2.698,
    doorWidthM: 2.340,
    doorHeightM: 2.585,
    euroPalletCapacity: 33,
    standardPalletCapacity: 24,
    descriptionVi: 'Cont 45ft siêu thể tích, chuyên chở hàng may mặc, đồ gỗ đóng kiện lớn.'
  },
  "20'RF": {
    id: "20'RF",
    name: "Container 20' Lạnh (Reefer)",
    category: 'OCEAN',
    maxGrossWeightKg: 30480,
    tareWeightKg: 3080,
    maxPayloadKg: 27400,
    maxVolumeCbm: 28.3,
    innerLengthM: 5.444,
    innerWidthM: 2.294,
    innerHeightM: 2.273,
    euroPalletCapacity: 10,
    standardPalletCapacity: 8,
    descriptionVi: 'Cont lạnh 20ft kiểm soát dải nhiệt -30°C đến +30°C, có sàn T-bar thông gió.'
  },
  "40'RF": {
    id: "40'RF",
    name: "Container 40' Lạnh High Cube",
    category: 'OCEAN',
    maxGrossWeightKg: 34000,
    tareWeightKg: 4600,
    maxPayloadKg: 29400,
    maxVolumeCbm: 67.5,
    innerLengthM: 11.583,
    innerWidthM: 2.294,
    innerHeightM: 2.544,
    euroPalletCapacity: 23,
    standardPalletCapacity: 19,
    descriptionVi: 'Cont lạnh 40ft cao, dàn lạnh tự động duy trì chuỗi cung ứng lạnh nông thủy sản.'
  },
  "20'OT": {
    id: "20'OT",
    name: "Container 20' Open Top",
    category: 'OCEAN',
    maxGrossWeightKg: 30480,
    tareWeightKg: 2280,
    maxPayloadKg: 28200,
    maxVolumeCbm: 32.5,
    innerLengthM: 5.898,
    innerWidthM: 2.352,
    innerHeightM: 2.348,
    euroPalletCapacity: 11,
    standardPalletCapacity: 9,
    descriptionVi: 'Cont 20ft mở nóc phủ bạt, chuyên cẩu máy móc công nghiệp từ phía trên xuống.'
  },
  "40'OT": {
    id: "40'OT",
    name: "Container 40' Open Top",
    category: 'OCEAN',
    maxGrossWeightKg: 32500,
    tareWeightKg: 3850,
    maxPayloadKg: 28650,
    maxVolumeCbm: 66.5,
    innerLengthM: 12.032,
    innerWidthM: 2.352,
    innerHeightM: 2.348,
    euroPalletCapacity: 25,
    standardPalletCapacity: 21,
    descriptionVi: 'Cont 40ft mở nóc bạt tiện cẩu thiết bị siêu trường hoặc đóng pallet đứng cao.'
  },
  "AIR (KGS/CW)": {
    id: "AIR (KGS/CW)",
    name: "Air Cargo ULD - PMC Pallet / M1 (Main Deck)",
    category: 'AIR',
    maxGrossWeightKg: 6800,
    tareWeightKg: 120,
    maxPayloadKg: 6680,
    maxVolumeCbm: 11.5,
    innerLengthM: 3.175,
    innerWidthM: 2.438,
    innerHeightM: 1.626,
    euroPalletCapacity: 4,
    standardPalletCapacity: 3,
    descriptionVi: 'Mâm ULD hàng không tiêu chuẩn PMC P6P chằng lưới đai cao tải, vòm cong thân máy bay.'
  },
  "LCL (CBM/KGS)": {
    id: "LCL (CBM/KGS)",
    name: "Hàng lẻ gom LCL (Phân bổ kho CFS)",
    category: 'OCEAN',
    maxGrossWeightKg: 15000,
    tareWeightKg: 0,
    maxPayloadKg: 15000,
    maxVolumeCbm: 20.0,
    innerLengthM: 6.000,
    innerWidthM: 2.350,
    innerHeightM: 2.350,
    euroPalletCapacity: 10,
    standardPalletCapacity: 8,
    descriptionVi: 'Phân khúc hàng ghép LCL, tiêu chuẩn tính cước Tỷ trọng 1 CBM = 1,000 KGS (Biển).'
  },
  "Xe Tải 1.25 Tấn": {
    id: "Xe Tải 1.25 Tấn",
    name: "Xe Tải Thùng Kín 1.25 Tấn",
    category: 'TRUCKING',
    maxGrossWeightKg: 3500,
    tareWeightKg: 2250,
    maxPayloadKg: 1250,
    maxVolumeCbm: 9.2,
    innerLengthM: 3.100,
    innerWidthM: 1.650,
    innerHeightM: 1.700,
    euroPalletCapacity: 2,
    standardPalletCapacity: 2,
    descriptionVi: 'Xe tải trung chuyển nội đô ban ngày, giấy phép phố cấm.'
  },
  "Xe Tải 2.5 Tấn": {
    id: "Xe Tải 2.5 Tấn",
    name: "Xe Tải Thùng Mui Bạt 2.5 Tấn",
    category: 'TRUCKING',
    maxGrossWeightKg: 4990,
    tareWeightKg: 2490,
    maxPayloadKg: 2500,
    maxVolumeCbm: 14.5,
    innerLengthM: 4.300,
    innerWidthM: 1.850,
    innerHeightM: 1.850,
    euroPalletCapacity: 4,
    standardPalletCapacity: 3,
    descriptionVi: 'Xe tải trung tải đường vành đai và các khu công nghiệp vệ tinh.'
  },
  "Xe Tải 5 Tấn": {
    id: "Xe Tải 5 Tấn",
    name: "Xe Tải Thùng 5 Tấn (6.2m)",
    category: 'TRUCKING',
    maxGrossWeightKg: 9500,
    tareWeightKg: 4500,
    maxPayloadKg: 5000,
    maxVolumeCbm: 28.5,
    innerLengthM: 6.200,
    innerWidthM: 2.150,
    innerHeightM: 2.150,
    euroPalletCapacity: 8,
    standardPalletCapacity: 6,
    descriptionVi: 'Xe tải liên tỉnh tải trọng 5 tấn, sàn thép chịu lực cao.'
  },
  "Xe Tải 8 Tấn": {
    id: "Xe Tải 8 Tấn",
    name: "Xe Tải Thùng 8 Tấn (8.2m)",
    category: 'TRUCKING',
    maxGrossWeightKg: 15500,
    tareWeightKg: 7500,
    maxPayloadKg: 8000,
    maxVolumeCbm: 42.0,
    innerLengthM: 8.200,
    innerWidthM: 2.350,
    innerHeightM: 2.300,
    euroPalletCapacity: 14,
    standardPalletCapacity: 12,
    descriptionVi: 'Xe tải dài 8.2m chuyên tuyến Bắc Nam hoặc nhà máy sản xuất linh kiện.'
  },
  "Xe Tải 15 Tấn": {
    id: "Xe Tải 15 Tấn",
    name: "Xe Tải 3 Chân 15 Tấn (9.7m)",
    category: 'TRUCKING',
    maxGrossWeightKg: 24000,
    tareWeightKg: 9000,
    maxPayloadKg: 15000,
    maxVolumeCbm: 55.0,
    innerLengthM: 9.700,
    innerWidthM: 2.350,
    innerHeightM: 2.450,
    euroPalletCapacity: 18,
    standardPalletCapacity: 16,
    descriptionVi: 'Xe tải nặng 3 chân chuyên chở sắt thép, nông sản nguyên liệu, bao jumbo.'
  },
  "Xe Đầu Kéo / Moóc": {
    id: "Xe Đầu Kéo / Moóc",
    name: "Xe Đầu Kéo Moóc Xương / Sàn Rơ-moóc",
    category: 'TRUCKING',
    maxGrossWeightKg: 40000,
    tareWeightKg: 14000,
    maxPayloadKg: 26000,
    maxVolumeCbm: 76.4,
    innerLengthM: 12.200,
    innerWidthM: 2.400,
    innerHeightM: 2.600,
    euroPalletCapacity: 25,
    standardPalletCapacity: 21,
    descriptionVi: 'Đầu kéo chuyên kéo cont 20ft/40ft rút ruột hạ bãi cảng biển.'
  }
};

/**
 * Returns equipment specification or fallback to 40'HC
 */
export function getEquipmentSpec(containerType: string): EquipmentSpec {
  return EQUIPMENT_SPECS[containerType] || EQUIPMENT_SPECS["40'HC"];
}

export interface CargoSimulationMetrics {
  spec: EquipmentSpec;
  quantity: number;
  grossWeightKg: number;
  volumeCbm: number;
  weightPerUnitKg: number;
  volumePerUnitCbm: number;
  weightUtilizationPercent: number;
  volumeUtilizationPercent: number;
  isWeightOverloaded: boolean;
  isVolumeOverfilled: boolean;
  densityKgPerCbm: number;
  remainingPayloadKg: number;
  remainingVolumeCbm: number;
  brokenStowagePercent: number;
  usableVolumeCbm: number;
  estimatedPalletFit: number;
  centerOfGravity: {
    xOffsetRatio: number; // -0.5 to +0.5 (left to right)
    yOffsetRatio: number; // 0 (bottom) to 1 (top)
    zOffsetRatio: number; // -0.5 (rear) to +0.5 (front)
    isBalanced: boolean;
    statusText: string;
  };
  recommendation?: string;
}

export function computeSimulationMetrics(
  containerType: string,
  quantity: number = 1,
  grossWeightKg: number = 0,
  volumeCbm: number = 0,
  brokenStowageFactor: number = 0.10 // 10% standard broken stowage gap
): CargoSimulationMetrics {
  const spec = getEquipmentSpec(containerType);
  const qty = Math.max(1, quantity);

  const weightPerUnit = grossWeightKg / qty;
  const volumePerUnit = volumeCbm / qty;

  const usableVolume = spec.maxVolumeCbm * (1 - brokenStowageFactor);

  const weightUtilizationPercent = (weightPerUnit / (spec.maxPayloadKg || 1)) * 100;
  const volumeUtilizationPercent = (volumePerUnit / (usableVolume || 1)) * 100;

  const isWeightOverloaded = weightUtilizationPercent > 100;
  const isVolumeOverfilled = volumeUtilizationPercent > 100;

  const density = volumePerUnit > 0 ? weightPerUnit / volumePerUnit : 0;
  const remainingPayload = Math.max(0, spec.maxPayloadKg - weightPerUnit);
  const remainingVolume = Math.max(0, usableVolume - volumePerUnit);

  // Pallet estimation: standard ISO 1.2 x 1.0m
  const estPallets = Math.min(
    spec.standardPalletCapacity,
    Math.floor((volumePerUnit / (1.2 * 1.0 * 1.5)) || 0)
  );

  // Center of Gravity simulation based on fill level & balance
  let zOffset = 0; // neutral longitudinal
  let xOffset = 0; // neutral lateral
  let yOffset = Math.min(0.8, Math.max(0.15, (volumeUtilizationPercent / 100) * 0.45)); // height of cargo mass

  let isBalanced = true;
  let statusText = 'Trọng tâm cân bằng (Optimal CoG)';

  if (isWeightOverloaded) {
    statusText = 'CẢNH BÁO: Quá tải trọng kỹ thuật cho phép!';
    isBalanced = false;
  } else if (volumeUtilizationPercent > 95 && weightUtilizationPercent < 40) {
    statusText = 'Hàng cồng kềnh nhẹ thể tích (Light Bulky Cargo) - Trọng tâm ổn định.';
  } else if (weightUtilizationPercent > 90 && volumeUtilizationPercent < 45) {
    statusText = 'Hàng nặng mật độ cao (Heavy Dense Cargo) - Cần chằng buộc sàn cont.';
  }

  // Recommendations for freight forwarders
  let recommendation = '';
  if (isWeightOverloaded) {
    recommendation = `Tổng trọng lượng ${weightPerUnit.toLocaleString('vi-VN')} KG vượt mức tối đa ${spec.maxPayloadKg.toLocaleString('vi-VN')} KG. Đề xuất san tải sang ${qty + 1} thiết bị.`;
  } else if (containerType === "20'GP" && volumeUtilizationPercent > 90 && !isWeightOverloaded) {
    recommendation = "Hàng gần đầy thể tích cont 20'GP. Cân nhắc nâng lên cont 40'GP để tăng gấp đôi thể tích chứa hàng với cước chênh lệch thấp.";
  } else if (containerType === "40'GP" && volumeUtilizationPercent > 92 && !isWeightOverloaded) {
    recommendation = "Hàng đầy dung tích 40'GP. Đề xuất đổi sang 40'HC (High Cube) thêm +8.7 CBM cùng chi phí cước biển tương đương!";
  } else if (volumeUtilizationPercent < 35 && weightUtilizationPercent < 30 && spec.category === 'OCEAN' && containerType !== "LCL (CBM/KGS)") {
    recommendation = "Lô hàng chỉ chiếm tỷ lệ nhỏ (<35%). Cân nhắc báo giá giải pháp gom lẻ LCL (CBM/KGS) để tiết kiệm cước cho khách.";
  }

  return {
    spec,
    quantity: qty,
    grossWeightKg,
    volumeCbm,
    weightPerUnitKg: weightPerUnit,
    volumePerUnitCbm: volumePerUnit,
    weightUtilizationPercent: Number(weightUtilizationPercent.toFixed(1)),
    volumeUtilizationPercent: Number(volumeUtilizationPercent.toFixed(1)),
    isWeightOverloaded,
    isVolumeOverfilled,
    densityKgPerCbm: Math.round(density),
    remainingPayloadKg: Math.round(remainingPayload),
    remainingVolumeCbm: Number(remainingVolume.toFixed(2)),
    brokenStowagePercent: Math.round(brokenStowageFactor * 100),
    usableVolumeCbm: Number(usableVolume.toFixed(2)),
    estimatedPalletFit: Math.max(1, estPallets),
    centerOfGravity: {
      xOffsetRatio: xOffset,
      yOffsetRatio: yOffset,
      zOffsetRatio: zOffset,
      isBalanced,
      statusText
    },
    recommendation
  };
}
