import { ParametricStructureBuilder } from '@/models/sdk/ParametricBuilder';
import type { CompiledProjectPackage, ProjectManifest } from '@/core/types/project';

const COL_GREEN_STONE = '#9BA096';
const COL_BAT_TRANG_BRICK = '#9E4735';
const COL_PLASTER_CREAM = '#EDE3D2';
const COL_IRONWOOD_RED = '#821D17';
const COL_GILT_GOLD = '#D4A843';
const COL_MUI_HAI_TILE = '#7A2F22';
const COL_BRONZE_BELL = '#4E4637';

/**
 * Built-in Masterpiece #2: Khuê Văn Các — Pavilion of the Constellation of Literature (Văn Miếu, Hà Nội)
 * Authentic Vietnamese heritage timber & brick architecture:
 * - Square Bát Tràng courtyard & Thanh Hóa stone curb
 * - 4 massive ancient brick corner piers with arched portals
 * - Carved wooden balustrade & Ironwood (Gỗ Lim) floor framing
 * - Upper red-lacquered pavilion with the iconic 8 circular Khuê Tinh sun-ray windows & gilded plaques
 * - Traditional "Chồng Diêm 2 Tầng 8 Mái" curved Mũi Hài tile roofs & rooftop Mặt Nguyệt crest
 */
export function buildKhueVanCacPackage(): CompiledProjectPackage {
  const b = new ParametricStructureBuilder();

  const cardinals = [
    { dir: 'SOUTH', signX: 0, signZ: 1, rot: 0 },
    { dir: 'EAST', signX: 1, signZ: 0, rot: Math.PI / 2 },
    { dir: 'NORTH', signX: 0, signZ: -1, rot: Math.PI },
    { dir: 'WEST', signX: -1, signZ: 0, rot: -Math.PI / 2 },
  ] as const;

  // ============================================================================
  // STAGE 01: BỆ ĐÁ & SÂN GẠCH BÁT TRÀNG (0.0s -> 2.6s | LayerBit 0)
  // ============================================================================
  let t = 0.05;
  const stepT = (dt: number) => {
    const cur = Number(t.toFixed(3));
    t += dt;
    return cur;
  };

  // Setting out
  for (const s of [-4.2, 4.2]) {
    b.addBeamBetween([s, 0.02, -4.4], [s, 0.02, 4.4], 0.025, 0.025, '#BD312B', 1);
    b.addBeamBetween([-4.4, 0.02, s], [4.4, 0.02, s], 0.025, 0.025, '#BD312B', 1);
  }
  b.commitStep({
    stageIndex: 0,
    structureGroupId: 'COURTYARD',
    layerBit: 0,
    title: 'SITE · TRỤC ĐỊNH VỊ THIÊN QUANG',
    sku: 'KV-001',
    pieceCount: 0,
    materialLabel: 'dây mực · cọc tiêu',
    specification: 'mặt bằng vuông 6.80 × 6.80 m · trục Bắc–Nam Văn Miếu',
    massKg: 0,
    startTime: stepT(0.22),
    dropHeight: 0,
    callout: {
      title: 'NỀN GẠCH BÁT TRÀNG & BÓ VỈA ĐÁ XANH',
      subtitle: 'mặt bằng vuông 6.80 × 6.80 m',
      anchor: [-3.4, 0.25, 3.4],
      preferredSide: 'left',
    },
  });

  // Thanh Hóa green-stone perimeter curb & 3-step stairs (4 steps)
  cardinals.forEach((c, idx) => {
    for (let k = -4; k <= 4; k++) {
      const along = k * 0.82;
      const px = c.signX !== 0 ? c.signX * 3.55 : along;
      const pz = c.signZ !== 0 ? c.signZ * 3.55 : along;
      b.addBox(c.signX !== 0 ? 0.42 : 0.8, 0.55, c.signZ !== 0 ? 0.42 : 0.8, [px, 0.275, pz], COL_GREEN_STONE, 0);
    }
    // 3 stone steps at center of each side
    for (let st = 0; st < 3; st++) {
      const dist = 3.82 + st * 0.28;
      const h = 0.46 - st * 0.14;
      b.addBox(
        c.signX !== 0 ? 0.3 : 1.75,
        h,
        c.signZ !== 0 ? 0.3 : 1.75,
        [c.signX * dist, h * 0.5, c.signZ * dist],
        COL_GREEN_STONE,
        0
      );
    }
    b.commitStep({
      stageIndex: 0,
      structureGroupId: 'COURTYARD',
      layerBit: 0,
      title: `PLINTH · BÓ VỈA ĐÁ XANH · ${c.dir}`,
      sku: `KV-0${idx + 2}`,
      pieceCount: 24,
      materialLabel: 'đá xanh Thanh Hóa',
      specification: 'đá nguyên khối chạm nổi · tam cấp 3 bậc',
      massKg: 6200,
      startTime: stepT(0.32),
    });
  });

  // Bát Tràng terracotta paving grid (4 rows)
  for (let row = 0; row < 4; row++) {
    const zPos = -2.4 + row * 1.6;
    for (let ix = -4; ix <= 4; ix++) {
      b.addBox(0.74, 0.48, 1.54, [ix * 0.75, 0.28, zPos], COL_BAT_TRANG_BRICK, 0);
    }
    b.commitStep({
      stageIndex: 0,
      structureGroupId: 'COURTYARD',
      layerBit: 0,
      title: `COURTYARD · LÁT GẠCH BÁT TRÀNG · DẢI ${row + 1}`,
      sku: `BT-0${row + 1}`,
      pieceCount: 36,
      materialLabel: 'gạch Bát Tràng cổ',
      specification: 'gạch vuông 30 × 30 cm · vữa mật mía vôi giấy',
      massKg: 4800,
      startTime: stepT(0.28),
    });
  }

  // Central stone stele / incense pedestal on ground floor
  b.addBox(1.1, 0.36, 1.1, [0, 0.72, 0], COL_GREEN_STONE, 0);
  b.addBox(0.82, 0.42, 0.82, [0, 1.1, 0], COL_GREEN_STONE, 0);
  b.commitStep({
    stageIndex: 0,
    structureGroupId: 'COURTYARD',
    layerBit: 0,
    title: 'COURTYARD · BỆ ĐÁ TRUNG TÂM',
    sku: 'ST-09',
    pieceCount: 5,
    materialLabel: 'đá xanh chạm sen',
    specification: 'bệ đá vuông đặt chính tâm tầng dưới',
    massKg: 1450,
    startTime: stepT(0.25),
  });

  // ============================================================================
  // STAGE 02: TỨ TRỤ GẠCH VỒ & VÒM CỬA (2.6s -> 5.2s | LayerBit 1)
  // ============================================================================
  t = 2.62;
  const corners = [
    { name: 'ĐÔNG NAM', sx: 1, sz: 1 },
    { name: 'ĐÔNG BẮC', sx: 1, sz: -1 },
    { name: 'TÂY BẮC', sx: -1, sz: -1 },
    { name: 'TÂY NAM', sx: -1, sz: 1 },
  ];

  // 4 Massive Brick Corner Piers (lower & upper lifts = 8 steps)
  corners.forEach((cn, idx) => {
    const px = cn.sx * 2.25;
    const pz = cn.sz * 2.25;
    // Molded base + lower brick pier
    b.addBox(1.28, 0.26, 1.28, [px, 0.68, pz], COL_GREEN_STONE, 0);
    b.addBox(1.14, 1.45, 1.14, [px, 1.52, pz], COL_BAT_TRANG_BRICK, 0);
    // Decorative recessed plaster panel on outer faces
    b.addBox(0.76, 1.05, 1.17, [px, 1.52, pz], COL_PLASTER_CREAM, 2);
    b.addBox(1.17, 1.05, 0.76, [px, 1.52, pz], COL_PLASTER_CREAM, 2);

    b.commitStep({
      stageIndex: 1,
      structureGroupId: 'BRICK PIERS',
      layerBit: 1,
      title: `PIER · TRỤ GẠCH VỒ HẠ · ${cn.name}`,
      sku: `PR-0${idx + 1}`,
      pieceCount: 68,
      materialLabel: 'gạch vồ + vữa tam hợp',
      specification: 'trụ vuông 1.14 × 1.14 m · ô lồng đèn đắp nổi',
      massKg: 6400,
      startTime: stepT(0.28),
    });

    // Upper brick pier + cornice capital
    b.addBox(1.14, 1.38, 1.14, [px, 2.94, pz], COL_BAT_TRANG_BRICK, 0);
    b.addBox(1.26, 0.22, 1.26, [px, 3.74, pz], COL_PLASTER_CREAM, 2);
    b.commitStep({
      stageIndex: 1,
      structureGroupId: 'BRICK PIERS',
      layerBit: 1,
      title: `PIER · TRỤ GẠCH VỒ THƯỢNG · ${cn.name}`,
      sku: `PR-1${idx + 1}`,
      pieceCount: 64,
      materialLabel: 'gạch vồ cổ',
      specification: 'đầu trụ giật cấp gờ chỉ · cao độ +3.85 m',
      massKg: 5800,
      startTime: stepT(0.28),
    });
  });

  // 4 Brick Spandrel Lintels / Archways connecting the 4 piers
  cardinals.forEach((c, idx) => {
    const px = c.signX * 2.25;
    const pz = c.signZ * 2.25;
    b.addBox(c.signX !== 0 ? 0.92 : 3.4, 0.62, c.signZ !== 0 ? 0.92 : 3.4, [px, 3.54, pz], COL_BAT_TRANG_BRICK, 0);
    // Archway voussoir segments
    for (let a = -3; a <= 3; a++) {
      if (a === 0) continue;
      const along = a * 0.36;
      const archDrop = Math.abs(a) * 0.12;
      const ax = c.signX !== 0 ? px : along;
      const az = c.signZ !== 0 ? pz : along;
      b.addBox(0.34, 0.24 + archDrop, 0.34, [ax, 3.12 - archDrop * 0.5, az], COL_PLASTER_CREAM, 2);
    }
    b.commitStep({
      stageIndex: 1,
      structureGroupId: 'BRICK PIERS',
      layerBit: 1,
      title: `ARCHWAY · VÒM CỬA TỨ PHƯƠNG · ${c.dir}`,
      sku: `AR-0${idx + 1}`,
      pieceCount: 42,
      materialLabel: 'gạch vồ cuốn vòm',
      specification: 'cổng vòm thông phong 4 hướng · gờ chỉ trắng',
      massKg: 3100,
      startTime: stepT(0.11),
      callout: idx === 0
        ? {
            title: 'TỨ TRỤ GẠCH VỒ & CỬA VÒM',
            subtitle: '4 trụ vuông 1.14 m · nền đất vuông tượng trưng Địa',
            anchor: [2.25, 2.5, 2.25],
            preferredSide: 'right',
          }
        : undefined,
    });
  });

  // ============================================================================
  // STAGE 03: DẦM SÀN GỖ LIM & LAN CAN CON TIỆN (5.2s -> 7.3s | LayerBit 2)
  // ============================================================================
  t = 5.22;
  // Primary & secondary Ironwood floor joists (2 steps)
  for (let i = -3; i <= 3; i++) {
    b.addBox(6.1, 0.24, 0.22, [0, 3.96, i * 0.88], COL_IRONWOOD_RED, 1);
    b.addBox(0.22, 0.24, 6.1, [i * 0.88, 3.96, 0], COL_IRONWOOD_RED, 1);
  }
  b.commitStep({
    stageIndex: 2,
    structureGroupId: 'TIMBER DECK',
    layerBit: 2,
    title: 'DECK · HỆ DẦM ĐÀ GỖ LIM',
    sku: 'GD-01',
    pieceCount: 28,
    materialLabel: 'gỗ lim Thanh Hóa',
    specification: 'dầm cái & dầm con mộng thắt · tiết diện 22 × 24 cm',
    massKg: 3400,
    startTime: stepT(0.35),
  });

  // Thick timber floor planks leaving central acoustic opening
  for (let ix = -3; ix <= 3; ix++) {
    b.addBox(0.84, 0.1, 6.2, [ix * 0.86, 4.13, 0], COL_IRONWOOD_RED, 1);
  }
  b.commitStep({
    stageIndex: 2,
    structureGroupId: 'TIMBER DECK',
    layerBit: 2,
    title: 'DECK · VÁN SÀN GÁC THƯỢNG',
    sku: 'GD-02',
    pieceCount: 44,
    materialLabel: 'gỗ lim sơn son',
    specification: 'ván sàn ghép hèm dày 8 cm · hành lang 4 phía',
    massKg: 2600,
    startTime: stepT(0.35),
  });

  // 4 Carved Wooden Balustrades (Lan can con tiện & trụ sen — 4 steps)
  cardinals.forEach((c, idx) => {
    const out = 2.98;
    const w = out * 2;
    const px = c.signX * out;
    const pz = c.signZ * out;
    b.addBox(c.signX !== 0 ? 0.09 : w + 0.16, 0.09, c.signZ !== 0 ? 0.09 : w + 0.16, [px, 4.92, pz], COL_IRONWOOD_RED, 1);
    b.addBox(c.signX !== 0 ? 0.07 : w, 0.08, c.signZ !== 0 ? 0.07 : w, [px, 4.32, pz], COL_IRONWOOD_RED, 1);
    for (let k = -6; k <= 6; k++) {
      const along = (k / 6) * out;
      const bx = c.signX !== 0 ? px : along;
      const bz = c.signZ !== 0 ? pz : along;
      const isPost = k % 3 === 0;
      b.addBox(isPost ? 0.12 : 0.055, isPost ? 0.88 : 0.56, isPost ? 0.12 : 0.055, [bx, isPost ? 4.62 : 4.62, bz], isPost ? COL_GILT_GOLD : COL_IRONWOOD_RED, isPost ? 5 : 1);
    }
    b.commitStep({
      stageIndex: 2,
      structureGroupId: 'TIMBER DECK',
      layerBit: 2,
      title: `BALUSTRADE · LAN CAN CON TIỆN · ${c.dir}`,
      sku: `LC-0${idx + 1}`,
      pieceCount: 38,
      materialLabel: 'gỗ lim chạm khắc',
      specification: 'trụ búp sen thếp vàng · con tiện gỗ tiện tròn',
      massKg: 580,
      startTime: stepT(0.32),
    });
  });

  // ============================================================================
  // STAGE 04: BỘ KHUNG CỘT CÁI, CỘT QUÂN & VÌ KÈO (7.3s -> 9.4s | LayerBit 3)
  // ============================================================================
  t = 7.32;
  // 4 Inner Main Columns (Cột Cái) + 12 Perimeter Columns (Cột Quân)
  const innerSpan = 1.48;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.addCylinder(0.18, 0.2, 3.65, [sx * innerSpan, 4.18 + 1.825, sz * innerSpan], COL_IRONWOOD_RED, 1, 14);
    }
  }
  b.commitStep({
    stageIndex: 3,
    structureGroupId: 'PAVILION FRAME',
    layerBit: 3,
    title: 'FRAME · TỨ TRỤ CỘT CÁI GỖ LIM',
    sku: 'CC-01',
    pieceCount: 4,
    materialLabel: 'gỗ lim nguyên cây',
    specification: '4 cột cái thượng điểm · Ø 0.40 m · cao 3.65 m',
    massKg: 2100,
    startTime: stepT(0.38),
  });

  const outerSpan = 2.28;
  cardinals.forEach((c, idx) => {
    for (const along of [-outerSpan, -0.78, 0.78, outerSpan]) {
      const cx = c.signX !== 0 ? c.signX * outerSpan : along;
      const cz = c.signZ !== 0 ? c.signZ * outerSpan : along;
      b.addCylinder(0.14, 0.16, 2.55, [cx, 4.18 + 1.275, cz], COL_IRONWOOD_RED, 1, 12);
    }
    // Tie beams (Xà lòng, xà nách) & Con Sơn eaves brackets
    b.addBox(c.signX !== 0 ? 0.14 : outerSpan * 2.05, 0.16, c.signZ !== 0 ? 0.14 : outerSpan * 2.05, [c.signX * outerSpan, 6.62, c.signZ * outerSpan], COL_IRONWOOD_RED, 1);
    for (const along of [-outerSpan, -0.78, 0.78, outerSpan]) {
      const bx = c.signX !== 0 ? c.signX * (outerSpan + 0.28) : along;
      const bz = c.signZ !== 0 ? c.signZ * (outerSpan + 0.28) : along;
      b.addBox(c.signX !== 0 ? 0.56 : 0.18, 0.24, c.signZ !== 0 ? 0.56 : 0.18, [bx, 6.68, bz], COL_GILT_GOLD, 5);
    }
    b.commitStep({
      stageIndex: 3,
      structureGroupId: 'PAVILION FRAME',
      layerBit: 3,
      title: `FRAME · CỘT QUÂN & KẺ BẨY · ${c.dir}`,
      sku: `CQ-0${idx + 1}`,
      pieceCount: 26,
      materialLabel: 'gỗ lim sơn son thếp vàng',
      specification: 'cột quân Ø 0.32 m · xà nách · bẩy hiên chạm rồng',
      massKg: 1450,
      startTime: stepT(0.38),
    });
  });

  // Interior Bronze Hanging Bell & Ceremonial Drum inside Upper Pavilion!
  b.addCylinder(0.32, 0.42, 0.72, [0, 5.45, 0], COL_BRONZE_BELL, 4, 16);
  b.addBeamBetween([-0.65, 6.15, 0], [0.65, 6.15, 0], 0.12, 0.12, COL_GILT_GOLD, 5);
  b.commitStep({
    stageIndex: 3,
    structureGroupId: 'PAVILION FRAME',
    layerBit: 3,
    title: 'INTERIOR · ĐẠI HỒNG CHUNG & GIÁ TREO',
    sku: 'BL-09',
    pieceCount: 5,
    materialLabel: 'đồng đúc cổ',
    specification: 'chuông đồng treo giữa lòng gác Khuê Văn',
    massKg: 420,
    startTime: stepT(0.15),
  });

  // ============================================================================
  // STAGE 05: 8 CỬA TRÒN KHUÊ TINH TỎA TIA MẶT TRỜI (9.4s -> 11.6s | LayerBit 4)
  // ============================================================================
  t = 9.42;
  cardinals.forEach((c, idx) => {
    const wallDist = 2.18;
    const wx = c.signX * wallDist;
    const wz = c.signZ * wallDist;

    // Crimson wooden framing panels flanking the central circular Khuê Tinh window
    for (const side of [-1.45, 1.45]) {
      const sx = c.signX !== 0 ? wx : side;
      const sz = c.signZ !== 0 ? wz : side;
      b.addBox(c.signX !== 0 ? 0.1 : 1.15, 2.25, c.signZ !== 0 ? 0.1 : 1.15, [sx, 5.35, sz], COL_IRONWOOD_RED, 1);
    }

    // Iconic Circular Khuê Tinh Window Ring + 16 Radiating Gilded Sunbeams!!
    const winR = 0.76;
    const winY = 5.45;
    b.addRing(winR, 0.085, [wx, winY, wz], COL_GILT_GOLD, 5, Math.PI / 2, c.rot);
    b.addRing(winR * 0.84, 0.04, [wx, winY, wz], COL_IRONWOOD_RED, 1, Math.PI / 2, c.rot);

    for (let ray = 0; ray < 16; ray++) {
      const ang = (ray / 16) * Math.PI * 2;
      const rIn = winR;
      const rOut = winR + 0.36;
      const dy1 = Math.sin(ang) * rIn;
      const da1 = Math.cos(ang) * rIn;
      const dy2 = Math.sin(ang) * rOut;
      const da2 = Math.cos(ang) * rOut;

      const p1: [number, number, number] = [
        c.signX !== 0 ? wx : da1,
        winY + dy1,
        c.signZ !== 0 ? wz : da1,
      ];
      const p2: [number, number, number] = [
        c.signX !== 0 ? wx : da2,
        winY + dy2,
        c.signZ !== 0 ? wz : da2,
      ];
      b.addBeamBetween(p1, p2, 0.045, 0.045, COL_GILT_GOLD, 5);
    }

    // Gilded Horizontal Calligraphy Plaque ("KHUÊ VĂN CÁC") above South/North windows
    b.addBox(c.signX !== 0 ? 0.12 : 1.65, 0.36, c.signZ !== 0 ? 0.12 : 1.65, [wx * 1.03, 6.52, wz * 1.03], COL_GILT_GOLD, 5);

    b.commitStep({
      stageIndex: 4,
      structureGroupId: 'SUN WINDOWS',
      layerBit: 4,
      title: `KHUÊ TINH · CỬA TRÒN TỎA KHUÊ · ${c.dir}`,
      sku: `KT-0${idx + 1}`,
      pieceCount: 48,
      materialLabel: 'gỗ sơn son thếp vàng',
      specification: 'cửa tròn Ø 1.52 m · 16 tia sao Khuê · hoành phi thếp vàng',
      massKg: 640,
      startTime: stepT(0.48),
      callout: idx === 0
        ? {
            title: 'CỬA TRÒN SAO KHUÊ & TIA SÁNG',
            subtitle: 'trời tròn đất vuông · 16 tia văn chương tỏa rạng',
            anchor: [0, 5.55, 2.25],
            preferredSide: 'left',
          }
        : undefined,
    });
  });

  // ============================================================================
  // STAGE 06: HỆ CHỒNG DIÊM 2 TẦNG 8 MÁI & ĐỈNH MẶT NGUYỆT (11.6s -> 14.1s | LayerBit 5)
  // ============================================================================
  t = 11.62;
  const qDirs = ['SOUTH', 'EAST', 'NORTH', 'WEST'] as const;

  // Lower 4 Roofs (Tầng mái dưới — 4 steps)
  for (let q = 0; q < 4; q++) {
    b.addCurvedRoofQuadrant({
      quadrant: q as 0 | 1 | 2 | 3,
      innerHalfSpan: 1.52,
      outerHalfSpan: 3.88,
      innerY: 7.35,
      outerY: 6.18,
      cornerLift: 0.62, // Bold Vietnamese upturned dragon-blade eaves (Đao Guột)!
      thickness: 0.14,
      ribCount: 11,
      colorHex: COL_MUI_HAI_TILE,
      materialType: 3,
    });
    b.commitStep({
      stageIndex: 5,
      structureGroupId: 'EIGHT ROOFS',
      layerBit: 5,
      title: `LOWER ROOF · MÁI HẠ NGÓI MŨI HÀI · ${qDirs[q]}`,
      sku: `MH-1${q + 1}`,
      pieceCount: 86,
      materialLabel: 'ngói mũi hài đất nung',
      specification: 'mái chồng diêm tầng dưới · đao guột uốn cong 4 góc',
      massKg: 2100,
      startTime: stepT(0.24),
    });
  }

  // Cổ Diêm (Frieze neck wall between lower and upper roofs)
  for (const c of cardinals) {
    b.addBox(c.signX !== 0 ? 0.14 : 3.05, 0.58, c.signZ !== 0 ? 0.14 : 3.05, [c.signX * 1.52, 7.55, c.signZ * 1.52], COL_GILT_GOLD, 5);
  }
  b.commitStep({
    stageIndex: 5,
    structureGroupId: 'EIGHT ROOFS',
    layerBit: 5,
    title: 'ROOF NECK · CỔ DIÊM CHẠM LỘNG',
    sku: 'CD-01',
    pieceCount: 16,
    materialLabel: 'gỗ chạm thếp vàng',
    specification: 'ô cổ diêm ngăn giữa 2 tầng mái · cao +7.55 m',
    massKg: 520,
    startTime: stepT(0.22),
  });

  // Upper 4 Roofs (Tầng mái thượng — 4 steps)
  for (let q = 0; q < 4; q++) {
    b.addCurvedRoofQuadrant({
      quadrant: q as 0 | 1 | 2 | 3,
      innerHalfSpan: 0.18,
      outerHalfSpan: 3.25,
      innerY: 8.85,
      outerY: 7.52,
      cornerLift: 0.58,
      thickness: 0.14,
      ribCount: 10,
      colorHex: COL_MUI_HAI_TILE,
      materialType: 3,
    });
    b.commitStep({
      stageIndex: 5,
      structureGroupId: 'EIGHT ROOFS',
      layerBit: 5,
      title: `UPPER ROOF · MÁI THƯỢNG NGÓI MŨI HÀI · ${qDirs[q]}`,
      sku: `MH-2${q + 1}`,
      pieceCount: 78,
      materialLabel: 'ngói mũi hài cổ',
      specification: 'mái chồng diêm tầng thượng · giao nóc tứ giác',
      massKg: 1850,
      startTime: stepT(0.24),
      callout: q === 1
        ? {
            title: 'CHỒNG DIÊM 2 TẦNG 8 MÁI',
            subtitle: 'ngói mũi hài cổ · góc đao uốn cong vút cao',
            anchor: [3.2, 7.75, 1.2],
            preferredSide: 'right',
          }
        : undefined,
    });
  }

  // Rooftop Ridge Spine & Flaming Pearl / Mặt Nguyệt Crest (+9.45 m)
  b.addBox(1.85, 0.24, 0.22, [0, 8.95, 0], COL_PLASTER_CREAM, 2);
  b.addRing(0.32, 0.055, [0, 9.28, 0], COL_GILT_GOLD, 5, Math.PI / 2, 0);
  b.commitStep({
    stageIndex: 5,
    structureGroupId: 'EIGHT ROOFS',
    layerBit: 5,
    title: 'CREST · BỜ NÓC & HỒ LÔ MẶT NGUYỆT',
    sku: 'CR-01',
    pieceCount: 12,
    materialLabel: 'gốm men & đồng thếp vàng',
    specification: 'đỉnh mặt nguyệt lửa thiêng · cao độ đỉnh +9.45 m',
    massKg: 340,
    startTime: stepT(0.22),
  });

  const manifest: ProjectManifest = {
    id: 'khue-van-cac',
    dwgCode: 'KV-01',
    revision: 'A · 1805',
    monogram: 'KV',
    brandPrefix: 'HERITAGE',
    brandSuffix: 'BUILD',
    headerSubtitle: 'VIETNAMESE TIMBER & BRICK · ASSEMBLY · SECTION',
    drawingTitle: 'Khuê Văn Các — Văn Miếu Assembly Drawing',
    drawingSubtitle: 'Pavilion of the Constellation of Literature · built member by member',
    projectTitleUpper: 'KHUÊ VĂN CÁC · HANOI',
    watermarkText: 'KHUEVAN',
    categoryTag: '8 ROOFS',
    sequenceDuration: 25.0,
    paintStartTime: 14.2,
    paintEndTime: 18.2,
    sectionStartTime: 18.2,
    totalHeight: 9.45,
    footprintHalfExtent: 4.5,
    sourceKind: 'BUILTIN',
    description: 'Biểu tượng văn hiến Thăng Long – Hà Nội (1805): Nền gạch Bát Tràng, tứ trụ gạch vồ, gác gỗ lim sơn son thếp vàng với 8 cửa tròn Khuê Tinh tỏa tia sáng và hệ mái chồng diêm 8 mái ngói mũi hài.',
    stages: [
      { index: 0, id: '01_COURTYARD', shortCode: 'NỀN', ganttLabel: '01 BASE', cardTitle: '01. NỀN ĐÁ & BÁT TRÀNG', cardSubtitle: 'đá Thanh Hóa · sân gạch', sheetCode: 'A-101', phaseKind: 'ASSEMBLY', startTime: 0.0, endTime: 2.6, thumbnailKind: 'GHOST' },
      { index: 1, id: '02_PIERS', shortCode: 'TRỤ', ganttLabel: '02 PIERS', cardTitle: '02. TỨ TRỤ GẠCH VỒ', cardSubtitle: '4 trụ vuông · cổng vòm', sheetCode: 'A-102', phaseKind: 'ASSEMBLY', startTime: 2.6, endTime: 5.2, thumbnailKind: 'BASE' },
      { index: 2, id: '03_DECK', shortCode: 'SÀN', ganttLabel: '03 DECK', cardTitle: '03. SÀN LIM & LAN CAN', cardSubtitle: 'dầm lim · con tiện gỗ', sheetCode: 'A-103', phaseKind: 'ASSEMBLY', startTime: 5.2, endTime: 7.3, thumbnailKind: 'LOW_TIERS' },
      { index: 3, id: '04_FRAME', shortCode: 'KHUNG', ganttLabel: '04 FRAME', cardTitle: '04. KHUNG CỘT & VÌ KÈO', cardSubtitle: '16 cột lim · chuông đồng', sheetCode: 'A-104', phaseKind: 'ASSEMBLY', startTime: 7.3, endTime: 9.4, thumbnailKind: 'MID_TIERS' },
      { index: 4, id: '05_WINDOWS', shortCode: 'KHUÊ', ganttLabel: '05 SUNWIN', cardTitle: '05. CỬA TRÒN KHUÊ TINH', cardSubtitle: '16 tia sáng · hoành phi', sheetCode: 'A-105', phaseKind: 'ASSEMBLY', startTime: 9.4, endTime: 11.6, thumbnailKind: 'UPPER_TIERS' },
      { index: 5, id: '06_ROOFS', shortCode: '8 MÁI', ganttLabel: '06 ROOFS', cardTitle: '06. CHỒNG DIÊM 8 MÁI', cardSubtitle: 'ngói mũi hài · đao guột', sheetCode: 'A-106', phaseKind: 'ASSEMBLY', startTime: 11.6, endTime: 14.2, thumbnailKind: 'SPIRE' },
      { index: 6, id: '07_PAINT', shortCode: 'PAINT', ganttLabel: '07 PAINT', cardTitle: '07. SƠN SON THẾP VÀNG', cardSubtitle: 'gạch cổ · sơn son · 4.0 s', sheetCode: 'A-107', phaseKind: 'LACQUER', startTime: 14.2, endTime: 18.2, thumbnailKind: 'PAINT' },
      { index: 7, id: '08_SECTION', shortCode: 'SECTION', ganttLabel: '08 SECTION', cardTitle: '08. SECTION A-A', cardSubtitle: 'cắt dọc gác Khuê · 6.8 s', sheetCode: 'A-108', phaseKind: 'SECTION', startTime: 18.2, endTime: 25.0, thumbnailKind: 'SECTION' },
    ],
    structureGroups: [
      { id: 'EIGHT ROOFS', label: '8 ROOFS', widthRatio: 0.92, totalSteps: 0, layerBit: 5 },
      { id: 'SUN WINDOWS', label: 'SUN WIN', widthRatio: 0.64, totalSteps: 0, layerBit: 4 },
      { id: 'PAVILION FRAME', label: 'FRAME', widthRatio: 0.68, totalSteps: 0, layerBit: 3 },
      { id: 'TIMBER DECK', label: 'DECK', widthRatio: 0.80, totalSteps: 0, layerBit: 2 },
      { id: 'BRICK PIERS', label: '4 PIERS', widthRatio: 0.72, totalSteps: 0, layerBit: 1 },
      { id: 'COURTYARD', label: 'PLINTH', widthRatio: 1.0, totalSteps: 0, layerBit: 0 },
    ],
    elevationMarkers: [
      { code: 'GL', height: 0.0 },
      { code: 'SÂN', height: 0.55 },
      { code: 'VÒM', height: 3.15 },
      { code: 'SÀN', height: 4.18 },
      { code: 'MÁI 1', height: 6.18 },
      { code: 'MÁI 2', height: 7.52 },
      { code: 'TOP', height: 9.45 },
    ],
    cameraKeyframes: [
      { time: 0.0, azimuthDeg: 218, elevationDeg: 21, distance: 19.5, target: [0, 3.8, 0], fov: 30, allowAutoRotate: true },
      { time: 3.5, azimuthDeg: 238, elevationDeg: 20, distance: 16.5, target: [0, 2.8, 0], fov: 30, allowAutoRotate: true },
      { time: 8.5, azimuthDeg: 275, elevationDeg: 18, distance: 17.5, target: [0, 4.8, 0], fov: 30, allowAutoRotate: true },
      { time: 13.5, azimuthDeg: 320, elevationDeg: 17, distance: 21.0, target: [0, 4.9, 0], fov: 30, allowAutoRotate: true },
      { time: 18.4, azimuthDeg: 62, elevationDeg: 10, distance: 18.0, target: [0, 4.6, 0], fov: 32, allowAutoRotate: false },
      { time: 20.6, azimuthDeg: 92, elevationDeg: 6, distance: 9.2, target: [0, 2.6, 0], fov: 38, allowAutoRotate: false },
      { time: 23.0, azimuthDeg: 102, elevationDeg: 10, distance: 8.8, target: [0, 6.0, 0], fov: 40, allowAutoRotate: false },
      { time: 25.0, azimuthDeg: 218, elevationDeg: 21, distance: 19.5, target: [0, 3.8, 0], fov: 30, allowAutoRotate: true },
    ],
    sectionKeyframes: [
      { time: 0.0, enabled: false, azimuthDeg: 100, offset: 8.0 },
      { time: 18.2, enabled: true, azimuthDeg: 100, offset: 8.0 },
      { time: 19.2, enabled: true, azimuthDeg: 100, offset: 0.25 },
      { time: 23.7, enabled: true, azimuthDeg: 100, offset: 0.25 },
      { time: 24.6, enabled: true, azimuthDeg: 100, offset: 8.0 },
      { time: 25.0, enabled: false, azimuthDeg: 100, offset: 8.0 },
    ],
    specialOperations: [
      {
        id: 'KV-P1',
        stageIndex: 6,
        startTime: 14.2,
        endTime: 16.2,
        title: 'TERRACOTTA · GẠCH BÁT TRÀNG & ĐÁ XANH',
        stepCode: 'P-01',
        stageLabel: '07 · PAINT',
        quantityLabel: 'lớp 1 / 2',
        materialLabel: 'gạch nung đỏ cam & vôi trắng',
        specification: 'lên màu gạch vồ cổ, đá xanh Thanh Hóa & chỉ vữa trắng',
        centroid: [0, 2.5, 0],
        massLabel: '0.42 t vôi sơn',
        bannerStatus: 'SƠN SON · LỚP 1 / 2 · 48 %',
        logMessage: 'LACQ lớp 1/2 · lên màu gạch Bát Tràng & tứ trụ gạch vồ',
      },
      {
        id: 'KV-P2',
        stageIndex: 6,
        startTime: 16.2,
        endTime: 18.2,
        title: 'GILDING · SƠN SON THẾP VÀNG & NGÓI MŨI HÀI',
        stepCode: 'P-02',
        stageLabel: '07 · PAINT',
        quantityLabel: 'lớp 2 / 2',
        materialLabel: 'sơn ta chu sa & vàng quỳ 24K',
        specification: 'thếp vàng 16 tia sao Khuê, hoành phi & lợp màu ngói cổ',
        centroid: [0, 6.8, 0],
        massLabel: '0.35 t sơn ta',
        bannerStatus: 'THẾP VÀNG · LỚP 2 / 2 · 100 %',
        logMessage: 'LACQ lớp 2/2 · hoàn thiện sơn son thếp vàng Khuê Văn Các ✓',
      },
      {
        id: 'KV-S1',
        stageIndex: 7,
        startTime: 18.2,
        endTime: 21.4,
        title: 'SECTION A-A · KHÔNG GIAN VÒM TỨ PHƯƠNG',
        stepCode: 'S-01',
        stageLabel: '08 · SECTION',
        quantityLabel: '1 mặt cắt',
        materialLabel: 'gạch vồ & đá xanh',
        specification: 'cắt dọc qua vòm gạch tầng dưới & bệ đá trung tâm',
        centroid: [0, 2.2, 0],
        massLabel: '—',
        bannerStatus: 'SECTION A-A · d 0.25 m',
        logMessage: 'CUT mặt phẳng A-A · lộ kết cấu trụ gạch vồ & bệ đá tâm',
      },
      {
        id: 'KV-S2',
        stageIndex: 7,
        startTime: 21.4,
        endTime: 25.0,
        title: 'SECTION A-A · LÒNG GÁC KHUÊ VĂN & VÌ CHỒNG DIÊM',
        stepCode: 'S-02',
        stageLabel: '08 · SECTION',
        quantityLabel: 'nội thất gác',
        materialLabel: 'gỗ lim & chuông đồng',
        specification: 'khảo sát chuông đồng, cửa Khuê Tinh và hệ vì chồng diêm 8 mái',
        centroid: [0, 6.2, 0],
        massLabel: '—',
        bannerStatus: 'SECTION A-A · GÁC THƯỢNG',
        logMessage: 'VIEW lòng gác Khuê Văn · chuông đồng & vì chồng diêm 2 tầng mái',
        callout: {
          id: 'co-kv-bell',
          stepIndex: 40,
          triggerTime: 21.6,
          title: 'LÒNG GÁC THƯỢNG & ĐẠI HỒNG CHUNG',
          subtitle: 'liên kết mộng gỗ lim · vì chồng diêm 8 mái',
          anchor: [0, 5.6, 0],
          preferredSide: 'left',
        },
      },
    ],
    silhouetteLines: [
      { x1: 0.10, y1: 0, x2: 0.90, y2: 0 },
      { x1: 0.16, y1: 0.55, x2: 0.84, y2: 0.55 },
      { x1: 0.24, y1: 0.55, x2: 0.24, y2: 3.85 },
      { x1: 0.76, y1: 0.55, x2: 0.76, y2: 3.85 },
      { x1: 0.18, y1: 4.18, x2: 0.82, y2: 4.18 },
      { x1: 0.08, y1: 6.20, x2: 0.92, y2: 6.20 },
      { x1: 0.16, y1: 7.55, x2: 0.84, y2: 7.55 },
      { x1: 0.35, y1: 8.95, x2: 0.65, y2: 8.95 },
    ],
  };

  return b.compile(manifest);
}
