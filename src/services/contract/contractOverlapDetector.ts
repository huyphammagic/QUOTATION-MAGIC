import { ContractRateItem, ContractRateOverlapResult } from '../../types/contract';

/**
 * Checks if two date ranges overlap
 * Overlap condition: max(startA, startB) <= min(endA, endB)
 */
export function isDateRangeOverlapping(
  fromA: string,
  toA: string,
  fromB: string,
  toB: string
): boolean {
  const maxStart = fromA > fromB ? fromA : fromB;
  const minEnd = toA < toB ? toA : toB;
  return maxStart <= minEnd;
}

/**
 * Detects if a candidate ContractRate overlaps with existing rates in the same contract.
 * Checked dimensions:
 * 1. Same Contract ID
 * 2. Same Service Mode (e.g. SEA, AIR, TRUCKING)
 * 3. Same Equipment / Container Type
 * 4. Same Incoterm (if specified)
 * 5. Same Origin & Destination (POL & POD)
 * 6. Overlapping validity period [validFrom, validTo]
 * 7. Weight Break overlap (for AIR)
 */
export function detectContractRateOverlap(
  candidateRate: Partial<ContractRateItem>,
  existingRates: ContractRateItem[]
): ContractRateOverlapResult {
  if (!existingRates || existingRates.length === 0) {
    return {
      hasOverlap: false,
      messageVi: 'Không có xung đột biểu cước.',
      messageEn: 'No rate conflicts detected.',
      severity: 'WARNING',
    };
  }

  const candMode = candidateRate.serviceMode;
  const candEquipment = (candidateRate.equipmentType || '').trim().toUpperCase();
  const candOrigin = (candidateRate.originCode || candidateRate.origin || candidateRate.pol || '').trim().toUpperCase();
  const candDest = (candidateRate.destinationCode || candidateRate.destination || candidateRate.pod || '').trim().toUpperCase();
  const candIncoterm = candidateRate.incoterm || '';
  const candFrom = candidateRate.validFrom || '';
  const candTo = candidateRate.validTo || '';

  for (const rate of existingRates) {
    // Skip self when updating
    if (candidateRate.id && rate.id === candidateRate.id) {
      continue;
    }

    // Only compare within same contract or matching party
    if (candidateRate.contractId && rate.contractId !== candidateRate.contractId) {
      continue;
    }

    // Must match mode
    if (rate.serviceMode !== candMode) {
      continue;
    }

    // Must match equipment
    const rateEquipment = (rate.equipmentType || '').trim().toUpperCase();
    if (candEquipment && rateEquipment && candEquipment !== rateEquipment) {
      continue;
    }

    // Must match origin & destination
    const rateOrigin = (rate.originCode || rate.origin || rate.pol || '').trim().toUpperCase();
    const rateDest = (rate.destinationCode || rate.destination || rate.pod || '').trim().toUpperCase();
    if (candOrigin && rateOrigin && candOrigin !== rateOrigin) {
      continue;
    }
    if (candDest && rateDest && candDest !== rateDest) {
      continue;
    }

    // Match Incoterm if both exist
    if (candIncoterm && rate.incoterm && candIncoterm !== rate.incoterm) {
      continue;
    }

    // Check validity date overlap
    const rateFrom = rate.validFrom || '';
    const rateTo = rate.validTo || '';
    if (candFrom && candTo && rateFrom && rateTo) {
      const datesOverlap = isDateRangeOverlapping(candFrom, candTo, rateFrom, rateTo);
      if (datesOverlap) {
        // Check AIR weight break overlap if applicable
        if (candMode === 'AIR' && candidateRate.weightBreaks && rate.weightBreaks) {
          for (const cwb of candidateRate.weightBreaks) {
            for (const rwb of rate.weightBreaks) {
              const cMin = cwb.minWeightKg;
              const cMax = cwb.maxWeightKg ?? Infinity;
              const rMin = rwb.minWeightKg;
              const rMax = rwb.maxWeightKg ?? Infinity;
              if (Math.max(cMin, rMin) < Math.min(cMax, rMax)) {
                return {
                  hasOverlap: true,
                  overlapType: 'WEIGHT_BREAK_OVERLAP',
                  conflictingRateId: rate.id,
                  conflictingRateCode: rate.rateCode,
                  messageVi: `Cảnh báo: Bảng giá cước chặng bay [${rate.rateCode}] bị chồng chéo nấc tải trọng (${cwb.label} vs ${rwb.label}) trong khoảng thời gian từ ${candFrom} đến ${candTo}.`,
                  messageEn: `Warning: Air freight rate [${rate.rateCode}] overlaps weight break (${cwb.label} vs ${rwb.label}) between ${candFrom} and ${candTo}.`,
                  severity: 'WARNING',
                };
              }
            }
          }
        }

        return {
          hasOverlap: true,
          overlapType: 'DATE_OVERLAP',
          conflictingRateId: rate.id,
          conflictingRateCode: rate.rateCode,
          messageVi: `Cảnh báo: Đã tồn tại biểu cước [${rate.rateCode}] cùng tuyến (${candOrigin} -> ${candDest}), loại thiết bị (${candEquipment || 'Tất cả'}) trùng lặp thời gian hiệu lực (${rateFrom} đến ${rateTo}).`,
          messageEn: `Warning: Existing rate [${rate.rateCode}] matches route (${candOrigin} -> ${candDest}), equipment (${candEquipment || 'All'}) with overlapping validity (${rateFrom} to ${rateTo}).`,
          severity: 'WARNING',
        };
      }
    }
  }

  return {
    hasOverlap: false,
    messageVi: 'Biểu cước hợp lệ, không phát hiện xung đột.',
    messageEn: 'Rate is valid, no conflicts found.',
    severity: 'WARNING',
  };
}
