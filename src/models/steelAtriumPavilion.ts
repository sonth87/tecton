import { ParametricStructureBuilder } from '@/models/sdk/ParametricBuilder';
import type { CompiledProjectPackage, ProjectManifest } from '@/core/types/project';

const COL_CONCRETE = '#CEC9BE';
const COL_STEEL_RED_OXIDE = '#9C3026';
const COL_STEEL_GRAPHITE = '#34383D';
const COL_CHAMPAGNE_ALU = '#B59B72';
const COL_DECK_SLAB = '#E5DFD3';
const COL_GLAZING_TINT = '#6A8D9C';

/**
 * Built-in Masterpiece #3: Modern Diagrid Steel Atrium Pavilion (DWG SF-03)
 * Showcases contemporary structural steel engineering in the exact same Ink & Paper CAD paradigm:
 * - Reinforced concrete pile caps & anchor bolt pedestals
 * - 8 perimeter wide-flange mega-columns & central structural core
 * - Suspended mezzanine decks & steel truss skybridges
 * - Sweeping 3-story exterior tubular steel Diagrid exoskeleton
 * - Long-span cantilevered space-truss roof canopy with central skylight oculus
 * - Unitized structural glass curtain wall & solar-control louver fins
 */
export function buildSteelAtriumPackage(): CompiledProjectPackage {
  const b = new ParametricStructureBuilder();

  let t = 0.05;
  const stepT = (dt: number) => {
    const cur = Number(t.toFixed(3));
    t += dt;
    return cur;
  };

  const radius = 6.8;
  const numCols = 12;

  // ============================================================================
  // STAGE 01: PAD FOOTINGS, RING GRADE BEAMS & PLAZA (0.0s -> 2.4s | LayerBit 0)
  // ============================================================================
  for (let i = -3; i <= 3; i++) {
    b.addBeamBetween([i * 2.5, 0.02, -8.5], [i * 2.5, 0.02, 8.5], 0.03, 0.03, '#BD312B', 1);
    b.addBeamBetween([-8.5, 0.02, i * 2.5], [8.5, 0.02, i * 2.5], 0.03, 0.03, '#BD312B', 1);
  }
  b.commitStep({
    stageIndex: 0,
    structureGroupId: 'SUBSTRUCTURE',
    layerBit: 0,
    title: 'SITE · LASER TOTAL-STATION GRID',
    sku: 'SF-001',
    pieceCount: 0,
    materialLabel: 'radial & orthogonal grid',
    specification: 'radial ring R = 6.80 m · 12 structural axes',
    massKg: 0,
    startTime: stepT(0.22),
    dropHeight: 0,
    callout: {
      title: 'PILE CAPS & PINNED BASEPLATES',
      subtitle: 'C50 concrete footings · M42 anchor bolts',
      anchor: [6.8, 0.5, 0],
      preferredSide: 'right',
    },
  });

  // 12 Perimeter Pile Caps & Cast-Steel Clevis Baseplates (4 groups of 3)
  for (let grp = 0; grp < 4; grp++) {
    for (let k = 0; k < 3; k++) {
      const idx = grp * 3 + k;
      const ang = (idx / numCols) * Math.PI * 2;
      const cx = Math.cos(ang) * radius;
      const cz = Math.sin(ang) * radius;
      b.addBox(1.65, 0.75, 1.65, [cx, 0.375, cz], COL_CONCRETE, 0, -ang);
      b.addCylinder(0.42, 0.52, 0.28, [cx, 0.88, cz], COL_STEEL_GRAPHITE, 4, 12);
    }
    b.commitStep({
      stageIndex: 0,
      structureGroupId: 'SUBSTRUCTURE',
      layerBit: 0,
      title: `FOUNDATION · RC PILE CAPS · QUADRANT ${grp + 1}`,
      sku: `PC-0${grp + 1}`,
      pieceCount: 27,
      materialLabel: 'C50 concrete + S355 steel',
      specification: '1.65 × 1.65 m pile cap · 8× M42 high-tensile anchor bolts',
      massKg: 18400,
      startTime: stepT(0.35),
    });
  }

  // Circular Plaza Podium Slab
  b.addCylinder(7.9, 8.2, 0.45, [0, 0.225, 0], COL_CONCRETE, 0, 24);
  b.addCylinder(2.6, 2.8, 0.68, [0, 0.34, 0], COL_CONCRETE, 0, 20);
  b.commitStep({
    stageIndex: 0,
    structureGroupId: 'SUBSTRUCTURE',
    layerBit: 0,
    title: 'SUBSTRUCTURE · ATRIUM GROUND SLAB & CORE MAT',
    sku: 'SL-01',
    pieceCount: 36,
    materialLabel: 'post-tensioned concrete',
    specification: 'ground slab Ø 16.4 m · central core mat thickness 0.68 m',
    massKg: 64000,
    startTime: stepT(0.45),
  });

  // ============================================================================
  // STAGE 02: PRIMARY MEGA-COLUMNS & CENTRAL CORE (2.4s -> 5.0s | LayerBit 1)
  // ============================================================================
  t = 2.42;
  // Central open steel elevator/stair braced frame core (3 lifts)
  for (let lift = 0; lift < 3; lift++) {
    const y0 = 0.68 + lift * 6.4;
    const y1 = y0 + 6.4;
    const cs = 1.45;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        b.addBox(0.32, 6.4, 0.32, [sx * cs, (y0 + y1) * 0.5, sz * cs], COL_STEEL_RED_OXIDE, 1);
      }
    }
    // Horizontal & K-bracing on East/West core faces (leaving N/S open for skybridges!)
    for (const sx of [-1, 1]) {
      b.addBeamBetween([sx * cs, y1, -cs], [sx * cs, y1, cs], 0.22, 0.22, COL_STEEL_RED_OXIDE, 1);
      b.addBeamBetween([sx * cs, y0, -cs], [sx * cs, y1, 0], 0.14, 0.14, COL_STEEL_GRAPHITE, 4);
      b.addBeamBetween([sx * cs, y0, cs], [sx * cs, y1, 0], 0.14, 0.14, COL_STEEL_GRAPHITE, 4);
    }
    b.commitStep({
      stageIndex: 1,
      structureGroupId: 'MEGA COLUMNS',
      layerBit: 1,
      title: `CORE · BRACED STEEL CORE · LIFT ${lift + 1}`,
      sku: `CR-0${lift + 1}`,
      pieceCount: 28,
      materialLabel: 'S355 box sections',
      specification: 'HSS 320×320 box columns · eccentric K-bracing',
      massKg: 14200,
      startTime: stepT(0.42),
    });
  }

  // 12 Perimeter Inclined / Tapered Steel Mega-Columns (4 quadrants)
  for (let grp = 0; grp < 4; grp++) {
    for (let k = 0; k < 3; k++) {
      const idx = grp * 3 + k;
      const ang = (idx / numCols) * Math.PI * 2;
      const pBot: [number, number, number] = [Math.cos(ang) * radius, 0.95, Math.sin(ang) * radius];
      const pTop: [number, number, number] = [Math.cos(ang) * (radius * 1.08), 19.8, Math.sin(ang) * (radius * 1.08)];
      b.addBeamBetween(pBot, pTop, 0.38, 0.46, COL_STEEL_RED_OXIDE, 1);
    }
    b.commitStep({
      stageIndex: 1,
      structureGroupId: 'MEGA COLUMNS',
      layerBit: 1,
      title: `COLUMNS · TAPERED BOX MEGA-COLUMNS · Q${grp + 1}`,
      sku: `MC-0${grp + 1}`,
      pieceCount: 15,
      materialLabel: 'welded S460 plate steel',
      specification: 'inclined 18.85 m mega-columns · intumescent red primer',
      massKg: 21500,
      startTime: stepT(0.32),
    });
  }

  // ============================================================================
  // STAGE 03: MEZZANINE RINGS & SUSPENDED SKYBRIDGES (5.0s -> 7.6s | LayerBit 2)
  // ============================================================================
  t = 5.02;
  const floorHeights = [6.8, 13.2];
  floorHeights.forEach((fy, fIdx) => {
    const rFloor = radius * (1 + 0.08 * (fy / 19.8));
    // Radial cantilevered castellated steel girders
    for (let i = 0; i < numCols; i++) {
      const ang = (i / numCols) * Math.PI * 2;
      b.addBeamBetween(
        [Math.cos(ang) * 2.1, fy - 0.25, Math.sin(ang) * 2.1],
        [Math.cos(ang) * rFloor, fy - 0.25, Math.sin(ang) * rFloor],
        0.22,
        0.42,
        COL_STEEL_RED_OXIDE,
        1
      );
    }
    b.commitStep({
      stageIndex: 2,
      structureGroupId: 'MEZZANINES',
      layerBit: 2,
      title: `FLOOR L${fIdx + 2} · RADIAL CANTILEVER GIRDERS`,
      sku: `FG-0${fIdx + 1}`,
      pieceCount: 48,
      materialLabel: 'cellular steel beams',
      specification: `IPE 550 cellular girders · elev +${fy.toFixed(2)} m`,
      massKg: 19600,
      startTime: stepT(0.45),
    });

    // Ring composite metal deck gallery (open atrium void in middle!)
    for (let seg = 0; seg < numCols; seg++) {
      const a0 = (seg / numCols) * Math.PI * 2;
      const a1 = ((seg + 1) / numCols) * Math.PI * 2;
      const aMid = (a0 + a1) * 0.5;
      b.addBeamBetween(
        [Math.cos(a0) * (rFloor - 1.5), fy + 0.05, Math.sin(a0) * (rFloor - 1.5)],
        [Math.cos(a1) * (rFloor - 1.5), fy + 0.05, Math.sin(a1) * (rFloor - 1.5)],
        2.6,
        0.22,
        COL_DECK_SLAB,
        2
      );
      // Glass atrium guard rail
      b.addBeamBetween(
        [Math.cos(a0) * (rFloor - 2.7), fy + 0.65, Math.sin(a0) * (rFloor - 2.7)],
        [Math.cos(a1) * (rFloor - 2.7), fy + 0.65, Math.sin(a1) * (rFloor - 2.7)],
        0.06,
        0.95,
        COL_GLAZING_TINT,
        5
      );
      void aMid;
    }
    b.commitStep({
      stageIndex: 2,
      structureGroupId: 'MEZZANINES',
      layerBit: 2,
      title: `FLOOR L${fIdx + 2} · COMPOSITE RING DECK & BALUSTRADE`,
      sku: `FD-0${fIdx + 1}`,
      pieceCount: 64,
      materialLabel: 'steel deck + concrete topping',
      specification: '2.60 m perimeter gallery · laminated glass guardrails',
      massKg: 34000,
      startTime: stepT(0.45),
    });

    // Dramatic Truss Skybridge spanning across the central atrium void!
    const bridgeRot = fIdx === 0 ? 0 : Math.PI / 2;
    b.addBox(1.9, 0.22, (rFloor - 2.4) * 2, [0, fy + 0.08, 0], COL_CHAMPAGNE_ALU, 4, bridgeRot);
    b.commitStep({
      stageIndex: 2,
      structureGroupId: 'MEZZANINES',
      layerBit: 2,
      title: `SKYBRIDGE L${fIdx + 2} · SUSPENDED ATRIUM LINK`,
      sku: `SB-0${fIdx + 1}`,
      pieceCount: 22,
      materialLabel: 'tensioned steel + oak soffit',
      specification: `clear-span atrium pedestrian bridge · +${fy.toFixed(2)} m`,
      massKg: 6800,
      startTime: stepT(0.35),
      callout: fIdx === 1
        ? {
            title: 'SUSPENDED ATRIUM SKYBRIDGE',
            subtitle: 'clear-span tensioned link · +13.20 m',
            anchor: [0, fy + 0.3, 2.5],
            preferredSide: 'left',
          }
        : undefined,
    });
  });

  // ============================================================================
  // STAGE 04: EXTERIOR TUBULAR DIAGRID EXOSKELETON (7.6s -> 10.0s | LayerBit 3)
  // ============================================================================
  t = 7.62;
  const diagridBands = [
    { y0: 0.95, y1: 6.8, r0: radius, r1: radius * 1.027 },
    { y0: 6.8, y1: 13.2, r0: radius * 1.027, r1: radius * 1.053 },
    { y0: 13.2, y1: 19.8, r0: radius * 1.053, r1: radius * 1.08 },
  ];

  diagridBands.forEach((band, bIdx) => {
    for (let dirSign of [1, -1]) {
      for (let i = 0; i < numCols; i++) {
        const a0 = (i / numCols) * Math.PI * 2;
        const a1 = ((i + dirSign) / numCols) * Math.PI * 2;
        b.addBeamBetween(
          [Math.cos(a0) * band.r0, band.y0, Math.sin(a0) * band.r0],
          [Math.cos(a1) * band.r1, band.y1, Math.sin(a1) * band.r1],
          0.22,
          0.22,
          COL_STEEL_GRAPHITE,
          4,
          true
        );
      }
      // Ring tie girder at top of band
      if (dirSign === -1) {
        for (let i = 0; i < numCols; i++) {
          const a0 = (i / numCols) * Math.PI * 2;
          const a1 = ((i + 1) / numCols) * Math.PI * 2;
          b.addBeamBetween(
            [Math.cos(a0) * band.r1, band.y1, Math.sin(a0) * band.r1],
            [Math.cos(a1) * band.r1, band.y1, Math.sin(a1) * band.r1],
            0.28,
            0.28,
            COL_STEEL_RED_OXIDE,
            1
          );
        }
      }
      b.commitStep({
        stageIndex: 3,
        structureGroupId: 'DIAGRID',
        layerBit: 3,
        title: `DIAGRID TIER ${bIdx + 1} · ${dirSign > 0 ? 'PRIMARY HELIX' : 'COUNTER HELIX & RING'}`,
        sku: `DG-${bIdx + 1}${dirSign > 0 ? 'A' : 'B'}`,
        pieceCount: 36,
        materialLabel: 'CHS 273×16 tubular steel',
        specification: 'cast-steel diagrid nodes · lateral seismic exoskeleton',
        massKg: 16200,
        startTime: stepT(0.38),
        callout: bIdx === 1 && dirSign === -1
          ? {
              title: 'TUBULAR DIAGRID EXOSKELETON',
              subtitle: 'CHS 273×16 diagonals · cast-steel star nodes',
              anchor: [band.r1, (band.y0 + band.y1) * 0.5, 0],
              preferredSide: 'right',
            }
          : undefined,
      });
    }
  });

  // ============================================================================
  // STAGE 05: CANTILEVERED SPACE-TRUSS ROOF & OCULUS (10.0s -> 12.2s | LayerBit 4)
  // ============================================================================
  t = 10.02;
  const oculusR = 2.6;
  const canopyR = 9.6;

  // Compression & Tension Oculus Rings (+23.6m & +21.8m)
  b.addRing(oculusR, 0.24, [0, 23.6, 0], COL_STEEL_RED_OXIDE, 1);
  b.addRing(oculusR * 1.15, 0.18, [0, 21.8, 0], COL_STEEL_GRAPHITE, 4);
  for (let i = 0; i < numCols; i++) {
    const ang = (i / numCols) * Math.PI * 2;
    b.addBeamBetween(
      [Math.cos(ang) * oculusR, 23.6, Math.sin(ang) * oculusR],
      [Math.cos(ang) * (oculusR * 1.15), 21.8, Math.sin(ang) * (oculusR * 1.15)],
      0.14,
      0.14,
      COL_STEEL_GRAPHITE,
      4,
      true
    );
  }
  b.commitStep({
    stageIndex: 4,
    structureGroupId: 'ROOF CANOPY',
    layerBit: 4,
    title: 'ROOF · CENTRAL OCULUS COMPRESSION RING',
    sku: 'OC-01',
    pieceCount: 38,
    materialLabel: 'rolled tubular steel',
    specification: 'skylight compression ring Ø 5.20 m · elev +23.60 m',
    massKg: 11800,
    startTime: stepT(0.45),
  });

  // 12 Sweeping Cantilever Roof Space-Truss Ribs (4 quadrants)
  for (let grp = 0; grp < 4; grp++) {
    for (let k = 0; k < 3; k++) {
      const idx = grp * 3 + k;
      const ang = (idx / numCols) * Math.PI * 2;
      const cX = Math.cos(ang);
      const cZ = Math.sin(ang);
      // Top chord, bottom chord & web diagonals
      b.addBeamBetween([cX * oculusR, 23.6, cZ * oculusR], [cX * canopyR, 21.2, cZ * canopyR], 0.22, 0.28, COL_STEEL_RED_OXIDE, 1);
      b.addBeamBetween([cX * (oculusR * 1.15), 21.8, cZ * (oculusR * 1.15)], [cX * (radius * 1.08), 19.8, cZ * (radius * 1.08)], 0.2, 0.24, COL_STEEL_GRAPHITE, 4);
      b.addBeamBetween([cX * (radius * 1.08), 19.8, cZ * (radius * 1.08)], [cX * canopyR, 21.2, cZ * canopyR], 0.18, 0.2, COL_STEEL_GRAPHITE, 4);
    }
    b.commitStep({
      stageIndex: 4,
      structureGroupId: 'ROOF CANOPY',
      layerBit: 4,
      title: `ROOF · CANTILEVER SPACE-TRUSS RIBS · Q${grp + 1}`,
      sku: `RT-0${grp + 1}`,
      pieceCount: 42,
      materialLabel: 'S460 space-frame',
      specification: '2.40 m overhang cantilever · acoustic soffit purlins',
      massKg: 15400,
      startTime: stepT(0.38),
    });
  }

  // Crown Spire Mast & Lightning Finial reaching +26.40 m
  b.addRing(canopyR, 0.16, [0, 21.2, 0], COL_CHAMPAGNE_ALU, 4);
  b.addCylinder(0.06, 0.18, 4.6, [0, 24.1, 0], COL_CHAMPAGNE_ALU, 5, 12);
  b.commitStep({
    stageIndex: 4,
    structureGroupId: 'ROOF CANOPY',
    layerBit: 4,
    title: 'CROWN · FASCIA RING & TELEMETRY MAST',
    sku: 'FN-01',
    pieceCount: 26,
    materialLabel: 'anodized champagne aluminum',
    specification: 'perimeter drip edge Ø 19.2 m · apex mast +26.40 m',
    massKg: 4900,
    startTime: stepT(0.22),
  });

  // ============================================================================
  // STAGE 06: CURTAIN WALL GLAZING & SOLAR LOUVERS (12.2s -> 14.1s | LayerBit 5)
  // ============================================================================
  t = 12.22;
  for (let grp = 0; grp < 4; grp++) {
    for (let k = 0; k < 3; k++) {
      const idx = grp * 3 + k;
      const a0 = (idx / numCols) * Math.PI * 2;
      const a1 = ((idx + 1) / numCols) * Math.PI * 2;
      const aMid = (a0 + a1) * 0.5;

      // Vertical architectural solar-shading champagne fins
      for (let fin = 0; fin < 3; fin++) {
        const af = a0 + ((fin + 0.5) / 3) * (a1 - a0);
        b.addBeamBetween(
          [Math.cos(af) * (radius * 1.04), 1.4, Math.sin(af) * (radius * 1.04)],
          [Math.cos(af) * (radius * 1.12), 19.6, Math.sin(af) * (radius * 1.12)],
          0.08,
          0.42,
          COL_CHAMPAGNE_ALU,
          5
        );
      }

      // Curtain wall transom rings
      for (const ty of [3.8, 10.0, 16.5]) {
        const tr = radius * (1 + 0.08 * (ty / 19.8));
        b.addBeamBetween(
          [Math.cos(a0) * tr, ty, Math.sin(a0) * tr],
          [Math.cos(a1) * tr, ty, Math.sin(a1) * tr],
          0.12,
          0.16,
          COL_GLAZING_TINT,
          5
        );
      }
      void aMid;
    }
    b.commitStep({
      stageIndex: 5,
      structureGroupId: 'ENVELOPE',
      layerBit: 5,
      title: `ENVELOPE · UNITIZED GLAZING & SOLAR FINS · Q${grp + 1}`,
      sku: `CW-0${grp + 1}`,
      pieceCount: 94,
      materialLabel: 'low-E double glazing + champagne alu',
      specification: 'extruded vertical brise-soleil fins · spider point fixings',
      massKg: 14800,
      startTime: stepT(0.44),
      callout: grp === 2
        ? {
            title: 'SOLAR LOUVER FINS & CURTAIN WALL',
            subtitle: 'champagne anodized aluminum · low-E glazing',
            anchor: [-radius * 1.08, 10.0, 0],
            preferredSide: 'left',
          }
        : undefined,
    });
  }

  const manifest: ProjectManifest = {
    id: 'steel-atrium-pavilion',
    dwgCode: 'SF-03',
    revision: 'B · 2026',
    monogram: 'SF',
    brandPrefix: 'STEEL',
    brandSuffix: 'BUILD',
    headerSubtitle: 'DIAGRID EXOSKELETON · ASSEMBLY · SECTION',
    drawingTitle: 'Diagrid Steel Atrium — Structural Assembly',
    drawingSubtitle: 'Tubular diagrid rotunda · cantilevered space-truss canopy & skybridges',
    projectTitleUpper: 'DIAGRID STEEL ATRIUM',
    watermarkText: 'DIAGRID',
    categoryTag: 'DIAGRID',
    sequenceDuration: 25.0,
    paintStartTime: 14.2,
    paintEndTime: 18.2,
    sectionStartTime: 18.2,
    totalHeight: 26.4,
    footprintHalfExtent: 9.8,
    sourceKind: 'BUILTIN',
    description: 'High-tech contemporary rotunda featuring C50 pile caps, S460 tapered mega-columns, suspended atrium skybridges, tubular diagrid exoskeleton, and cantilevered oculus canopy.',
    stages: [
      { index: 0, id: '01_FOOTINGS', shortCode: 'FDN', ganttLabel: '01 FOOTING', cardTitle: '01. FOOTINGS & SLAB', cardSubtitle: '12 pile caps · M42 anchors', sheetCode: 'S-101', phaseKind: 'ASSEMBLY', startTime: 0.0, endTime: 2.4, thumbnailKind: 'GHOST' },
      { index: 1, id: '02_COLUMNS', shortCode: 'COLS', ganttLabel: '02 COLUMNS', cardTitle: '02. CORE & MEGA-COLUMNS', cardSubtitle: 'braced core · 12 box cols', sheetCode: 'S-102', phaseKind: 'ASSEMBLY', startTime: 2.4, endTime: 5.0, thumbnailKind: 'BASE' },
      { index: 2, id: '03_FLOORS', shortCode: 'DECK', ganttLabel: '03 DECKS', cardTitle: '03. DECKS & SKYBRIDGES', cardSubtitle: 'cellular beams · 2 bridges', sheetCode: 'S-103', phaseKind: 'ASSEMBLY', startTime: 5.0, endTime: 7.6, thumbnailKind: 'LOW_TIERS' },
      { index: 3, id: '04_DIAGRID', shortCode: 'DIAG', ganttLabel: '04 DIAGRID', cardTitle: '04. TUBULAR DIAGRID', cardSubtitle: 'CHS 273 · star nodes', sheetCode: 'S-104', phaseKind: 'ASSEMBLY', startTime: 7.6, endTime: 10.0, thumbnailKind: 'MID_TIERS' },
      { index: 4, id: '05_CANOPY', shortCode: 'ROOF', ganttLabel: '05 CANOPY', cardTitle: '05. OCULUS ROOF TRUSS', cardSubtitle: '2.4m cantilever · oculus', sheetCode: 'S-105', phaseKind: 'ASSEMBLY', startTime: 10.0, endTime: 12.2, thumbnailKind: 'UPPER_TIERS' },
      { index: 5, id: '06_FACADE', shortCode: 'SKIN', ganttLabel: '06 FACADE', cardTitle: '06. GLAZING & LOUVERS', cardSubtitle: 'solar fins · curtain wall', sheetCode: 'S-106', phaseKind: 'ASSEMBLY', startTime: 12.2, endTime: 14.2, thumbnailKind: 'SPIRE' },
      { index: 6, id: '07_COATING', shortCode: 'PAINT', ganttLabel: '07 COATING', cardTitle: '07. INTUMESCENT & ANODIZE', cardSubtitle: 'red primer · graphite · alu', sheetCode: 'S-107', phaseKind: 'LACQUER', startTime: 14.2, endTime: 18.2, thumbnailKind: 'PAINT' },
      { index: 7, id: '08_SECTION', shortCode: 'SECTION', ganttLabel: '08 SECTION', cardTitle: '08. SECTION A-A', cardSubtitle: 'atrium fly-through · 6.8 s', sheetCode: 'S-108', phaseKind: 'SECTION', startTime: 18.2, endTime: 25.0, thumbnailKind: 'SECTION' },
    ],
    structureGroups: [
      { id: 'ENVELOPE', label: 'ENVELOPE', widthRatio: 0.88, totalSteps: 0, layerBit: 5 },
      { id: 'ROOF CANOPY', label: 'CANOPY', widthRatio: 1.0, totalSteps: 0, layerBit: 4 },
      { id: 'DIAGRID', label: 'DIAGRID', widthRatio: 0.84, totalSteps: 0, layerBit: 3 },
      { id: 'MEZZANINES', label: 'DECKS', widthRatio: 0.78, totalSteps: 0, layerBit: 2 },
      { id: 'MEGA COLUMNS', label: 'COLUMNS', widthRatio: 0.72, totalSteps: 0, layerBit: 1 },
      { id: 'SUBSTRUCTURE', label: 'FOOTINGS', widthRatio: 0.94, totalSteps: 0, layerBit: 0 },
    ],
    elevationMarkers: [
      { code: 'GL', height: 0.0 },
      { code: 'L2', height: 6.8 },
      { code: 'L3', height: 13.2 },
      { code: 'EAVES', height: 19.8 },
      { code: 'OCULUS', height: 23.6 },
      { code: 'TOP', height: 26.4 },
    ],
    cameraKeyframes: [
      { time: 0.0, azimuthDeg: 215, elevationDeg: 20, distance: 42, target: [0, 8.5, 0], fov: 30, allowAutoRotate: true },
      { time: 3.2, azimuthDeg: 235, elevationDeg: 21, distance: 35, target: [0, 7.5, 0], fov: 30, allowAutoRotate: true },
      { time: 8.8, azimuthDeg: 278, elevationDeg: 17, distance: 39, target: [0, 11.5, 0], fov: 30, allowAutoRotate: true },
      { time: 13.6, azimuthDeg: 325, elevationDeg: 18, distance: 46, target: [0, 12.8, 0], fov: 30, allowAutoRotate: true },
      { time: 18.4, azimuthDeg: 60, elevationDeg: 10, distance: 40, target: [0, 11.5, 0], fov: 32, allowAutoRotate: false },
      { time: 20.5, azimuthDeg: 95, elevationDeg: 6, distance: 19, target: [0, 7.5, 0], fov: 40, allowAutoRotate: false },
      { time: 23.0, azimuthDeg: 105, elevationDeg: 14, distance: 20, target: [0, 16.5, 0], fov: 42, allowAutoRotate: false },
      { time: 25.0, azimuthDeg: 215, elevationDeg: 20, distance: 42, target: [0, 8.5, 0], fov: 30, allowAutoRotate: true },
    ],
    sectionKeyframes: [
      { time: 0.0, enabled: false, azimuthDeg: 100, offset: 14.0 },
      { time: 18.2, enabled: true, azimuthDeg: 100, offset: 14.0 },
      { time: 19.2, enabled: true, azimuthDeg: 100, offset: 0.35 },
      { time: 23.7, enabled: true, azimuthDeg: 100, offset: 0.35 },
      { time: 24.6, enabled: true, azimuthDeg: 100, offset: 14.0 },
      { time: 25.0, enabled: false, azimuthDeg: 100, offset: 14.0 },
    ],
    specialOperations: [
      {
        id: 'SF-P1',
        stageIndex: 6,
        startTime: 14.2,
        endTime: 16.2,
        title: 'COATING · INTUMESCENT OXIDE & GRAPHITE',
        stepCode: 'P-01',
        stageLabel: '07 · COATING',
        quantityLabel: '120 min fire rating',
        materialLabel: 'intumescent steel coating',
        specification: 'DFT 1,200 µm fire protection · architectural graphite diagrid',
        centroid: [0, 9.5, 0],
        massLabel: '2.15 t coating',
        bannerStatus: 'COATING · PASS 1 / 2 · 48 %',
        logMessage: 'LACQ pass 1/2 · intumescent steel protection & graphite diagrid finish',
      },
      {
        id: 'SF-P2',
        stageIndex: 6,
        startTime: 16.2,
        endTime: 18.2,
        title: 'FINISH · CHAMPAGNE ANODIZED LOUVERS & LOW-E GLASS',
        stepCode: 'P-02',
        stageLabel: '07 · COATING',
        quantityLabel: '376 facade panels',
        materialLabel: 'anodized alu + solar glass',
        specification: 'PVDF champagne metallic seal · acoustic oculus finish',
        centroid: [0, 18.4, 0],
        massLabel: '1.10 t seal',
        bannerStatus: 'COATING · PASS 2 / 2 · 100 %',
        logMessage: 'LACQ pass 2/2 · 100 % architectural finish complete ✓',
      },
      {
        id: 'SF-S1',
        stageIndex: 7,
        startTime: 18.2,
        endTime: 21.4,
        title: 'SECTION A-A · ATRIUM VOID & BRACED CORE',
        stepCode: 'S-01',
        stageLabel: '08 · SECTION',
        quantityLabel: '1 cut plane',
        materialLabel: 'S460 steel + C50 concrete',
        specification: 'cross-section through pile caps, braced core & L2 skybridge',
        centroid: [0, 6.8, 0],
        massLabel: '—',
        bannerStatus: 'SECTION A-A · d 0.35 m',
        logMessage: 'CUT plane A-A · exposing central braced core & cantilevered decks',
      },
      {
        id: 'SF-S2',
        stageIndex: 7,
        startTime: 21.4,
        endTime: 25.0,
        title: 'SECTION A-A · OCULUS SPACE-TRUSS & SKYBRIDGE L3',
        stepCode: 'S-02',
        stageLabel: '08 · SECTION',
        quantityLabel: 'crane flight',
        materialLabel: 'tubular space-truss',
        specification: 'interior crane flight up to central oculus compression ring',
        centroid: [0, 19.5, 0],
        massLabel: '—',
        bannerStatus: 'SECTION A-A · OCULUS FLIGHT',
        logMessage: 'VIEW central oculus space-truss · closing section → loop STEP 000',
      },
    ],
    silhouetteLines: [
      { x1: 0.14, y1: 0, x2: 0.86, y2: 0 },
      { x1: 0.20, y1: 0.9, x2: 0.16, y2: 19.8 },
      { x1: 0.80, y1: 0.9, x2: 0.84, y2: 19.8 },
      { x1: 0.06, y1: 21.2, x2: 0.94, y2: 21.2 },
      { x1: 0.06, y1: 21.2, x2: 0.38, y2: 23.6 },
      { x1: 0.94, y1: 21.2, x2: 0.62, y2: 23.6 },
      { x1: 0.38, y1: 23.6, x2: 0.62, y2: 23.6 },
      { x1: 0.50, y1: 23.6, x2: 0.50, y2: 26.4 },
    ],
  };

  return b.compile(manifest);
}
