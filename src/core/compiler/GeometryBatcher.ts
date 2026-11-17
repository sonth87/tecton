import * as THREE from 'three';
import type { ShaderMaterialType } from '@/core/types/project';

export interface BatchPartInput {
  geometry: THREE.BufferGeometry;
  matrix: THREE.Matrix4;
  startTime: number;
  duration: number;
  dropHeight: number;
  stepIndex: number;
  layerBit: number;
  colorHex: string;
  materialType: ShaderMaterialType;
  includeEdges?: boolean;
}

export interface BatchedGeometryOutput {
  triangleGeometry: THREE.BufferGeometry;
  edgeGeometry: THREE.BufferGeometry;
  triangleCount: number;
  edgeSegmentCount: number;
}

/**
 * Merges thousands of individual architectural elements into:
 * 1) A single non-indexed/indexed Triangle BufferGeometry
 * 2) A single Crease-Edge LineSegments BufferGeometry
 * Both stamped with per-vertex animation & material attributes so the entire building
 * renders in just 3–4 WebGL draw calls at a locked 60 FPS.
 */
export function batchArchitecturalParts(
  parts: BatchPartInput[],
  creaseAngleDeg = 24
): BatchedGeometryOutput {
  // First pass: bake transforms, convert to non-indexed for fast flat/crease normals & clean attribute packing,
  // and extract crease edges using a geometry cache keyed by source BufferGeometry uuid when possible.
  const edgeCache = new Map<string, THREE.BufferGeometry>();

  let totalTriVertices = 0;
  let totalEdgeVertices = 0;

  interface PreparedPart {
    pos: Float32Array;
    norm: Float32Array;
    edgePos: Float32Array | null;
    startTime: number;
    duration: number;
    dropHeight: number;
    stepIndex: number;
    layerBit: number;
    r: number;
    g: number;
    b: number;
    matType: number;
  }

  const prepared: PreparedPart[] = [];
  const tempColor = new THREE.Color();
  const normalMatrix = new THREE.Matrix3();
  const v3 = new THREE.Vector3();

  for (const p of parts) {
    const srcGeom = p.geometry.index ? p.geometry.toNonIndexed() : p.geometry.clone();
    if (!srcGeom.getAttribute('normal')) {
      srcGeom.computeVertexNormals();
    }

    const posAttr = srcGeom.getAttribute('position') as THREE.BufferAttribute;
    const normAttr = srcGeom.getAttribute('normal') as THREE.BufferAttribute;
    const vCount = posAttr.count;

    const posOut = new Float32Array(vCount * 3);
    const normOut = new Float32Array(vCount * 3);
    normalMatrix.getNormalMatrix(p.matrix);

    for (let i = 0; i < vCount; i++) {
      v3.fromBufferAttribute(posAttr, i).applyMatrix4(p.matrix);
      posOut[i * 3] = v3.x;
      posOut[i * 3 + 1] = v3.y;
      posOut[i * 3 + 2] = v3.z;

      v3.fromBufferAttribute(normAttr, i).applyMatrix3(normalMatrix).normalize();
      normOut[i * 3] = v3.x;
      normOut[i * 3 + 1] = v3.y;
      normOut[i * 3 + 2] = v3.z;
    }

    let edgeOut: Float32Array | null = null;
    if (p.includeEdges !== false) {
      let localEdges = edgeCache.get(p.geometry.uuid);
      if (!localEdges) {
        localEdges = new THREE.EdgesGeometry(p.geometry, creaseAngleDeg);
        edgeCache.set(p.geometry.uuid, localEdges);
      }
      const ePosAttr = localEdges.getAttribute('position') as THREE.BufferAttribute | undefined;
      if (ePosAttr && ePosAttr.count > 0) {
        edgeOut = new Float32Array(ePosAttr.count * 3);
        for (let i = 0; i < ePosAttr.count; i++) {
          v3.fromBufferAttribute(ePosAttr, i).applyMatrix4(p.matrix);
          edgeOut[i * 3] = v3.x;
          edgeOut[i * 3 + 1] = v3.y;
          edgeOut[i * 3 + 2] = v3.z;
        }
        totalEdgeVertices += ePosAttr.count;
      }
    }

    if (srcGeom !== p.geometry) {
      srcGeom.dispose();
    }

    tempColor.set(p.colorHex);
    totalTriVertices += vCount;

    prepared.push({
      pos: posOut,
      norm: normOut,
      edgePos: edgeOut,
      startTime: p.startTime,
      duration: p.duration,
      dropHeight: p.dropHeight,
      stepIndex: p.stepIndex,
      layerBit: p.layerBit,
      r: tempColor.r,
      g: tempColor.g,
      b: tempColor.b,
      matType: p.materialType,
    });
  }

  for (const cached of edgeCache.values()) {
    cached.dispose();
  }

  // Allocate merged typed arrays for Triangles
  const triPositions = new Float32Array(totalTriVertices * 3);
  const triNormals = new Float32Array(totalTriVertices * 3);
  const triColors = new Float32Array(totalTriVertices * 3);
  // Pack animation params into vec4 aAnimParams = (startTime, duration, dropHeight, stepIndex)
  const triAnim = new Float32Array(totalTriVertices * 4);
  // Pack meta params into vec2 aMetaParams = (layerBit, matType)
  const triMeta = new Float32Array(totalTriVertices * 2);

  // Allocate merged typed arrays for Crease Edges
  const edgePositions = new Float32Array(totalEdgeVertices * 3);
  const edgeAnim = new Float32Array(totalEdgeVertices * 4);
  const edgeMeta = new Float32Array(totalEdgeVertices * 2);

  let tOffset = 0;
  let eOffset = 0;

  for (const item of prepared) {
    const vCount = item.pos.length / 3;
    triPositions.set(item.pos, tOffset * 3);
    triNormals.set(item.norm, tOffset * 3);

    for (let i = 0; i < vCount; i++) {
      const vi = tOffset + i;
      triColors[vi * 3] = item.r;
      triColors[vi * 3 + 1] = item.g;
      triColors[vi * 3 + 2] = item.b;

      triAnim[vi * 4] = item.startTime;
      triAnim[vi * 4 + 1] = item.duration;
      triAnim[vi * 4 + 2] = item.dropHeight;
      triAnim[vi * 4 + 3] = item.stepIndex;

      triMeta[vi * 2] = item.layerBit;
      triMeta[vi * 2 + 1] = item.matType;
    }
    tOffset += vCount;

    if (item.edgePos) {
      const evCount = item.edgePos.length / 3;
      edgePositions.set(item.edgePos, eOffset * 3);
      for (let i = 0; i < evCount; i++) {
        const ei = eOffset + i;
        edgeAnim[ei * 4] = item.startTime;
        edgeAnim[ei * 4 + 1] = item.duration;
        edgeAnim[ei * 4 + 2] = item.dropHeight;
        edgeAnim[ei * 4 + 3] = item.stepIndex;

        edgeMeta[ei * 2] = item.layerBit;
        edgeMeta[ei * 2 + 1] = item.matType;
      }
      eOffset += evCount;
    }
  }

  const triangleGeometry = new THREE.BufferGeometry();
  triangleGeometry.setAttribute('position', new THREE.BufferAttribute(triPositions, 3));
  triangleGeometry.setAttribute('normal', new THREE.BufferAttribute(triNormals, 3));
  triangleGeometry.setAttribute('aBaseColor', new THREE.BufferAttribute(triColors, 3));
  triangleGeometry.setAttribute('aAnimParams', new THREE.BufferAttribute(triAnim, 4));
  triangleGeometry.setAttribute('aMetaParams', new THREE.BufferAttribute(triMeta, 2));
  triangleGeometry.computeBoundingSphere();
  triangleGeometry.computeBoundingBox();

  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));
  edgeGeometry.setAttribute('aAnimParams', new THREE.BufferAttribute(edgeAnim, 4));
  edgeGeometry.setAttribute('aMetaParams', new THREE.BufferAttribute(edgeMeta, 2));
  edgeGeometry.computeBoundingSphere();
  edgeGeometry.computeBoundingBox();

  return {
    triangleGeometry,
    edgeGeometry,
    triangleCount: Math.floor(totalTriVertices / 3),
    edgeSegmentCount: Math.floor(totalEdgeVertices / 2),
  };
}
