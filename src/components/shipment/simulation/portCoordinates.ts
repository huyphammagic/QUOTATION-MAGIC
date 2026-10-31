export interface PortGeoInfo {
  code: string;
  nameVi: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  type: 'SEA' | 'AIR' | 'INLAND';
  region: 'VN' | 'ASIA' | 'AMERICA' | 'EUROPE' | 'OCEANIA' | 'ME_AFRICA';
}

export const PORT_GEO_DATABASE: Record<string, PortGeoInfo> = {
  // Vietnam Ports
  'VNSGN': { code: 'VNSGN', nameVi: 'Cảng Cát Lái / TP. Hồ Chí Minh', country: 'Việt Nam', countryCode: 'VN', lat: 10.762622, lng: 106.793839, type: 'SEA', region: 'VN' },
  'VNCMP': { code: 'VNCMP', nameVi: 'Cảng Nước Sâu Cái Mép - Thị Vải', country: 'Việt Nam', countryCode: 'VN', lat: 10.5186, lng: 107.0148, type: 'SEA', region: 'VN' },
  'VNHPH': { code: 'VNHPH', nameVi: 'Cảng Hải Phòng / Đình Vũ / Lạch Huyện', country: 'Việt Nam', countryCode: 'VN', lat: 20.8651, lng: 106.6838, type: 'SEA', region: 'VN' },
  'VNDAN': { code: 'VNDAN', nameVi: 'Cảng Tiên Sa / Đà Nẵng', country: 'Việt Nam', countryCode: 'VN', lat: 16.0827, lng: 108.2238, type: 'SEA', region: 'VN' },
  'VNQNH': { code: 'VNQNH', nameVi: 'Cảng Quy Nhơn / Bình Định', country: 'Việt Nam', countryCode: 'VN', lat: 13.7719, lng: 109.2415, type: 'SEA', region: 'VN' },
  'VNSGN-AIR': { code: 'VNSGN-AIR', nameVi: 'Sân Bay Quốc Tế Tân Sơn Nhất (SGN)', country: 'Việt Nam', countryCode: 'VN', lat: 10.8188, lng: 106.6519, type: 'AIR', region: 'VN' },
  'VNHAN-AIR': { code: 'VNHAN-AIR', nameVi: 'Sân Bay Quốc Tế Nội Bài (HAN)', country: 'Việt Nam', countryCode: 'VN', lat: 21.2212, lng: 105.8072, type: 'AIR', region: 'VN' },
  
  // Asia - Pacific
  'SGSIN': { code: 'SGSIN', nameVi: 'Cảng Singapore (PSA / Jurong)', country: 'Singapore', countryCode: 'SG', lat: 1.290270, lng: 103.851959, type: 'SEA', region: 'ASIA' },
  'MYPKG': { code: 'MYPKG', nameVi: 'Cảng Port Klang / Westports', country: 'Malaysia', countryCode: 'MY', lat: 2.9999, lng: 101.3928, type: 'SEA', region: 'ASIA' },
  'MYTPP': { code: 'MYTPP', nameVi: 'Cảng Tanjung Pelepas', country: 'Malaysia', countryCode: 'MY', lat: 1.3653, lng: 103.5511, type: 'SEA', region: 'ASIA' },
  'THBKK': { code: 'THBKK', nameVi: 'Cảng Laem Chabang / Bangkok', country: 'Thái Lan', countryCode: 'TH', lat: 13.0827, lng: 100.8833, type: 'SEA', region: 'ASIA' },
  'HKHKG': { code: 'HKHKG', nameVi: 'Cảng Quốc Tế Hồng Kông (Kwai Tsing)', country: 'Hồng Kông', countryCode: 'HK', lat: 22.3193, lng: 114.1694, type: 'SEA', region: 'ASIA' },
  'CNSHA': { code: 'CNSHA', nameVi: 'Cảng Thượng Hải (Yangshan / Waigaoqiao)', country: 'Trung Quốc', countryCode: 'CN', lat: 31.2304, lng: 121.4737, type: 'SEA', region: 'ASIA' },
  'CNNGB': { code: 'CNNGB', nameVi: 'Cảng Ninh Ba - Chu San (Ningbo-Zhoushan)', country: 'Trung Quốc', countryCode: 'CN', lat: 29.8683, lng: 121.5440, type: 'SEA', region: 'ASIA' },
  'CNSZX': { code: 'CNSZX', nameVi: 'Cảng Thâm Quyến (Yantian / Shekou)', country: 'Trung Quốc', countryCode: 'CN', lat: 22.5431, lng: 114.0579, type: 'SEA', region: 'ASIA' },
  'CNQDG': { code: 'CNQDG', nameVi: 'Cảng Thanh Đảo (Qingdao)', country: 'Trung Quốc', countryCode: 'CN', lat: 36.0671, lng: 120.3826, type: 'SEA', region: 'ASIA' },
  'KRPUS': { code: 'KRPUS', nameVi: 'Cảng Busan (New Port / North Port)', country: 'Hàn Quốc', countryCode: 'KR', lat: 35.1796, lng: 129.0756, type: 'SEA', region: 'ASIA' },
  'JPTYO': { code: 'JPTYO', nameVi: 'Cảng Tokyo / Yokohama', country: 'Nhật Bản', countryCode: 'JP', lat: 35.6762, lng: 139.6503, type: 'SEA', region: 'ASIA' },
  'TWKHH': { code: 'TWKHH', nameVi: 'Cảng Cao Hùng (Kaohsiung)', country: 'Đài Loan', countryCode: 'TW', lat: 22.6273, lng: 120.3014, type: 'SEA', region: 'ASIA' },

  // Americas
  'USLAX': { code: 'USLAX', nameVi: 'Cảng Los Angeles / Long Beach (San Pedro)', country: 'Hoa Kỳ', countryCode: 'US', lat: 33.7432, lng: -118.2673, type: 'SEA', region: 'AMERICA' },
  'USOAK': { code: 'USOAK', nameVi: 'Cảng Oakland / San Francisco Bay', country: 'Hoa Kỳ', countryCode: 'US', lat: 37.8044, lng: -122.2712, type: 'SEA', region: 'AMERICA' },
  'USSEA': { code: 'USSEA', nameVi: 'Cảng Seattle / Tacoma (NW Seaport)', country: 'Hoa Kỳ', countryCode: 'US', lat: 47.6062, lng: -122.3321, type: 'SEA', region: 'AMERICA' },
  'USNYC': { code: 'USNYC', nameVi: 'Cảng New York & New Jersey (Port Newark)', country: 'Hoa Kỳ', countryCode: 'US', lat: 40.6892, lng: -74.1445, type: 'SEA', region: 'AMERICA' },
  'USSAV': { code: 'USSAV', nameVi: 'Cảng Savannah (Garden City Terminal)', country: 'Hoa Kỳ', countryCode: 'US', lat: 32.0809, lng: -81.0912, type: 'SEA', region: 'AMERICA' },
  'CAVAN': { code: 'CAVAN', nameVi: 'Cảng Vancouver (Roberts Bank)', country: 'Canada', countryCode: 'CA', lat: 49.2827, lng: -123.1207, type: 'SEA', region: 'AMERICA' },

  // Europe
  'NLRTM': { code: 'NLRTM', nameVi: 'Cảng Rotterdam (Maasvlakte)', country: 'Hà Lan', countryCode: 'NL', lat: 51.9244, lng: 4.4777, type: 'SEA', region: 'EUROPE' },
  'DEHAM': { code: 'DEHAM', nameVi: 'Cảng Hamburg (Burchardkai / CTA)', country: 'Đức', countryCode: 'DE', lat: 53.5511, lng: 9.9937, type: 'SEA', region: 'EUROPE' },
  'BEANR': { code: 'BEANR', nameVi: 'Cảng Antwerp-Bruges (Deurganckdock)', country: 'Bỉ', countryCode: 'BE', lat: 51.2194, lng: 4.4025, type: 'SEA', region: 'EUROPE' },
  'GBFXT': { code: 'GBFXT', nameVi: 'Cảng Felixstowe', country: 'Vương Quốc Anh', countryCode: 'GB', lat: 51.9626, lng: 1.3513, type: 'SEA', region: 'EUROPE' },
  'FRLEH': { code: 'FRLEH', nameVi: 'Cảng Le Havre (Port 2000)', country: 'Pháp', countryCode: 'FR', lat: 49.4944, lng: 0.1079, type: 'SEA', region: 'EUROPE' },

  // Middle East & Oceania
  'AEJEA': { code: 'AEJEA', nameVi: 'Cảng Jebel Ali (Dubai / DP World)', country: 'UAE', countryCode: 'AE', lat: 24.9857, lng: 55.0273, type: 'SEA', region: 'ME_AFRICA' },
  'LKCMB': { code: 'LKCMB', nameVi: 'Cảng Colombo (CICT / SAGT)', country: 'Sri Lanka', countryCode: 'LK', lat: 6.9271, lng: 79.8612, type: 'SEA', region: 'ME_AFRICA' },
  'AUSYD': { code: 'AUSYD', nameVi: 'Cảng Botany / Sydney', country: 'Úc', countryCode: 'AU', lat: -33.8688, lng: 151.2093, type: 'SEA', region: 'OCEANIA' },
  'AUMEL': { code: 'AUMEL', nameVi: 'Cảng Melbourne (Swanson Dock)', country: 'Úc', countryCode: 'AU', lat: -37.8136, lng: 144.9631, type: 'SEA', region: 'OCEANIA' }
};

/**
 * Fuzzy match port query to port geo metadata
 */
export function findPortGeo(query: string, defaultCode: string = 'VNSGN'): PortGeoInfo {
  if (!query) return PORT_GEO_DATABASE[defaultCode];

  const clean = query.trim().toUpperCase();

  // 1. Direct code lookup
  if (PORT_GEO_DATABASE[clean]) {
    return PORT_GEO_DATABASE[clean];
  }

  // 2. Lookup by code substring or name keyword
  const values = Object.values(PORT_GEO_DATABASE);
  const found = values.find(p => 
    clean.includes(p.code) || 
    p.nameVi.toUpperCase().includes(clean) || 
    clean.includes(p.nameVi.toUpperCase())
  );

  if (found) return found;

  // 3. Fallback heuristic for common Vietnamese & global keywords
  if (clean.includes('CAT LAI') || clean.includes('HO CHI MINH') || clean.includes('SGN')) return PORT_GEO_DATABASE['VNSGN'];
  if (clean.includes('CAI MEP') || clean.includes('VUNG TAU') || clean.includes('CMP')) return PORT_GEO_DATABASE['VNCMP'];
  if (clean.includes('HAI PHONG') || clean.includes('HPH') || clean.includes('HAIPHONG')) return PORT_GEO_DATABASE['VNHPH'];
  if (clean.includes('DA NANG') || clean.includes('DAN')) return PORT_GEO_DATABASE['VNDAN'];
  if (clean.includes('SINGAPORE') || clean.includes('SIN')) return PORT_GEO_DATABASE['SGSIN'];
  if (clean.includes('HONG KONG') || clean.includes('HKG')) return PORT_GEO_DATABASE['HKHKG'];
  if (clean.includes('SHANGHAI') || clean.includes('SHA')) return PORT_GEO_DATABASE['CNSHA'];
  if (clean.includes('NINGBO') || clean.includes('NGB')) return PORT_GEO_DATABASE['CNNGB'];
  if (clean.includes('BUSAN') || clean.includes('PUS')) return PORT_GEO_DATABASE['KRPUS'];
  if (clean.includes('TOKYO') || clean.includes('TYO') || clean.includes('YOKOHAMA')) return PORT_GEO_DATABASE['JPTYO'];
  if (clean.includes('LOS ANGELES') || clean.includes('LAX') || clean.includes('LONG BEACH')) return PORT_GEO_DATABASE['USLAX'];
  if (clean.includes('NEW YORK') || clean.includes('NYC')) return PORT_GEO_DATABASE['USNYC'];
  if (clean.includes('ROTTERDAM') || clean.includes('RTM')) return PORT_GEO_DATABASE['NLRTM'];
  if (clean.includes('HAMBURG') || clean.includes('HAM')) return PORT_GEO_DATABASE['DEHAM'];
  if (clean.includes('JEBEL ALI') || clean.includes('DUBAI') || clean.includes('JEA')) return PORT_GEO_DATABASE['AEJEA'];

  // Default fallback
  return PORT_GEO_DATABASE[defaultCode] || PORT_GEO_DATABASE['VNSGN'];
}

/**
 * Great-circle distance calculation using Haversine formula
 */
export function calculateGreatCircleDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function kmToNauticalMiles(km: number): number {
  return Math.round(km * 0.539957);
}

/**
 * Projects Lat / Long into an interactive 2D Mercator SVG Canvas Coordinate space [Width: 1000, Height: 500]
 * Pacific-centric or Euro-Asian centered map.
 */
export function projectGeoToSvg(lat: number, lng: number, width: number = 1000, height: number = 500): { x: number; y: number } {
  // Normalize longitude with Pacific / Asia focus (+180 offset so Vietnam is centered around x=520)
  // Standard longitude -180..+180
  let normLng = lng;
  // Pacific centered: center around 110°E (Vietnam / South China Sea)
  const centerLng = 110;
  let offsetLng = normLng - centerLng;
  if (offsetLng < -180) offsetLng += 360;
  if (offsetLng > 180) offsetLng -= 360;

  const x = (offsetLng + 180) * (width / 360);

  // Mercator-like latitude clamp (-65 to +75 deg)
  const clampedLat = Math.max(-65, Math.min(75, lat));
  // Invert y because SVG y=0 is top
  const y = height * (1 - (clampedLat + 65) / 140);

  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

export interface RouteWaypoint {
  name: string;
  code: string;
  lat: number;
  lng: number;
  x: number;
  y: number;
  type: 'POL' | 'HUB' | 'STRAIT' | 'POD';
  estDaysFromOrigin: number;
}

export interface RouteAnalysis {
  origin: PortGeoInfo;
  destination: PortGeoInfo;
  waypoints: RouteWaypoint[];
  svgPathD: string;
  totalDistanceKm: number;
  totalDistanceNm: number;
  estimatedTransitDays: number;
  transshipmentHub?: PortGeoInfo;
  seaConditions: {
    waveHeightM: number;
    windKnots: number;
    weatherVi: string;
    trafficDensity: 'THẤP' | 'TRUNG BÌNH' | 'CAO' | 'RẤT ĐÔNG ĐÚC';
  };
  carbonEmissionKgCo2e: number;
}

/**
 * Build rich route coordinates with waypoints and curved SVG path
 */
export function buildRouteAnalysis(
  polInput: string,
  podInput: string,
  mode: string = 'SEA_FCL',
  userTransitTimeDays?: number
): RouteAnalysis {
  const origin = findPortGeo(polInput, 'VNSGN');
  const destination = findPortGeo(podInput, 'USLAX');

  const origSvg = projectGeoToSvg(origin.lat, origin.lng);
  const destSvg = projectGeoToSvg(destination.lat, destination.lng);

  const directDistanceKm = calculateGreatCircleDistanceKm(origin.lat, origin.lng, destination.lat, destination.lng);
  const totalDistanceNm = kmToNauticalMiles(directDistanceKm);

  // Detect transshipment waypoint
  let hub: PortGeoInfo | undefined = undefined;
  if (origin.code !== 'SGSIN' && destination.region === 'EUROPE') {
    hub = PORT_GEO_DATABASE['SGSIN'];
  } else if (origin.code !== 'HKHKG' && (destination.region === 'AMERICA' || destination.code === 'USLAX')) {
    hub = PORT_GEO_DATABASE['HKHKG'];
  } else if (destination.region === 'ASIA' && origin.code !== 'VNSGN') {
    hub = PORT_GEO_DATABASE['SGSIN'];
  }

  // Waypoints construction
  const waypoints: RouteWaypoint[] = [];
  waypoints.push({
    name: origin.nameVi,
    code: origin.code,
    lat: origin.lat,
    lng: origin.lng,
    x: origSvg.x,
    y: origSvg.y,
    type: 'POL',
    estDaysFromOrigin: 0
  });

  if (hub && hub.code !== origin.code && hub.code !== destination.code) {
    const hubSvg = projectGeoToSvg(hub.lat, hub.lng);
    waypoints.push({
      name: hub.nameVi,
      code: hub.code,
      lat: hub.lat,
      lng: hub.lng,
      x: hubSvg.x,
      y: hubSvg.y,
      type: 'HUB',
      estDaysFromOrigin: Math.round((userTransitTimeDays || 18) * 0.35)
    });
  }

  waypoints.push({
    name: destination.nameVi,
    code: destination.code,
    lat: destination.lat,
    lng: destination.lng,
    x: destSvg.x,
    y: destSvg.y,
    type: 'POD',
    estDaysFromOrigin: userTransitTimeDays || (mode === 'AIR_FREIGHT' ? 3 : Math.max(5, Math.round(totalDistanceNm / 400)))
  });

  // Calculate curved SVG path with smooth cubic bezier curve
  let svgPathD = '';
  if (waypoints.length === 2) {
    const p1 = waypoints[0];
    const p2 = waypoints[1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    // Curve bowing upwards/downwards depending on distance
    const archOffset = Math.min(80, Math.max(30, Math.abs(dx) * 0.15));
    const cx1 = p1.x + dx * 0.35;
    const cy1 = p1.y + dy * 0.25 - archOffset;
    const cx2 = p1.x + dx * 0.65;
    const cy2 = p1.y + dy * 0.75 - archOffset;
    svgPathD = `M ${p1.x} ${p1.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p2.x} ${p2.y}`;
  } else if (waypoints.length === 3) {
    const p1 = waypoints[0];
    const p2 = waypoints[1];
    const p3 = waypoints[2];
    svgPathD = `M ${p1.x} ${p1.y} Q ${p2.x} ${p2.y - 25}, ${p2.x} ${p2.y} T ${p3.x} ${p3.y}`;
  }

  // Realistic shipping environmental metrics
  const estimatedDays = userTransitTimeDays || (mode === 'AIR_FREIGHT' ? 3 : Math.max(5, Math.round(totalDistanceNm / 400)));
  const carbonEmission = Math.round(totalDistanceNm * (mode === 'AIR_FREIGHT' ? 0.65 : 0.015) * 100);

  return {
    origin,
    destination,
    waypoints,
    svgPathD,
    totalDistanceKm: directDistanceKm,
    totalDistanceNm,
    estimatedTransitDays: estimatedDays,
    transshipmentHub: hub,
    seaConditions: {
      waveHeightM: 1.4,
      windKnots: 16,
      weatherVi: 'Gió mùa đông bắc cấp 4-5, biển động nhẹ, tầm nhìn xa trên 10 hải lý',
      trafficDensity: totalDistanceNm > 5000 ? 'CAO' : 'TRUNG BÌNH'
    },
    carbonEmissionKgCo2e: carbonEmission
  };
}
