import type { CameraKeyframe, SectionKeyframe } from '@/core/types/project';

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smootherstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

export function easeOutCubic(t: number): number {
  const x = clamp(t, 0, 1);
  return 1 - Math.pow(1 - x, 3);
}

/**
 * Shortest-path angular interpolation in degrees
 */
export function lerpAngleDeg(a: number, b: number, t: number): number {
  const diff = ((((b - a) % 360) + 540) % 360) - 180;
  return (((a + diff * t) % 360) + 360) % 360;
}

/**
 * Interpolates scripted camera keyframes at time `t`
 */
export function evaluateCameraKeyframes(
  keyframes: CameraKeyframe[],
  t: number
): CameraKeyframe {
  if (keyframes.length === 0) {
    return {
      time: t,
      azimuthDeg: 225,
      elevationDeg: 20,
      distance: 45,
      target: [0, 12, 0],
      fov: 32,
      allowAutoRotate: true,
    };
  }
  if (t <= keyframes[0].time) return keyframes[0];
  const last = keyframes[keyframes.length - 1];
  if (t >= last.time) return last;

  for (let i = 0; i < keyframes.length - 1; i++) {
    const k0 = keyframes[i];
    const k1 = keyframes[i + 1];
    if (t >= k0.time && t <= k1.time) {
      const span = Math.max(0.0001, k1.time - k0.time);
      const u = smootherstep((t - k0.time) / span);
      return {
        time: t,
        azimuthDeg: lerpAngleDeg(k0.azimuthDeg, k1.azimuthDeg, u),
        elevationDeg: lerp(k0.elevationDeg, k1.elevationDeg, u),
        distance: lerp(k0.distance, k1.distance, u),
        target: [
          lerp(k0.target[0], k1.target[0], u),
          lerp(k0.target[1], k1.target[1], u),
          lerp(k0.target[2], k1.target[2], u),
        ],
        fov: lerp(k0.fov, k1.fov, u),
        allowAutoRotate: u < 0.5 ? k0.allowAutoRotate : k1.allowAutoRotate,
      };
    }
  }
  return last;
}

/**
 * Interpolates scripted Section A-A cut plane keyframes at time `t`
 */
export function evaluateSectionKeyframes(
  keyframes: SectionKeyframe[],
  t: number
): SectionKeyframe {
  if (keyframes.length === 0) {
    return { time: t, enabled: false, azimuthDeg: 100, offset: 20 };
  }
  if (t <= keyframes[0].time) return keyframes[0];
  const last = keyframes[keyframes.length - 1];
  if (t >= last.time) return last;

  for (let i = 0; i < keyframes.length - 1; i++) {
    const k0 = keyframes[i];
    const k1 = keyframes[i + 1];
    if (t >= k0.time && t <= k1.time) {
      const span = Math.max(0.0001, k1.time - k0.time);
      const u = smootherstep((t - k0.time) / span);
      return {
        time: t,
        enabled: k0.enabled || k1.enabled,
        azimuthDeg: lerpAngleDeg(k0.azimuthDeg, k1.azimuthDeg, u),
        offset: lerp(k0.offset, k1.offset, u),
      };
    }
  }
  return last;
}

/**
 * Converts vertical FOV (degrees) on a 24mm full-frame sensor height into equivalent focal length (mm)
 */
export function fovToFocalLengthMm(fovDeg: number): number {
  const rad = (fovDeg * Math.PI) / 180;
  const mm = 12 / Math.tan(rad / 2);
  return Math.round(clamp(mm, 18, 120));
}

/**
 * Computes clean architectural scale denominator (1:50, 1:100, 1:125, 1:150, 1:200, 1:250, 1:500)
 * and matching graphic scale bar total meters based on visible vertical world height.
 */
export function computeArchitecturalScale(
  distance: number,
  fovDeg: number
): { scaleRatio: number; scaleBarMeters: number } {
  const visibleHeightMeters = 2 * distance * Math.tan(((fovDeg * Math.PI) / 180) / 2);
  // Assuming ~0.19m physical sheet viewport height on screen
  const rawRatio = visibleHeightMeters / 0.19;
  const standards = [25, 50, 75, 100, 125, 150, 200, 250, 300, 500];
  let best = standards[0];
  let bestDiff = Math.abs(rawRatio - best);
  for (const s of standards) {
    const d = Math.abs(rawRatio - s);
    if (d < bestDiff) {
      best = s;
      bestDiff = d;
    }
  }
  let scaleBarMeters = 5;
  if (best <= 50) scaleBarMeters = 2;
  else if (best <= 200) scaleBarMeters = 5;
  else scaleBarMeters = 10;

  return { scaleRatio: best, scaleBarMeters };
}

export function formatSpacedInt(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatTimecode(sec: number): string {
  const clamped = Math.max(0, sec);
  const mins = Math.floor(clamped / 60);
  const rem = clamped - mins * 60;
  const secStr = rem < 10 ? `0${rem.toFixed(1)}` : rem.toFixed(1);
  return `${mins < 10 ? '0' : ''}${mins}:${secStr}`;
}
