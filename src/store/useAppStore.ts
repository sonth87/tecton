import { create } from 'zustand';
import { getOrBuildCatalogPackage, registerImportedPackage } from '@/models/catalog';
import { soundEngine } from '@/engine/AudioEngine';
import { formatSpacedInt } from '@/core/math/drawingMath';
import type {
  ActiveToolDrawer,
  BuildLogItem,
  CameraLiveTelemetry,
  CompiledProjectPackage,
  GpuTelemetry,
  RenderStyle,
} from '@/core/types/project';

const SPEED_STEPS = [1, 2, 4, 0.5] as const;

export interface ManualSectionConfig {
  active: boolean;
  azimuthDeg: number;
  offset: number;
}

interface AppStoreState {
  // Project Model Management
  currentPackage: CompiledProjectPackage;
  stageThumbnails: string[];
  importedPackages: CompiledProjectPackage[];
  isImporting: boolean;
  importError: string | null;

  // Timeline & Playback
  currentTime: number;
  isPlaying: boolean;
  speedMultiplier: number;

  // Viewport & Shader Controls
  ghostEnabled: boolean;
  renderStyle: RenderStyle;
  forceColor: boolean;
  autoRotate: boolean;
  cleanHudMode: boolean;
  showCallouts: boolean;
  visibleLayerMask: number;
  highlightStep: number;
  resolutionScale: number;
  isMuted: boolean;
  manualSection: ManualSectionConfig | null;

  // UI Navigation
  activeDrawer: ActiveToolDrawer;
  inspectorTab: 'SEQUENCE' | 'MEMBERS';
  logCollapsed: boolean;

  // Throttled Telemetry for HUD
  gpuStats: GpuTelemetry;
  cameraStats: CameraLiveTelemetry;
  liveSectionState: { enabled: boolean; offset: number; azimuthDeg: number };

  // Actions
  selectBuiltinModel: (id: string) => void;
  setStageThumbnails: (thumbs: string[]) => void;
  addAndSelectImportedPackage: (pkg: CompiledProjectPackage) => void;
  setImportStatus: (loading: boolean, error?: string | null) => void;

  setCurrentTime: (t: number) => void;
  advanceTime: (dt: number) => void;
  togglePlay: () => void;
  rebuildFromZero: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  cycleSpeed: () => void;
  jumpToStage: (stageIndex: number) => void;

  toggleGhost: () => void;
  setRenderStyle: (style: RenderStyle) => void;
  toggleForceColor: () => void;
  toggleAutoRotate: () => void;
  toggleCleanHud: () => void;
  toggleShowCallouts: () => void;
  toggleLayerBit: (bit: number) => void;
  showAllLayers: () => void;
  soloLayerBit: (bit: number) => void;
  setHighlightStep: (stepIndex: number) => void;
  setResolutionScale: (scale: number) => void;
  toggleMute: () => void;

  toggleQuickSection: () => void;
  setManualSection: (cfg: ManualSectionConfig | null) => void;

  setActiveDrawer: (drawer: ActiveToolDrawer) => void;
  setInspectorTab: (tab: 'SEQUENCE' | 'MEMBERS') => void;
  toggleLogCollapsed: () => void;
  updateTelemetry: (
    gpu: GpuTelemetry,
    camera: CameraLiveTelemetry,
    sec: { enabled: boolean; offset: number; azimuthDeg: number }
  ) => void;
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  currentPackage: getOrBuildCatalogPackage('pagoda-five-tier'),
  stageThumbnails: [],
  importedPackages: [],
  isImporting: false,
  importError: null,

  currentTime: 0,
  isPlaying: true,
  speedMultiplier: 1,

  ghostEnabled: true,
  renderStyle: 'INK_PAINT',
  forceColor: false,
  autoRotate: true,
  cleanHudMode: false,
  showCallouts: true,
  visibleLayerMask: 0xffff,
  highlightStep: 0,
  resolutionScale: 1.5,
  isMuted: true,
  manualSection: null,

  activeDrawer: 'NONE',
  inspectorTab: 'SEQUENCE',
  logCollapsed: false,

  gpuStats: {
    fps: 60,
    fpsHistory: Array(32).fill(60),
    drawCalls: 3,
    triangles: 202000,
    edgeSegments: 91000,
    resolutionScale: 1.5,
  },
  cameraStats: {
    azimuthDeg: 211,
    elevationDeg: 19,
    focalLengthMm: 52,
    scaleRatio: 200,
    scaleBarMeters: 5,
    isManualOrbit: false,
  },
  liveSectionState: {
    enabled: false,
    offset: 14,
    azimuthDeg: 100,
  },

  selectBuiltinModel: (id) => {
    const pkg = getOrBuildCatalogPackage(id);
    set({
      currentPackage: pkg,
      currentTime: 0,
      isPlaying: true,
      visibleLayerMask: 0xffff,
      highlightStep: 0,
      manualSection: null,
      activeDrawer: 'NONE',
      importError: null,
    });
  },

  setStageThumbnails: (thumbs) => set({ stageThumbnails: thumbs }),

  addAndSelectImportedPackage: (pkg) => {
    registerImportedPackage(pkg);
    set((s) => ({
      currentPackage: pkg,
      importedPackages: [pkg, ...s.importedPackages],
      currentTime: 0,
      isPlaying: true,
      visibleLayerMask: 0xffff,
      highlightStep: 0,
      manualSection: null,
      activeDrawer: 'NONE',
      isImporting: false,
      importError: null,
    }));
  },

  setImportStatus: (loading, error = null) =>
    set({ isImporting: loading, importError: error }),

  setCurrentTime: (t) => {
    const dur = get().currentPackage.manifest.sequenceDuration;
    set({ currentTime: Math.max(0, Math.min(dur, t)) });
  },

  advanceTime: (dt) => {
    const state = get();
    if (!state.isPlaying) return;
    const dur = state.currentPackage.manifest.sequenceDuration;
    const prevT = state.currentTime;
    let nextT = prevT + dt * state.speedMultiplier;
    if (nextT >= dur) {
      nextT = nextT % dur;
    }

    // Play subtle audio tick when crossing into a new assembly step
    if (!state.isMuted && nextT > prevT && nextT < state.currentPackage.manifest.paintStartTime) {
      const steps = state.currentPackage.steps;
      for (let i = 0; i < steps.length; i++) {
        const st = steps[i].startTime;
        if (st > prevT && st <= nextT) {
          soundEngine.playStepTick(0.85 + (i / steps.length) * 0.55);
          break;
        }
      }
    }

    set({ currentTime: nextT });
  },

  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),

  rebuildFromZero: () =>
    set({
      currentTime: 0,
      isPlaying: true,
      manualSection: null,
      highlightStep: 0,
    }),

  stepForward: () => {
    const { currentPackage, currentTime } = get();
    const nextStep = currentPackage.steps.find((s) => s.startTime > currentTime + 0.04);
    if (nextStep) {
      set({ currentTime: nextStep.startTime + 0.05, isPlaying: false });
    } else {
      const nextStage = currentPackage.manifest.stages.find((st) => st.startTime > currentTime + 0.1);
      set({
        currentTime: nextStage ? nextStage.startTime + 0.05 : currentPackage.manifest.sequenceDuration - 0.1,
        isPlaying: false,
      });
    }
  },

  stepBackward: () => {
    const { currentPackage, currentTime } = get();
    const prevSteps = currentPackage.steps.filter((s) => s.startTime < currentTime - 0.08);
    if (prevSteps.length > 0) {
      set({ currentTime: prevSteps[prevSteps.length - 1].startTime + 0.02, isPlaying: false });
    } else {
      set({ currentTime: 0, isPlaying: false });
    }
  },

  cycleSpeed: () => {
    const cur = get().speedMultiplier;
    const idx = SPEED_STEPS.indexOf(cur as (typeof SPEED_STEPS)[number]);
    const next = SPEED_STEPS[(idx + 1) % SPEED_STEPS.length];
    set({ speedMultiplier: next });
  },

  jumpToStage: (stageIndex) => {
    const stage = get().currentPackage.manifest.stages[stageIndex];
    if (!stage) return;
    set({
      currentTime: stage.startTime + 0.02,
      manualSection: stage.phaseKind === 'SECTION' ? null : get().manualSection,
    });
  },

  toggleGhost: () => set((s) => ({ ghostEnabled: !s.ghostEnabled })),

  setRenderStyle: (style) =>
    set({
      renderStyle: style,
      forceColor: style === 'PAINT',
    }),

  toggleForceColor: () => set((s) => ({ forceColor: !s.forceColor })),

  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),

  toggleCleanHud: () => set((s) => ({ cleanHudMode: !s.cleanHudMode })),

  toggleShowCallouts: () => set((s) => ({ showCallouts: !s.showCallouts })),

  toggleLayerBit: (bit) =>
    set((s) => ({ visibleLayerMask: s.visibleLayerMask ^ (1 << bit) })),

  showAllLayers: () => set({ visibleLayerMask: 0xffff }),

  soloLayerBit: (bit) => set({ visibleLayerMask: 1 << bit }),

  setHighlightStep: (stepIndex) => set({ highlightStep: stepIndex }),

  setResolutionScale: (scale) => set({ resolutionScale: scale }),

  toggleMute: () => {
    const nextMuted = !get().isMuted;
    soundEngine.setMuted(nextMuted);
    set({ isMuted: nextMuted });
  },

  toggleQuickSection: () => {
    const { manualSection, liveSectionState } = get();
    if (manualSection?.active || liveSectionState.enabled) {
      set({ manualSection: { active: false, azimuthDeg: 100, offset: 15 } });
    } else {
      set({ manualSection: { active: true, azimuthDeg: 100, offset: 0.35 } });
    }
  },

  setManualSection: (cfg) => set({ manualSection: cfg }),

  setActiveDrawer: (drawer) =>
    set((s) => ({ activeDrawer: s.activeDrawer === drawer ? 'NONE' : drawer })),

  setInspectorTab: (tab) => set({ inspectorTab: tab }),

  toggleLogCollapsed: () => set((s) => ({ logCollapsed: !s.logCollapsed })),

  updateTelemetry: (gpu, camera, sec) =>
    set({ gpuStats: gpu, cameraStats: camera, liveSectionState: sec }),
}));

/**
 * Pure deterministic Build Log generator at `currentTime` — scrubbing backward or forward
 * always displays exact engineering logs with zero memory leaks!
 */
export function deriveBuildLogsAtTime(
  pkg: CompiledProjectPackage,
  currentTime: number,
  gpu: GpuTelemetry
): BuildLogItem[] {
  const events: BuildLogItem[] = [];
  const m = pkg.manifest;

  // Stage headers
  for (const st of m.stages) {
    if (currentTime >= st.startTime) {
      events.push({
        id: `st-${st.index}`,
        timeSec: st.startTime,
        kind: 'STAGE',
        text: `══ STAGE 0${st.index + 1}/0${m.stages.length} · ${st.cardTitle.replace(/^\d+\.\s*/, '')} — ${st.cardSubtitle}`,
      });
    }
  }

  // Assembly steps
  for (const step of pkg.steps) {
    if (currentTime >= step.startTime) {
      if (step.pieceCount > 0) {
        events.push({
          id: `asm-${step.stepIndex}`,
          timeSec: step.startTime,
          kind: 'ASM',
          text: `ASM ${step.title} +${step.pieceCount} pcs · Σ ${formatSpacedInt(step.cumulativePieces)}`,
        });
      }
    } else {
      break;
    }
  }

  // Periodic 2.00s GPU PERF telemetry snapshots
  for (let sec = 2; sec <= Math.floor(currentTime); sec += 2) {
    const triK = Math.round(gpu.triangles / 1000);
    const segK = Math.round(gpu.edgeSegments / 1000);
    events.push({
      id: `perf-${sec}`,
      timeSec: sec,
      kind: 'PERF',
      text: `PERF ${gpu.fps} fps · ${gpu.drawCalls} draws · ${triK}k tris · ${segK}k segs · ${gpu.resolutionScale.toFixed(2)}×`,
    });
  }

  // Plumb & Level Structural Check right before Stage 07
  const chkTime = m.paintStartTime - 0.04;
  if (currentTime >= chkTime) {
    events.push({
      id: 'chk-complete',
      timeSec: chkTime,
      kind: 'CHK',
      text: `CHK STRUCTURE · ${pkg.steps.length}/${pkg.steps.length} placed · plumb ±2.3 mm · level ±0.8 mm ✓`,
    });
  }

  // Special Paint & Section operations
  for (const op of m.specialOperations) {
    if (currentTime >= op.startTime) {
      events.push({
        id: `op-${op.id}`,
        timeSec: op.startTime + 0.15,
        kind: op.stageIndex === 6 ? 'LACQ' : op.id.endsWith('1') ? 'CUT' : 'VIEW',
        text: op.logMessage,
      });
    }
  }

  events.sort((a, b) => a.timeSec - b.timeSec);
  return events.slice(-11);
}
