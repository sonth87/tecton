import { describe, expect, it } from 'vitest';
import { buildPagodaFiveTierPackage } from '@/models/pagodaFiveTier';
import { buildKhueVanCacPackage } from '@/models/khueVanCac';
import { buildSteelAtriumPackage } from '@/models/steelAtriumPavilion';
import {
  computeArchitecturalScale,
  evaluateCameraKeyframes,
  lerpAngleDeg,
} from '@/core/math/drawingMath';
import { deriveBuildLogsAtTime } from '@/store/useAppStore';

describe('Multi-Model Architectural Compiler & Mathematical Invariants', () => {
  it('compiles Five-Tier Pagoda (PG-05) with exact 191 steps, 5,627 pieces & 438.8t', () => {
    const pkg = buildPagodaFiveTierPackage();

    expect(pkg.steps.length).toBe(191);
    expect(pkg.totalPieces).toBe(5627);
    expect(pkg.totalMassTonnes).toBe(438.8);
    expect(pkg.manifest.totalHeight).toBe(37.54);
    expect(pkg.manifest.stages.length).toBe(8);

    const groupSum = pkg.manifest.structureGroups.reduce((acc, g) => acc + g.totalSteps, 0);
    expect(groupSum).toBe(191);

    // Check individual tier step counts matching the original CAD specification
    const byId = Object.fromEntries(
      pkg.manifest.structureGroups.map((g) => [g.id, g.totalSteps])
    );
    expect(byId['PLINTH']).toBe(19);
    expect(byId['TIER 1']).toBe(43);
    expect(byId['TIER 2']).toBe(29);
    expect(byId['TIER 3']).toBe(29);
    expect(byId['TIER 4']).toBe(29);
    expect(byId['TIER 5']).toBe(28);
    expect(byId['SPIRE']).toBe(14);

    // Verify batched GPU buffer attributes
    const pos = pkg.triangleGeometry.getAttribute('position');
    const anim = pkg.triangleGeometry.getAttribute('aAnimParams');
    const edgePos = pkg.edgeGeometry.getAttribute('position');
    expect(pos.count).toBeGreaterThan(3000);
    expect(anim.count).toBe(pos.count);
    expect(edgePos.count).toBeGreaterThan(1000);
  });

  it('compiles Khuê Văn Các (KV-01) and Steel Atrium (SF-03) with consistent structure groups', () => {
    const kv = buildKhueVanCacPackage();
    const sf = buildSteelAtriumPackage();

    for (const pkg of [kv, sf]) {
      expect(pkg.steps.length).toBeGreaterThan(20);
      expect(pkg.totalPieces).toBeGreaterThan(400);
      const groupSum = pkg.manifest.structureGroups.reduce((acc, g) => acc + g.totalSteps, 0);
      expect(groupSum).toBe(pkg.steps.length);
      expect(pkg.triangleCount).toBeGreaterThan(1000);
      expect(pkg.edgeSegmentCount).toBeGreaterThan(500);
    }
  });

  it('interpolates shortest-path camera angles and deterministic build logs cleanly', () => {
    expect(Math.round(lerpAngleDeg(350, 10, 0.5))).toBe(0);

    const scaleNear = computeArchitecturalScale(15, 38);
    const scaleFar = computeArchitecturalScale(60, 28);
    expect(scaleNear.scaleRatio).toBeLessThan(scaleFar.scaleRatio);

    const pkg = buildPagodaFiveTierPackage();
    const kf = evaluateCameraKeyframes(pkg.manifest.cameraKeyframes, 12.5);
    expect(kf.distance).toBeGreaterThan(20);

    const logs = deriveBuildLogsAtTime(pkg, 16.0, {
      fps: 60,
      fpsHistory: [60],
      drawCalls: 3,
      triangles: pkg.triangleCount,
      edgeSegments: pkg.edgeSegmentCount,
      resolutionScale: 1.5,
    });
    expect(logs.length).toBeGreaterThan(4);
    expect(logs.some((l) => l.kind === 'LACQ' || l.kind === 'CHK')).toBe(true);
  });
});
