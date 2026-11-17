import * as THREE from 'three';
import { batchArchitecturalParts, type BatchPartInput } from '@/core/compiler/GeometryBatcher';
import type {
  AssemblyStep,
  CalloutDefinition,
  CompiledProjectPackage,
  ProjectManifest,
  ShaderMaterialType,
} from '@/core/types/project';

interface StagedPrimitive {
  geometry: THREE.BufferGeometry;
  matrix: THREE.Matrix4;
  colorHex: string;
  materialType: ShaderMaterialType;
  includeEdges?: boolean;
}

export interface CommitStepParams {
  stageIndex: number;
  structureGroupId: string;
  layerBit: number;
  title: string;
  sku: string;
  pieceCount?: number;
  materialLabel: string;
  specification: string;
  massKg: number;
  startTime: number;
  duration?: number;
  dropHeight?: number;
  callout?: {
    title: string;
    subtitle: string;
    anchor?: [number, number, number];
    preferredSide?: 'left' | 'right';
  };
}

/**
 * Clean Parametric Architectural Builder SDK.
 * Lets model authors build complex multi-thousand-part structures using reusable primitives,
 * then compiles everything into a 3-Draw-Call `CompiledProjectPackage`.
 */
export class ParametricStructureBuilder {
  private sharedGeoms = new Map<string, THREE.BufferGeometry>();
  private currentPrimitives: StagedPrimitive[] = [];
  private allBatchInputs: BatchPartInput[] = [];
  private steps: AssemblyStep[] = [];
  private callouts: CalloutDefinition[] = [];
  private cumulativePieces = 0;
  private cumulativeMassKg = 0;

  private getBoxGeom(w: number, h: number, d: number): THREE.BufferGeometry {
    const key = `box:${w.toFixed(3)}:${h.toFixed(3)}:${d.toFixed(3)}`;
    let g = this.sharedGeoms.get(key);
    if (!g) {
      g = new THREE.BoxGeometry(w, h, d);
      this.sharedGeoms.set(key, g);
    }
    return g;
  }

  private getCylGeom(rt: number, rb: number, h: number, segs = 12): THREE.BufferGeometry {
    const key = `cyl:${rt.toFixed(3)}:${rb.toFixed(3)}:${h.toFixed(3)}:${segs}`;
    let g = this.sharedGeoms.get(key);
    if (!g) {
      g = new THREE.CylinderGeometry(rt, rb, h, segs);
      this.sharedGeoms.set(key, g);
    }
    return g;
  }

  private getTorusGeom(r: number, tube: number, rSeg = 8, tSeg = 20): THREE.BufferGeometry {
    const key = `tor:${r.toFixed(3)}:${tube.toFixed(3)}:${rSeg}:${tSeg}`;
    let g = this.sharedGeoms.get(key);
    if (!g) {
      g = new THREE.TorusGeometry(r, tube, rSeg, tSeg);
      g.rotateX(Math.PI / 2);
      this.sharedGeoms.set(key, g);
    }
    return g;
  }

  public addBox(
    w: number,
    h: number,
    d: number,
    pos: [number, number, number],
    colorHex: string,
    materialType: ShaderMaterialType,
    rotY = 0,
    rotX = 0,
    rotZ = 0
  ): void {
    const geom = this.getBoxGeom(w, h, d);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, rotY, rotZ, 'YXZ'));
    m.compose(new THREE.Vector3(pos[0], pos[1], pos[2]), q, new THREE.Vector3(1, 1, 1));
    this.currentPrimitives.push({ geometry: geom, matrix: m, colorHex, materialType });
  }

  /**
   * Adds a 3D strut/beam connecting point A to point B with rectangular or cylindrical section
   */
  public addBeamBetween(
    p1: [number, number, number],
    p2: [number, number, number],
    thickness: number,
    depth: number,
    colorHex: string,
    materialType: ShaderMaterialType,
    round = false
  ): void {
    const a = new THREE.Vector3(...p1);
    const b = new THREE.Vector3(...p2);
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    if (len < 0.005) return;

    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const geom = round
      ? this.getCylGeom(thickness * 0.5, thickness * 0.5, len, 8)
      : this.getBoxGeom(thickness, len, depth);

    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
    const m = new THREE.Matrix4().compose(mid, quat, new THREE.Vector3(1, 1, 1));
    this.currentPrimitives.push({ geometry: geom, matrix: m, colorHex, materialType });
  }

  public addCylinder(
    radiusTop: number,
    radiusBottom: number,
    height: number,
    pos: [number, number, number],
    colorHex: string,
    materialType: ShaderMaterialType,
    segments = 12,
    rotX = 0,
    rotZ = 0
  ): void {
    const geom = this.getCylGeom(radiusTop, radiusBottom, height, segments);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, 0, rotZ));
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(pos[0], pos[1], pos[2]),
      q,
      new THREE.Vector3(1, 1, 1)
    );
    this.currentPrimitives.push({ geometry: geom, matrix: m, colorHex, materialType });
  }

  public addRing(
    radius: number,
    tube: number,
    pos: [number, number, number],
    colorHex: string,
    materialType: ShaderMaterialType,
    rotX = 0,
    rotY = 0
  ): void {
    const geom = this.getTorusGeom(radius, tube);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, rotY, 0, 'YXZ'));
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(pos[0], pos[1], pos[2]),
      q,
      new THREE.Vector3(1, 1, 1)
    );
    this.currentPrimitives.push({ geometry: geom, matrix: m, colorHex, materialType });
  }

  /**
   * Builds a graceful East-Asian curved hip/gable roof slope quadrant (South=0, East=1, North=2, West=3)
   * with authentic catenary sag and upturned corner eaves (Warikake / Mũi hài)!
   */
  public addCurvedRoofQuadrant(opts: {
    quadrant: 0 | 1 | 2 | 3; // 0: +Z (South), 1: +X (East), 2: -Z (North), 3: -X (West)
    innerHalfSpan: number;
    outerHalfSpan: number;
    innerY: number;
    outerY: number;
    cornerLift: number;
    thickness: number;
    ribCount: number;
    colorHex: string;
    materialType: ShaderMaterialType;
  }): void {
    const {
      quadrant,
      innerHalfSpan,
      outerHalfSpan,
      innerY,
      outerY,
      cornerLift,
      thickness,
      ribCount,
      colorHex,
      materialType,
    } = opts;

    const rotY = quadrant * (Math.PI / 2);
    const uSteps = Math.max(6, ribCount);
    const vSteps = 4;

    // Build custom curved roof slab mesh + raised tile ribs for crisp architectural ink lines!
    const positions: number[] = [];
    const indices: number[] = [];

    const evalPoint = (u: number, v: number, yOffset: number): [number, number, number] => {
      // v=0 at inner core, v=1 at outer eaves; u in [-1..+1] along eaves width
      const z = innerHalfSpan + (outerHalfSpan - innerHalfSpan) * v;
      const halfW = z; // Meets cleanly along 45° hip diagonals x = ±z!
      const x = u * halfW;
      // Catenary sag along slope + graceful upward corner curl at |u|->1, v->1
      const slopeCurve = Math.pow(1 - v, 1.38);
      const baseH = outerY + (innerY - outerY) * slopeCurve;
      const cornerCurl = cornerLift * Math.pow(Math.abs(u), 2.2) * Math.pow(v, 1.5);
      return [x, baseH + cornerCurl + yOffset, z];
    };

    const cols = uSteps + 1;
    const rows = vSteps + 1;

    // Top & bottom surfaces for solid cross-section poché!
    for (let layer = 0; layer < 2; layer++) {
      const yOff = layer === 0 ? thickness * 0.5 : -thickness * 0.5;
      for (let r = 0; r < rows; r++) {
        const v = r / vSteps;
        for (let c = 0; c < cols; c++) {
          const u = -1 + (2 * c) / uSteps;
          const pt = evalPoint(u, v, yOff);
          positions.push(pt[0], pt[1], pt[2]);
        }
      }
    }

    const topCount = rows * cols;
    for (let r = 0; r < vSteps; r++) {
      for (let c = 0; c < uSteps; c++) {
        const a = r * cols + c;
        const b = a + 1;
        const d = (r + 1) * cols + c;
        const e = d + 1;
        // Top
        indices.push(a, d, b, b, d, e);
        // Bottom
        const ba = topCount + a;
        const bb = topCount + b;
        const bd = topCount + d;
        const be = topCount + e;
        indices.push(ba, bb, bd, bb, be, bd);
      }
    }

    // Outer eaves fascia strip closing top & bottom at r = vSteps
    for (let c = 0; c < uSteps; c++) {
      const t0 = vSteps * cols + c;
      const t1 = t0 + 1;
      const b0 = topCount + t0;
      const b1 = topCount + t1;
      indices.push(t0, b0, t1, t1, b0, b1);
    }

    const roofGeom = new THREE.BufferGeometry();
    roofGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    roofGeom.setIndex(indices);
    roofGeom.computeVertexNormals();

    const m = new THREE.Matrix4().makeRotationY(rotY);
    this.currentPrimitives.push({ geometry: roofGeom, matrix: m, colorHex, materialType });

    // Raised Hongawara / Mũi hài tile ridge seams so Ink Mode renders authentic roof tile lines!
    const seamCount = Math.min(ribCount, 12);
    for (let i = 0; i <= seamCount; i++) {
      const u = -0.94 + (1.88 * i) / seamCount;
      const pIn = evalPoint(u, 0.06, thickness * 0.62);
      const pMid = evalPoint(u, 0.55, thickness * 0.62);
      const pOut = evalPoint(u, 0.99, thickness * 0.62);

      const vIn = new THREE.Vector3(...pIn).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
      const vMid = new THREE.Vector3(...pMid).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
      const vOut = new THREE.Vector3(...pOut).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);

      this.addBeamBetween([vIn.x, vIn.y, vIn.z], [vMid.x, vMid.y, vMid.z], 0.055, 0.055, colorHex, materialType);
      this.addBeamBetween([vMid.x, vMid.y, vMid.z], [vOut.x, vOut.y, vOut.z], 0.055, 0.055, colorHex, materialType);
    }

    // Corner hip ridge spine (Kudarimune) on the +u diagonal
    const h0 = new THREE.Vector3(...evalPoint(1, 0.02, thickness * 0.85)).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    const h1 = new THREE.Vector3(...evalPoint(1, 0.55, thickness * 0.85)).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    const h2 = new THREE.Vector3(...evalPoint(1, 1.0, thickness * 0.95)).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    this.addBeamBetween([h0.x, h0.y, h0.z], [h1.x, h1.y, h1.z], 0.14, 0.14, colorHex, materialType);
    this.addBeamBetween([h1.x, h1.y, h1.z], [h2.x, h2.y, h2.z], 0.14, 0.16, colorHex, materialType);
  }

  public commitStep(params: CommitStepParams): AssemblyStep {
    if (this.currentPrimitives.length === 0) {
      // Setting-out step (#001 with 0 physical pieces or thin datum pegs)
      this.addBox(0.08, 0.25, 0.08, [0, 0.12, 0], '#BD312B', 1);
    }

    const stepIndex = this.steps.length + 1;
    const duration = params.duration ?? 0.14;
    const dropHeight = params.dropHeight ?? 1.65;

    // Compute true world centroid of this step
    const centroid = new THREE.Vector3();
    const posVec = new THREE.Vector3();
    for (const prim of this.currentPrimitives) {
      posVec.setFromMatrixPosition(prim.matrix);
      centroid.add(posVec);
    }
    centroid.divideScalar(this.currentPrimitives.length);

    const pieceCount =
      params.pieceCount !== undefined ? params.pieceCount : this.currentPrimitives.length;
    this.cumulativePieces += pieceCount;
    this.cumulativeMassKg += params.massKg;

    const leadColor = this.currentPrimitives[0].colorHex;

    for (const prim of this.currentPrimitives) {
      this.allBatchInputs.push({
        geometry: prim.geometry,
        matrix: prim.matrix,
        startTime: params.startTime,
        duration,
        dropHeight: pieceCount === 0 ? 0.0 : dropHeight,
        stepIndex,
        layerBit: params.layerBit,
        colorHex: prim.colorHex,
        materialType: prim.materialType,
        includeEdges: prim.includeEdges,
      });
    }

    const cleanCentroid: [number, number, number] = [
      Number(centroid.x.toFixed(2)),
      Number(centroid.y.toFixed(2)),
      Number(centroid.z.toFixed(2)),
    ];

    let callout: CalloutDefinition | undefined;
    if (params.callout) {
      callout = {
        id: `callout-${stepIndex}`,
        stepIndex,
        triggerTime: params.startTime + duration * 0.5,
        title: params.callout.title,
        subtitle: params.callout.subtitle,
        anchor: params.callout.anchor ?? cleanCentroid,
        preferredSide: params.callout.preferredSide ?? (cleanCentroid[0] >= 0 ? 'right' : 'left'),
      };
      this.callouts.push(callout);
    }

    const step: AssemblyStep = {
      stepIndex,
      stageIndex: params.stageIndex,
      structureGroupId: params.structureGroupId,
      layerBit: params.layerBit,
      title: params.title,
      sku: params.sku,
      pieceCount,
      cumulativePieces: this.cumulativePieces,
      materialLabel: params.materialLabel,
      specification: params.specification,
      centroid: cleanCentroid,
      massKg: params.massKg,
      cumulativeMassKg: this.cumulativeMassKg,
      startTime: params.startTime,
      duration,
      dropHeight,
      colorHex: leadColor,
      callout,
    };

    this.steps.push(step);
    this.currentPrimitives = [];
    return step;
  }

  public compile(manifest: ProjectManifest): CompiledProjectPackage {
    // Sync structure group step totals automatically
    for (const group of manifest.structureGroups) {
      group.totalSteps = this.steps.filter((s) => s.structureGroupId === group.id).length;
    }

    // Collect any callouts embedded in Stage 07/08 special operations too
    for (const op of manifest.specialOperations) {
      if (op.callout) {
        this.callouts.push(op.callout);
      }
    }

    const batched = batchArchitecturalParts(this.allBatchInputs);

    // Clean up temporary shared unbatched geometries
    for (const g of this.sharedGeoms.values()) {
      g.dispose();
    }
    this.sharedGeoms.clear();

    return {
      manifest,
      steps: this.steps,
      callouts: this.callouts,
      totalPieces: this.cumulativePieces,
      totalMassTonnes: Number((this.cumulativeMassKg / 1000).toFixed(1)),
      triangleGeometry: batched.triangleGeometry,
      edgeGeometry: batched.edgeGeometry,
      triangleCount: batched.triangleCount,
      edgeSegmentCount: batched.edgeSegmentCount,
    };
  }
}
