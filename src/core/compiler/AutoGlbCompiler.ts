import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { batchArchitecturalParts, type BatchPartInput } from '@/core/compiler/GeometryBatcher';
import type {
  AssemblyStep,
  CalloutDefinition,
  CameraKeyframe,
  CompiledProjectPackage,
  ElevationMarker,
  ElevationSilhouetteLine,
  ProjectManifest,
  SectionKeyframe,
  ShaderMaterialType,
  SpecialPhaseOperation,
  StageDefinition,
  StructureGroupDefinition,
} from '@/core/types/project';

export interface OptionalSidecarManifest {
  dwgCode?: string;
  monogram?: string;
  brandPrefix?: string;
  drawingTitle?: string;
  drawingSubtitle?: string;
  stageNames?: string[];
}

interface ExtractedMeshNode {
  name: string;
  geometry: THREE.BufferGeometry;
  worldMatrix: THREE.Matrix4;
  minY: number;
  maxY: number;
  centroid: THREE.Vector3;
  radialDist: number;
  volumeApprox: number;
  colorHex: string;
  materialLabel: string;
  matType: ShaderMaterialType;
}

/**
 * Automatically compiles ANY raw .glb / .gltf file (plus optional sidecar manifest.json)
 * into a full 8-stage `CompiledProjectPackage` with bottom-up assembly choreography,
 * Ghost wireframe, Rising Paint Wash, Section A-A interior flight, Gantt chart, and BOM!
 */
export async function compileGlbBufferToProject(
  buffer: ArrayBuffer,
  fileName: string,
  sidecar?: OptionalSidecarManifest
): Promise<CompiledProjectPackage> {
  const loader = new GLTFLoader();
  const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
    loader.parse(
      buffer,
      '',
      (res) => resolve(res as unknown as { scene: THREE.Group }),
      (err) => reject(err)
    );
  });

  gltf.scene.updateMatrixWorld(true);

  // Compute initial world bounding box
  const rawBox = new THREE.Box3().setFromObject(gltf.scene);
  if (rawBox.isEmpty()) {
    throw new Error('The uploaded 3D file contains no visible mesh geometry.');
  }

  const rawSize = new THREE.Vector3();
  rawBox.getSize(rawSize);
  const rawCenter = new THREE.Vector3();
  rawBox.getCenter(rawCenter);

  // Normalize scale if model was authored in millimeters (>150m) or tiny units (<2m)
  const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z, 0.001);
  let scaleFactor = 1.0;
  if (maxDim > 120) {
    scaleFactor = 28 / maxDim;
  } else if (maxDim < 3.5) {
    scaleFactor = 18 / maxDim;
  }

  // Transform matrix that centers X/Z at (0,0) and places minY exactly on GL ±0.00
  const normalizeMatrix = new THREE.Matrix4()
    .makeScale(scaleFactor, scaleFactor, scaleFactor)
    .multiply(
      new THREE.Matrix4().makeTranslation(
        -rawCenter.x,
        -rawBox.min.y,
        -rawCenter.z
      )
    );

  const extracted: ExtractedMeshNode[] = [];
  const tempBox = new THREE.Box3();
  const tempSize = new THREE.Vector3();
  const tempCenter = new THREE.Vector3();

  gltf.scene.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    const mesh = obj as THREE.Mesh;
    if (!mesh.geometry) return;

    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    let colorHex = '#8A2B24';
    let materialLabel = 'architectural composite';
    let matType: ShaderMaterialType = 1;

    if (mat && 'color' in mat && (mat as THREE.MeshStandardMaterial).color) {
      const c = (mat as THREE.MeshStandardMaterial).color;
      colorHex = `#${c.getHexString()}`;
      const hsl = { h: 0, s: 0, l: 0 };
      c.getHSL(hsl);
      if (hsl.s < 0.12 && hsl.l > 0.72) {
        materialLabel = 'architectural stone / plaster';
        matType = 2;
      } else if (hsl.s < 0.15 && hsl.l < 0.35) {
        materialLabel = 'slate / dark steel';
        matType = 3;
      } else if ((mat as THREE.MeshStandardMaterial).metalness > 0.5) {
        materialLabel = 'structural metal / bronze';
        matType = 4;
      } else if (hsl.h > 0.08 && hsl.h < 0.18 && hsl.s > 0.4) {
        materialLabel = 'gilded timber / brass';
        matType = 5;
      } else {
        materialLabel = 'painted structural member';
        matType = 1;
      }
    }

    const pushExtracted = (instanceMatrix?: THREE.Matrix4, suffix = '') => {
      const worldMat = new THREE.Matrix4().copy(normalizeMatrix).multiply(mesh.matrixWorld);
      if (instanceMatrix) {
        worldMat.multiply(instanceMatrix);
      }
      tempBox.setFromBufferAttribute(
        mesh.geometry.getAttribute('position') as THREE.BufferAttribute
      );
      tempBox.applyMatrix4(worldMat);
      tempBox.getSize(tempSize);
      tempBox.getCenter(tempCenter);

      const vol = Math.max(0.02, tempSize.x * tempSize.y * tempSize.z * 0.42);
      extracted.push({
        name: cleanMeshName(mesh.name || obj.parent?.name || 'Structural Element') + suffix,
        geometry: mesh.geometry,
        worldMatrix: worldMat,
        minY: tempBox.min.y,
        maxY: tempBox.max.y,
        centroid: tempCenter.clone(),
        radialDist: Math.hypot(tempCenter.x, tempCenter.z),
        volumeApprox: vol,
        colorHex,
        materialLabel,
        matType,
      });
    };

    if ((mesh as THREE.InstancedMesh).isInstancedMesh) {
      const inst = mesh as THREE.InstancedMesh;
      const m4 = new THREE.Matrix4();
      for (let i = 0; i < inst.count; i++) {
        inst.getMatrixAt(i, m4);
        pushExtracted(m4, ` #${i + 1}`);
      }
    } else {
      pushExtracted();
    }
  });

  if (extracted.length === 0) {
    throw new Error('No valid triangle meshes found inside the GLB/GLTF file.');
  }

  // Sort bottom-to-top by elevation band, and inside the same band place inner core before outer facade!
  const totalHeight = Math.max(...extracted.map((e) => e.maxY), 4.0);
  const footprintHalf = Math.max(
    ...extracted.map((e) => Math.max(Math.abs(e.centroid.x), Math.abs(e.centroid.z))),
    3.0
  );
  const bandHeight = Math.max(0.35, totalHeight / 28);

  extracted.sort((a, b) => {
    const bandA = Math.floor(a.minY / bandHeight);
    const bandB = Math.floor(b.minY / bandHeight);
    if (bandA !== bandB) return bandA - bandB;
    return a.radialDist - b.radialDist;
  });

  // Group into at most ~160 steps so UI & Gantt stay crisp even if GLB has 4,000 meshes
  const targetStepCount = Math.min(extracted.length, 150);
  const chunkSize = Math.max(1, Math.ceil(extracted.length / targetStepCount));
  const chunks: ExtractedMeshNode[][] = [];
  for (let i = 0; i < extracted.length; i += chunkSize) {
    chunks.push(extracted.slice(i, i + chunkSize));
  }

  const cleanBase = fileName
    .replace(/\.(glb|gltf)$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim();
  const titleUpper = (sidecar?.drawingTitle || cleanBase || 'CUSTOM STRUCTURE').toUpperCase();
  const brandPrefix =
    sidecar?.brandPrefix ||
    cleanBase.split(/\s+/)[0]?.toUpperCase().slice(0, 10) ||
    'CUSTOM';
  const monogram =
    sidecar?.monogram ||
    brandPrefix.slice(0, 2).toUpperCase();
  const dwgCode = sidecar?.dwgCode || `${monogram}-01`;

  // 6 Assembly Zone Bands + Paint + Section
  const defaultZoneNames = sidecar?.stageNames || [
    'BASE & SUBSTRUCTURE',
    'LOWER LEVEL FRAME',
    'PRIMARY SUPERSTRUCTURE',
    'MID-LEVEL ENVELOPE',
    'UPPER LEVEL STRUCTURE',
    'ROOF & CROWN',
  ];

  const stageTimings: [number, number][] = [
    [0.0, 2.6],
    [2.6, 5.6],
    [5.6, 8.0],
    [8.0, 10.2],
    [10.2, 12.2],
    [12.2, 14.2],
  ];

  const structureGroups: StructureGroupDefinition[] = defaultZoneNames
    .map((_label, idx) => ({
      id: `ZONE_${idx + 1}`,
      label: `ZONE ${idx + 1}`,
      widthRatio: 1.0 - idx * 0.11,
      totalSteps: 0,
      layerBit: idx,
    }))
    .reverse(); // Top-to-bottom for pyramid display (ZONE 6 at top, ZONE 1 at bottom)

  const steps: AssemblyStep[] = [];
  const callouts: CalloutDefinition[] = [];
  const batchInputs: BatchPartInput[] = [];

  let cumulativePieces = 0;
  let cumulativeMassKg = 0;

  chunks.forEach((group, idx) => {
    const stepIndex = idx + 1;
    const progress = idx / Math.max(1, chunks.length);
    const stageIdx = Math.min(5, Math.floor(progress * 6));
    const [sStart, sEnd] = stageTimings[stageIdx];

    // Local index inside this stage
    const stageStartIdx = Math.floor((stageIdx / 6) * chunks.length);
    const stageEndIdx = Math.max(stageStartIdx + 1, Math.floor(((stageIdx + 1) / 6) * chunks.length));
    const localU = (idx - stageStartIdx) / Math.max(1, stageEndIdx - stageStartIdx);

    const startTime = Number((sStart + localU * (sEnd - sStart - 0.14)).toFixed(3));
    const duration = 0.14;
    const dropHeight = Math.max(1.2, totalHeight * 0.06);
    const groupId = `ZONE_${stageIdx + 1}`;

    const centroid = new THREE.Vector3();
    let stepVol = 0;
    for (const m of group) {
      centroid.add(m.centroid);
      stepVol += m.volumeApprox;
    }
    centroid.divideScalar(group.length);

    const pieceCount = group.length;
    cumulativePieces += pieceCount;
    const massKg = Math.round(stepVol * 680);
    cumulativeMassKg += massKg;

    const lead = group[0];
    const stepTitle = `${defaultZoneNames[stageIdx]} · ${lead.name.toUpperCase()}`;
    const sku = `${monogram}-${String(stepIndex).padStart(3, '0')}`;

    let callout: CalloutDefinition | undefined;
    if (idx === 0 || localU === 0 || idx === chunks.length - 1) {
      callout = {
        id: `co-${stepIndex}`,
        stepIndex,
        triggerTime: startTime + 0.05,
        title: stepTitle.slice(0, 34),
        subtitle: `${lead.materialLabel} · ${pieceCount} pcs`,
        anchor: [
          Number(centroid.x.toFixed(2)),
          Number(centroid.y.toFixed(2)),
          Number(centroid.z.toFixed(2)),
        ],
        preferredSide: stageIdx % 2 === 0 ? 'left' : 'right',
      };
      callouts.push(callout);
    }

    for (const m of group) {
      batchInputs.push({
        geometry: m.geometry,
        matrix: m.worldMatrix,
        startTime,
        duration,
        dropHeight,
        stepIndex,
        layerBit: stageIdx,
        colorHex: m.colorHex,
        materialType: m.matType,
      });
    }

    steps.push({
      stepIndex,
      stageIndex: stageIdx,
      structureGroupId: groupId,
      layerBit: stageIdx,
      title: stepTitle,
      sku,
      pieceCount,
      cumulativePieces,
      materialLabel: lead.materialLabel,
      specification: `elev +${centroid.y.toFixed(2)} m · ${pieceCount} sub-elements`,
      centroid: [
        Number(centroid.x.toFixed(2)),
        Number(centroid.y.toFixed(2)),
        Number(centroid.z.toFixed(2)),
      ],
      massKg,
      cumulativeMassKg,
      startTime,
      duration,
      dropHeight,
      colorHex: lead.colorHex,
      callout,
    });
  });

  // Update group step totals
  for (const sg of structureGroups) {
    sg.totalSteps = steps.filter((s) => s.structureGroupId === sg.id).length;
  }

  const stages: StageDefinition[] = [
    ...defaultZoneNames.map((name, i) => {
      const count = steps.filter((s) => s.stageIndex === i).length;
      const thumbs: StageDefinition['thumbnailKind'][] = [
        'BASE',
        'LOW_TIERS',
        'MID_TIERS',
        'MID_TIERS',
        'UPPER_TIERS',
        'SPIRE',
      ];
      return {
        index: i,
        id: `0${i + 1}_ZONE`,
        shortCode: `Z${i + 1}`,
        ganttLabel: `0${i + 1} ZONE${i + 1}`,
        cardTitle: `0${i + 1}. ${name}`,
        cardSubtitle: `auto-compiled · ${count} steps`,
        sheetCode: `A-10${i + 1}`,
        phaseKind: 'ASSEMBLY' as const,
        startTime: stageTimings[i][0],
        endTime: stageTimings[i][1],
        thumbnailKind: thumbs[i],
      };
    }),
    {
      index: 6,
      id: '07_PAINT',
      shortCode: 'PAINT',
      ganttLabel: '07 PAINT',
      cardTitle: '07. SURFACE & FINISH',
      cardSubtitle: 'material wash · 4.0 s',
      sheetCode: 'A-107',
      phaseKind: 'LACQUER',
      startTime: 14.2,
      endTime: 18.2,
      thumbnailKind: 'PAINT',
    },
    {
      index: 7,
      id: '08_SECTION',
      shortCode: 'SECTION',
      ganttLabel: '08 SECTION',
      cardTitle: '08. SECTION A-A',
      cardSubtitle: 'interior cut · 6.8 s',
      sheetCode: 'A-108',
      phaseKind: 'SECTION',
      startTime: 18.2,
      endTime: 25.0,
      thumbnailKind: 'SECTION',
    },
  ];

  const elevationMarkers: ElevationMarker[] = [
    { code: 'GL', height: 0.0 },
    { code: 'L1', height: Number((totalHeight * 0.16).toFixed(2)) },
    { code: 'L2', height: Number((totalHeight * 0.36).toFixed(2)) },
    { code: 'L3', height: Number((totalHeight * 0.56).toFixed(2)) },
    { code: 'L4', height: Number((totalHeight * 0.78).toFixed(2)) },
    { code: 'TOP', height: Number(totalHeight.toFixed(2)) },
  ];

  const baseDist = Math.max(totalHeight * 1.35, footprintHalf * 3.1, 16);
  const cameraKeyframes: CameraKeyframe[] = [
    { time: 0.0, azimuthDeg: 215, elevationDeg: 20, distance: baseDist * 0.95, target: [0, totalHeight * 0.25, 0], fov: 30, allowAutoRotate: true },
    { time: 3.0, azimuthDeg: 235, elevationDeg: 22, distance: baseDist * 0.78, target: [0, totalHeight * 0.22, 0], fov: 30, allowAutoRotate: true },
    { time: 9.5, azimuthDeg: 280, elevationDeg: 18, distance: baseDist * 0.92, target: [0, totalHeight * 0.45, 0], fov: 30, allowAutoRotate: true },
    { time: 14.2, azimuthDeg: 325, elevationDeg: 17, distance: baseDist * 1.12, target: [0, totalHeight * 0.48, 0], fov: 30, allowAutoRotate: true },
    { time: 18.2, azimuthDeg: 55, elevationDeg: 10, distance: baseDist * 0.98, target: [0, totalHeight * 0.45, 0], fov: 32, allowAutoRotate: false },
    { time: 20.5, azimuthDeg: 92, elevationDeg: 6, distance: baseDist * 0.48, target: [0, totalHeight * 0.22, 0], fov: 38, allowAutoRotate: false },
    { time: 23.0, azimuthDeg: 108, elevationDeg: 12, distance: baseDist * 0.52, target: [0, totalHeight * 0.65, 0], fov: 40, allowAutoRotate: false },
    { time: 25.0, azimuthDeg: 215, elevationDeg: 20, distance: baseDist * 0.95, target: [0, totalHeight * 0.25, 0], fov: 30, allowAutoRotate: true },
  ];

  const sectionKeyframes: SectionKeyframe[] = [
    { time: 0.0, enabled: false, azimuthDeg: 100, offset: footprintHalf + 4 },
    { time: 18.2, enabled: true, azimuthDeg: 100, offset: footprintHalf + 2 },
    { time: 19.2, enabled: true, azimuthDeg: 100, offset: 0.35 },
    { time: 23.6, enabled: true, azimuthDeg: 100, offset: 0.35 },
    { time: 24.6, enabled: true, azimuthDeg: 100, offset: footprintHalf + 3 },
    { time: 25.0, enabled: false, azimuthDeg: 100, offset: footprintHalf + 4 },
  ];

  const specialOperations: SpecialPhaseOperation[] = [
    {
      id: 'P-01',
      stageIndex: 6,
      startTime: 14.2,
      endTime: 16.2,
      title: 'SURFACE · PRIMARY COATING',
      stepCode: 'P-01',
      stageLabel: '07 · PAINT',
      quantityLabel: 'coat 1 / 2',
      materialLabel: 'architectural finish',
      specification: 'rising material shader · base pigments',
      centroid: [0, Number((totalHeight * 0.35).toFixed(2)), 0],
      massLabel: '0.85 t finish',
      bannerStatus: 'SURFACE · COAT 1 / 2 · 45 %',
      logMessage: 'LACQ coat 1/2 · rising surface finish · pigment pass',
    },
    {
      id: 'P-02',
      stageIndex: 6,
      startTime: 16.2,
      endTime: 18.2,
      title: 'SURFACE · TOPCOAT & GLAZE',
      stepCode: 'P-02',
      stageLabel: '07 · PAINT',
      quantityLabel: 'coat 2 / 2',
      materialLabel: 'protective seal',
      specification: 'full surface coverage · weather seal',
      centroid: [0, Number((totalHeight * 0.78).toFixed(2)), 0],
      massLabel: '1.20 t finish',
      bannerStatus: 'SURFACE · COAT 2 / 2 · 95 %',
      logMessage: 'LACQ coat 2/2 · 100 % surface coverage complete',
    },
    {
      id: 'S-01',
      stageIndex: 7,
      startTime: 18.2,
      endTime: 21.5,
      title: 'SECTION A-A · LOWER INTERIOR',
      stepCode: 'S-01',
      stageLabel: '08 · SECTION',
      quantityLabel: '1 cut plane',
      materialLabel: 'poché cross-section',
      specification: 'cut plane · azimuth 100° · interior dolly',
      centroid: [0, Number((totalHeight * 0.24).toFixed(2)), 0],
      massLabel: '—',
      bannerStatus: 'SECTION A-A · d 0.35 m',
      logMessage: 'CUT plane A-A · az 100° · interior inspection',
    },
    {
      id: 'S-02',
      stageIndex: 7,
      startTime: 21.5,
      endTime: 25.0,
      title: 'SECTION A-A · UPPER STRUCTURE',
      stepCode: 'S-02',
      stageLabel: '08 · SECTION',
      quantityLabel: 'crane flight',
      materialLabel: 'structural core',
      specification: 'vertical crane up · closing loop',
      centroid: [0, Number((totalHeight * 0.68).toFixed(2)), 0],
      massLabel: '—',
      bannerStatus: 'SECTION A-A · CRANE FLIGHT',
      logMessage: 'CAM crane up · upper structure in section',
    },
  ];

  // Auto-generate clean stepped elevation silhouette lines for the Top Header Bar
  const silhouetteLines: ElevationSilhouetteLine[] = [
    { x1: 0.15, y1: 0, x2: 0.85, y2: 0 },
    { x1: 0.22, y1: 0, x2: 0.22, y2: totalHeight * 0.35 },
    { x1: 0.78, y1: 0, x2: 0.78, y2: totalHeight * 0.35 },
    { x1: 0.18, y1: totalHeight * 0.35, x2: 0.82, y2: totalHeight * 0.35 },
    { x1: 0.28, y1: totalHeight * 0.35, x2: 0.28, y2: totalHeight * 0.72 },
    { x1: 0.72, y1: totalHeight * 0.35, x2: 0.72, y2: totalHeight * 0.72 },
    { x1: 0.24, y1: totalHeight * 0.72, x2: 0.76, y2: totalHeight * 0.72 },
    { x1: 0.28, y1: totalHeight * 0.72, x2: 0.5, y2: totalHeight },
    { x1: 0.72, y1: totalHeight * 0.72, x2: 0.5, y2: totalHeight },
  ];

  const batched = batchArchitecturalParts(batchInputs);

  const manifest: ProjectManifest = {
    id: `custom-${Date.now()}`,
    dwgCode,
    revision: 'A · IMPORT',
    monogram,
    brandPrefix,
    brandSuffix: 'BUILD',
    headerSubtitle: 'IMPORTED 3D MODEL · AUTO-ASSEMBLY · SECTION',
    drawingTitle: `${sidecar?.drawingTitle || cleanBase || 'Imported Model'} — Assembly Drawing`,
    drawingSubtitle:
      sidecar?.drawingSubtitle ||
      `Compiled from ${fileName} · ${cumulativePieces} meshes sorted bottom-to-top`,
    projectTitleUpper: titleUpper,
    watermarkText: brandPrefix.slice(0, 7),
    categoryTag: 'GLB MODEL',
    sequenceDuration: 25.0,
    paintStartTime: 14.2,
    paintEndTime: 18.2,
    sectionStartTime: 18.2,
    totalHeight: Number(totalHeight.toFixed(2)),
    footprintHalfExtent: Number(footprintHalf.toFixed(2)),
    stages,
    structureGroups,
    elevationMarkers,
    cameraKeyframes,
    sectionKeyframes,
    specialOperations,
    silhouetteLines,
    sourceKind: 'IMPORTED_GLB',
    description: `Imported 3D GLB/GLTF package (${fileName})`,
  };

  return {
    manifest,
    steps,
    callouts,
    totalPieces: cumulativePieces,
    totalMassTonnes: Number((cumulativeMassKg / 1000).toFixed(1)),
    triangleGeometry: batched.triangleGeometry,
    edgeGeometry: batched.edgeGeometry,
    triangleCount: batched.triangleCount,
    edgeSegmentCount: batched.edgeSegmentCount,
  };
}

function cleanMeshName(raw: string): string {
  return raw
    .replace(/[_.-]+/g, ' ')
    .replace(/\b(mesh|node|object|geo|geometry)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Member';
}

/**
 * Generates a real binary `.glb` sample architectural tower right in the browser
 * so users can test downloading and drag-dropping an external `.glb` file immediately!
 */
export async function generateSampleGlbBlob(): Promise<Blob> {
  const group = new THREE.Group();
  group.name = 'Sample_Observation_Tower';

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd6cfc2, roughness: 0.85 });
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x9e2a22, roughness: 0.55 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x363432, roughness: 0.65 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xc49e48, metalness: 0.7, roughness: 0.3 });

  // Plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 8), stoneMat);
  plinth.position.set(0, 0.6, 0);
  plinth.name = 'Granite_Base_Plinth';
  group.add(plinth);

  // 3 stepped levels
  for (let lvl = 0; lvl < 3; lvl++) {
    const scale = 1 - lvl * 0.18;
    const baseY = 1.2 + lvl * 4.2;
    const span = 2.4 * scale;

    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.25 * scale, 3.4, 12), timberMat);
        col.position.set(sx * span, baseY + 1.7, sz * span);
        col.name = `Level_${lvl + 1}_Corner_Column`;
        group.add(col);
      }
    }

    const core = new THREE.Mesh(new THREE.BoxGeometry(span * 1.5, 2.8, span * 1.5), stoneMat);
    core.position.set(0, baseY + 1.4, 0);
    core.name = `Level_${lvl + 1}_Sanctuary_Wall`;
    group.add(core);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.6 * scale, 1.4, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.set(0, baseY + 3.8, 0);
    roof.name = `Level_${lvl + 1}_Pyramidal_Roof`;
    group.add(roof);
  }

  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.18, 4.0, 12), brassMat);
  finial.position.set(0, 15.6, 0);
  finial.name = 'Bronze_Lightning_Finial';
  group.add(finial);

  const exporter = new GLTFExporter();
  const arrayBuf = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      group,
      (result) => resolve(result as ArrayBuffer),
      (err) => reject(err),
      { binary: true }
    );
  });

  return new Blob([arrayBuf], { type: 'model/gltf-binary' });
}
