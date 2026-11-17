import type * as THREE from 'three';

export type LanguageCode = 'EN' | 'VI' | 'JA';

export type RenderStyle = 'INK_PAINT' | 'INK' | 'PAINT' | 'CLAY' | 'WIRE';

export type ActiveToolDrawer =
  | 'NONE'
  | 'MODEL'
  | 'LAYERS'
  | 'PARTS'
  | 'SECTION'
  | 'RENDER'
  | 'SETTINGS';

export type OperationMotionKind =
  | 'PLACED'
  | 'LOWERING'
  | 'WASH'
  | 'CUT_FLY';

/**
 * Material archetype used by the GLSL shader for subtle surface response
 */
export type ShaderMaterialType =
  | 0 // Stone / Concrete / Brick (matte mineral)
  | 1 // Lacquered Timber / Painted Structural Steel (warm satin)
  | 2 // Lime Plaster / Architectural Panel (chalk matte)
  | 3 // Clay Roof Tile / Slate (dark ceramic sheen)
  | 4 // Cast Bronze / Patina Metal (metallic)
  | 5; // Gilt Gold / Tinted Glass / Accent (high sheen)

export interface StageDefinition {
  index: number;           // 0..7
  id: string;              // e.g. "01_PLINTH"
  shortCode: string;       // e.g. "PLINTH", "T1", "PAINT", "SECTION"
  ganttLabel: string;      // e.g. "01 PLINTH"
  cardTitle: string;       // e.g. "01. PLINTH & SITE"
  cardSubtitle: string;    // e.g. "granite · 4 stairs · 18 steps"
  sheetCode: string;       // e.g. "A-101"
  phaseKind: 'ASSEMBLY' | 'LACQUER' | 'SECTION';
  startTime: number;       // seconds (0.0 .. 25.0)
  endTime: number;         // seconds
  thumbnailKind: 'GHOST' | 'BASE' | 'LOW_TIERS' | 'MID_TIERS' | 'UPPER_TIERS' | 'SPIRE' | 'PAINT' | 'SECTION';
}

export interface StructureGroupDefinition {
  id: string;              // e.g. "PLINTH", "TIER 1", "SPIRE"
  label: string;           // Display name on right inspector
  widthRatio: number;      // 0.15 .. 1.0 — controls silhouette bar width!
  totalSteps: number;      // Computed automatically by compiler
  layerBit: number;        // 0..15 GPU visibility bit
}

export interface ElevationMarker {
  code: string;            // e.g. "GL", "FL 1", "T2", "APEX", "TOP"
  height: number;          // meters, e.g. 0.0, 1.30, 7.92, 37.54
}

export interface CalloutDefinition {
  id: string;
  stepIndex: number;
  triggerTime: number;
  title: string;           // e.g. "SHINBASHIRA · CENTRAL PILLAR"
  subtitle: string;        // e.g. "free-standing mast · seismic damper"
  anchor: [number, number, number];
  preferredSide: 'left' | 'right';
}

export interface AssemblyStep {
  stepIndex: number;       // 1..N
  stageIndex: number;      // 0..5 (assembly stages)
  structureGroupId: string;// Matches StructureGroupDefinition.id
  layerBit: number;        // 0..15
  title: string;           // e.g. "TIER 1 · ROOF BOARDS & TILES · NORTH"
  sku: string;             // e.g. "RT-01"
  pieceCount: number;      // e.g. 59
  cumulativePieces: number;// Running sum Σ
  materialLabel: string;   // e.g. "fired clay tile"
  specification: string;   // e.g. "hongawara tile · 0.27 m rows · section 0.27 rows"
  centroid: [number, number, number];
  massKg: number;
  cumulativeMassKg: number;
  startTime: number;
  duration: number;
  dropHeight: number;
  colorHex: string;
  callout?: CalloutDefinition;
}

export interface SpecialPhaseOperation {
  id: string;              // e.g. "P-01", "S-05"
  stageIndex: number;      // 6 (Paint) or 7 (Section)
  startTime: number;
  endTime: number;
  title: string;           // e.g. "WALLS · SHIKKUI PLASTER" or "SHINBASHIRA · CENTRAL PILLAR"
  stepCode: string;        // e.g. "P-03" or "S-05"
  stageLabel: string;      // e.g. "07 · PAINT" or "08 · SECTION"
  quantityLabel: string;   // e.g. "20 panels" or "8 segments"
  materialLabel: string;   // e.g. "lime plaster" or "hinoki cypress"
  specification: string;
  centroid: [number, number, number];
  massLabel: string;       // e.g. "1.33 t paint" or "—"
  bannerStatus: string;    // e.g. "LACQUER · COAT 2 / 2 · 55 %"
  logMessage: string;
  callout?: CalloutDefinition;
}

export interface CameraKeyframe {
  time: number;            // 0.0 .. 25.0
  azimuthDeg: number;      // Horizontal orbit angle in degrees
  elevationDeg: number;    // Vertical pitch in degrees
  distance: number;        // Distance from target in meters
  target: [number, number, number];
  fov: number;             // Vertical FOV in degrees
  allowAutoRotate: boolean;// True in Stages 1-7, false during precision Section flight
}

export interface SectionKeyframe {
  time: number;
  enabled: boolean;
  azimuthDeg: number;      // Normal horizontal angle (e.g. 100°)
  offset: number;          // Signed distance from origin in meters
}

/**
 * 2D Elevation line segment normalized to [0..1] width and [0..totalHeight] height
 * for drawing the crisp architectural mini-elevation in the Top Header Bar!
 */
export interface ElevationSilhouetteLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ProjectManifest {
  id: string;
  dwgCode: string;         // e.g. "PG-05"
  revision: string;        // e.g. "C · 11/26"
  monogram: string;        // 2-3 chars for tilted Hanko stamp: "PG", "KV", "SF"
  brandPrefix: string;     // e.g. "PAGODA", "HERITAGE", "STEEL"
  brandSuffix: string;     // e.g. "BUILD"
  headerSubtitle: string;  // e.g. "TIMBER STRUCTURE · ASSEMBLY · SECTION"
  drawingTitle: string;    // e.g. "Five-Tier Pagoda — Assembly Drawing"
  drawingSubtitle: string; // e.g. "Timber pagoda · built member by member from the drawing"
  projectTitleUpper: string; // e.g. "FIVE-TIER PAGODA"
  watermarkText: string;   // Vertical letters on viewport left margin: "PAGODA"
  categoryTag: string;     // e.g. "5 TIERS", "8 ROOFS", "DIAGRID"
  sequenceDuration: number;// Default 25.0s
  paintStartTime: number;  // Default 14.2s
  paintEndTime: number;    // Default 18.2s
  sectionStartTime: number;// Default 18.2s
  totalHeight: number;     // e.g. 37.54
  footprintHalfExtent: number; // Half width of base for grid/section sizing
  stages: StageDefinition[];
  structureGroups: StructureGroupDefinition[];
  elevationMarkers: ElevationMarker[];
  cameraKeyframes: CameraKeyframe[];
  sectionKeyframes: SectionKeyframe[];
  specialOperations: SpecialPhaseOperation[];
  silhouetteLines: ElevationSilhouetteLine[];
  sourceKind: 'BUILTIN' | 'IMPORTED_GLB';
  description: string;
}

export interface CompiledProjectPackage {
  manifest: ProjectManifest;
  steps: AssemblyStep[];
  callouts: CalloutDefinition[];
  totalPieces: number;
  totalMassTonnes: number;
  triangleGeometry: THREE.BufferGeometry;
  edgeGeometry: THREE.BufferGeometry;
  triangleCount: number;
  edgeSegmentCount: number;
}

export interface GpuTelemetry {
  fps: number;
  fpsHistory: number[];
  drawCalls: number;
  triangles: number;
  edgeSegments: number;
  resolutionScale: number;
}

export interface CameraLiveTelemetry {
  azimuthDeg: number;
  elevationDeg: number;
  focalLengthMm: number;
  scaleRatio: number;      // e.g. 50, 125, 150, 200, 250
  scaleBarMeters: number;  // Total length of graphic scale bar (e.g. 2, 5, 10)
  isManualOrbit: boolean;
}

export interface BuildLogItem {
  id: string;
  timeSec: number;
  kind: 'STAGE' | 'ASM' | 'PERF' | 'CHK' | 'LACQ' | 'CUT' | 'CAM' | 'VIEW' | 'RUN';
  text: string;
}
