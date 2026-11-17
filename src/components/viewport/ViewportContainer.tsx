import React, { useEffect, useMemo, useRef } from 'react';
import {
  Menu,
  ChevronDown,
  Music2,
  SkipBack,
  SkipForward,
  Pause,
  Play,
} from 'lucide-react';
import { AssemblySceneEngine } from '@/engine/AssemblyEngine';
import { engineBridge } from '@/engine/engineBridge';
import { useAppStore } from '@/store/useAppStore';
import { useI18nStore } from '@/store/useI18nStore';
import { formatTimecode } from '@/core/math/drawingMath';
import type { RenderStyle } from '@/core/types/project';

const RENDER_STYLE_LABELS: Record<RenderStyle, string> = {
  INK_PAINT: 'Ink + Paint',
  INK: 'Pure Ink',
  PAINT: 'Full Paint',
  CLAY: 'Clay AO',
  WIRE: 'Wireframe',
};

const RENDER_CYCLE: RenderStyle[] = ['INK_PAINT', 'INK', 'PAINT', 'CLAY', 'WIRE'];

export const ViewportContainer: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Direct 60Hz SVG/DOM refs for zero-lag 3D->2D projection
  const datumPoleLineRef = useRef<SVGLineElement | null>(null);
  const datumTopBadgeRef = useRef<HTMLDivElement | null>(null);
  const datumTickRefs = useRef<(SVGGElement | null)[]>([]);
  const calloutLineRefs = useRef<(SVGPolylineElement | null)[]>([]);
  const calloutDotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const calloutBoxRefs = useRef<(HTMLDivElement | null)[]>([]);

  const pkg = useAppStore((s) => s.currentPackage);
  const currentTime = useAppStore((s) => s.currentTime);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const speedMultiplier = useAppStore((s) => s.speedMultiplier);
  const ghostEnabled = useAppStore((s) => s.ghostEnabled);
  const renderStyle = useAppStore((s) => s.renderStyle);
  const forceColor = useAppStore((s) => s.forceColor);
  const autoRotate = useAppStore((s) => s.autoRotate);
  const cleanHudMode = useAppStore((s) => s.cleanHudMode);
  const showCallouts = useAppStore((s) => s.showCallouts);
  const resolutionScale = useAppStore((s) => s.resolutionScale);
  const isMuted = useAppStore((s) => s.isMuted);
  const manualSection = useAppStore((s) => s.manualSection);
  const cameraStats = useAppStore((s) => s.cameraStats);
  const liveSection = useAppStore((s) => s.liveSectionState);

  const setCurrentTime = useAppStore((s) => s.setCurrentTime);
  const togglePlay = useAppStore((s) => s.togglePlay);
  const rebuildFromZero = useAppStore((s) => s.rebuildFromZero);
  const stepForward = useAppStore((s) => s.stepForward);
  const stepBackward = useAppStore((s) => s.stepBackward);
  const cycleSpeed = useAppStore((s) => s.cycleSpeed);
  const toggleGhost = useAppStore((s) => s.toggleGhost);
  const setRenderStyle = useAppStore((s) => s.setRenderStyle);
  const toggleForceColor = useAppStore((s) => s.toggleForceColor);
  const toggleAutoRotate = useAppStore((s) => s.toggleAutoRotate);
  const toggleCleanHud = useAppStore((s) => s.toggleCleanHud);
  const toggleMute = useAppStore((s) => s.toggleMute);
  const toggleQuickSection = useAppStore((s) => s.toggleQuickSection);

  const t = useI18nStore((s) => s.t);
  const m = pkg.manifest;

  // Determine active stage & active operation for banner
  const activeStage =
    m.stages.find((st) => currentTime >= st.startTime && currentTime < st.endTime) ??
    m.stages[m.stages.length - 1];

  const activeAssemblyStep = useMemo(() => {
    let found = pkg.steps[0];
    for (const s of pkg.steps) {
      if (currentTime >= s.startTime) found = s;
      else break;
    }
    return found;
  }, [pkg, currentTime]);

  const activeSpecialOp = useMemo(() => {
    if (currentTime < m.paintStartTime) return null;
    return (
      m.specialOperations.find(
        (op) => currentTime >= op.startTime && currentTime <= op.endTime
      ) ?? m.specialOperations[m.specialOperations.length - 1] ?? null
    );
  }, [m, currentTime]);

  // Latest 3 active 3D callouts at currentTime
  const visibleCallouts = useMemo(() => {
    if (!showCallouts || cleanHudMode) return [];
    const triggered = pkg.callouts.filter(
      (c) => currentTime >= c.triggerTime && currentTime - c.triggerTime < 6.5
    );
    return triggered.slice(-3).reverse(); // Index 0 = newest!
  }, [pkg, currentTime, showCallouts, cleanHudMode]);

  const visibleCalloutsRef = useRef(visibleCallouts);
  visibleCalloutsRef.current = visibleCallouts;

  // Mount Three.js Engine + Master 60Hz Loop
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const engine = new AssemblySceneEngine(el);
    engineBridge.attach(engine);
    const initialThumbs = engine.loadProject(useAppStore.getState().currentPackage);
    useAppStore.getState().setStageThumbnails(initialThumbs);

    let rafId = 0;
    let lastNow = performance.now();
    let hudThrottleAccum = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastNow) / 1000));
      lastNow = now;

      const store = useAppStore.getState();
      store.advanceTime(dt);

      const updated = useAppStore.getState();
      engine.syncParameters({
        time: updated.currentTime,
        ghostEnabled: updated.ghostEnabled,
        renderStyle: updated.renderStyle,
        forceColor: updated.forceColor,
        autoRotate: updated.autoRotate,
        manualSectionOverride: updated.manualSection,
        visibleLayerMask: updated.visibleLayerMask,
        highlightStep: updated.highlightStep,
      });

      const snap = engine.renderTick(dt);

      // 60Hz Direct-DOM Projection of Vertical Elevation Datum Pole & 3D Callouts
      const curPkg = updated.currentPackage;
      const datumWorldX = curPkg.manifest.footprintHalfExtent * 0.92;
      const datumWorldZ = -curPkg.manifest.footprintHalfExtent * 0.45;

      const pBase = snap.project3D([datumWorldX, 0, datumWorldZ]);
      const pTop = snap.project3D([datumWorldX, curPkg.manifest.totalHeight, datumWorldZ]);
      const poleX = Math.max(el.clientWidth * 0.56, Math.min(el.clientWidth - 226, pTop.x));

      if (datumPoleLineRef.current) {
        if (pBase.visible && pTop.visible && !updated.cleanHudMode) {
          datumPoleLineRef.current.setAttribute('x1', poleX.toFixed(1));
          datumPoleLineRef.current.setAttribute('y1', Math.max(20, pTop.y).toFixed(1));
          datumPoleLineRef.current.setAttribute('x2', poleX.toFixed(1));
          datumPoleLineRef.current.setAttribute('y2', Math.min(el.clientHeight - 72, pBase.y).toFixed(1));
          datumPoleLineRef.current.style.opacity = '0.85';
        } else {
          datumPoleLineRef.current.style.opacity = '0';
        }
      }

      if (datumTopBadgeRef.current) {
        if (pTop.visible && !updated.cleanHudMode && pTop.y > 24 && pTop.y < el.clientHeight - 80) {
          datumTopBadgeRef.current.style.transform = `translate3d(${(poleX - 42).toFixed(1)}px, ${(pTop.y - 26).toFixed(1)}px, 0)`;
          datumTopBadgeRef.current.style.opacity = '1';
        } else {
          datumTopBadgeRef.current.style.opacity = '0';
        }
      }

      curPkg.manifest.elevationMarkers.forEach((mk, idx) => {
        const gEl = datumTickRefs.current[idx];
        if (!gEl) return;
        const pt = snap.project3D([datumWorldX, mk.height, datumWorldZ]);
        if (pt.visible && !updated.cleanHudMode && pt.y > 32 && pt.y < el.clientHeight - 76) {
          gEl.setAttribute('transform', `translate(${poleX.toFixed(1)}, ${pt.y.toFixed(1)})`);
          gEl.style.opacity = '0.9';
        } else {
          gEl.style.opacity = '0';
        }
      });

      // Project up to 3 active Leader-Line Callouts
      const activeCos = visibleCalloutsRef.current;
      for (let i = 0; i < 3; i++) {
        const co = activeCos[i];
        const poly = calloutLineRefs.current[i];
        const dot = calloutDotRefs.current[i];
        const box = calloutBoxRefs.current[i];
        if (!co || !poly || !dot || !box) {
          if (poly) poly.style.opacity = '0';
          if (dot) dot.style.opacity = '0';
          if (box) box.style.opacity = '0';
          continue;
        }

        const anchor2D = snap.project3D(co.anchor);
        if (!anchor2D.visible) {
          poly.style.opacity = '0';
          dot.style.opacity = '0';
          box.style.opacity = '0';
          continue;
        }

        const fadeAlpha = i === 0 ? 1.0 : i === 1 ? 0.72 : 0.42;
        const w = el.clientWidth;
        const isLeft = co.preferredSide === 'left';
        const boxW = 248;
        const labelX = isLeft ? Math.max(22, Math.min(anchor2D.x - 95, w * 0.16)) : Math.min(w - boxW - 22, Math.max(anchor2D.x + 70, w * 0.64));
        const labelY = Math.max(155 + i * 56, Math.min(el.clientHeight - 165, anchor2D.y - 18 + (i - 1) * 34));

        const lineStartX = isLeft ? labelX : labelX + boxW;
        const lineEndX = isLeft ? labelX + boxW : labelX;

        poly.setAttribute(
          'points',
          `${lineStartX.toFixed(1)},${labelY.toFixed(1)} ${lineEndX.toFixed(1)},${labelY.toFixed(1)} ${anchor2D.x.toFixed(1)},${anchor2D.y.toFixed(1)}`
        );
        poly.style.opacity = String(fadeAlpha);

        dot.setAttribute('cx', anchor2D.x.toFixed(1));
        dot.setAttribute('cy', anchor2D.y.toFixed(1));
        dot.style.opacity = String(fadeAlpha);

        box.style.transform = `translate3d(${labelX.toFixed(1)}px, ${(labelY - 22).toFixed(1)}px, 0)`;
        box.style.opacity = String(fadeAlpha);
      }

      // Throttle Zustand HUD telemetry updates to ~12Hz so React stays feather-light
      hudThrottleAccum += dt;
      if (hudThrottleAccum >= 0.085) {
        hudThrottleAccum = 0;
        updated.updateTelemetry(snap.gpu, snap.camera, {
          enabled: snap.sectionEnabled,
          offset: snap.sectionOffset,
          azimuthDeg: snap.sectionAzimuthDeg,
        });
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      engineBridge.attach(null);
      engine.dispose();
    };
  }, []);

  // Reload GPU buffers & regenerate 8 genuine 3D stage thumbnails when currentPackage changes
  useEffect(() => {
    const thumbs = engineBridge.getEngine()?.loadProject(pkg);
    if (thumbs) {
      useAppStore.getState().setStageThumbnails(thumbs);
    }
  }, [pkg]);

  // Sync resolution scale changes
  useEffect(() => {
    engineBridge.getEngine()?.setResolutionScale(resolutionScale);
  }, [resolutionScale]);

  // Banner status lines
  let bannerRedLine = `STEP ${String(activeAssemblyStep?.stepIndex ?? 1).padStart(3, '0')} / ${pkg.steps.length}`;
  let bannerMainTitle = activeAssemblyStep?.title ?? '';
  let bannerSubSpec = activeAssemblyStep?.specification ?? '';

  if (activeSpecialOp) {
    bannerRedLine =
      activeStage.phaseKind === 'SECTION'
        ? `SECTION A-A · d ${liveSection.offset.toFixed(2)} m`
        : activeSpecialOp.bannerStatus;
    bannerMainTitle = activeSpecialOp.title;
    bannerSubSpec = activeSpecialOp.specification;
  } else if (manualSection?.active) {
    bannerRedLine = `SECTION A-A · d ${manualSection.offset.toFixed(2)} m`;
  }

  const phaseName =
    activeStage.phaseKind === 'ASSEMBLY'
      ? 'ASSEMBLY'
      : activeStage.phaseKind === 'LACQUER'
        ? 'LACQUER'
        : 'SECTION A-A';

  const scrubberPct = (currentTime / Math.max(0.1, m.sequenceDuration)) * 100;

  return (
    <section className="relative flex-1 h-full rounded-xl border border-[#DDD5C7] drafting-grid-bg overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,251,0.5)]">
      {/* Vertical Hollow Architectural Watermark along Left Margin */}
      <div
        aria-hidden
        className="absolute left-4 top-[198px] bottom-[96px] flex flex-col justify-between items-center text-[48px] font-bold tracking-tighter watermark-hollow z-0 select-none"
      >
        {m.watermarkText.split('').map((ch, idx) => (
          <span key={idx}>{ch}</span>
        ))}
      </div>

      {/* Three.js 60 FPS WebGL Canvas Host */}
      <div ref={mountRef} className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing" />

      {/* 60Hz Direct-Projected SVG Layer (Vertical Elevation Datum Pole & 3D Leader Lines) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
        <defs>
          <marker id="datum-arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <polygon points="0,6 3,0 6,6" fill="#BD312B" />
          </marker>
        </defs>

        {/* Vertical Elevation Datum Pole */}
        <line
          ref={datumPoleLineRef}
          x1="0"
          y1="0"
          x2="0"
          y2="0"
          stroke="#BD312B"
          strokeWidth="1.15"
          style={{ opacity: 0 }}
        />

        {m.elevationMarkers.map((mk, idx) => (
          <g
            key={mk.code}
            ref={(el) => {
              datumTickRefs.current[idx] = el;
            }}
            style={{ opacity: 0 }}
          >
            {/* Dashed horizontal projection line */}
            <line x1="-26" y1="0" x2="8" y2="0" stroke="#BD312B" strokeWidth="0.7" strokeDasharray="2 2" opacity="0.55" />
            {/* 45-degree architectural datum slash */}
            <line x1="-4" y1="4" x2="4" y2="-4" stroke="#BD312B" strokeWidth="1.15" />
            <text x="-8" y="-3" textAnchor="end" className="fill-[#6F6559] text-[8px] font-medium">
              {mk.code}
            </text>
            <text x="8" y="3" textAnchor="start" className="fill-[#7A2E2A] text-[8.5px] font-semibold">
              {mk.height === 0 ? '±0.00' : `+${mk.height.toFixed(2)}`}
            </text>
          </g>
        ))}

        {/* 3D Leader-Line Polylines & Anchor Target Rings */}
        {[0, 1, 2].map((slot) => (
          <g key={slot}>
            <polyline
              ref={(el) => {
                calloutLineRefs.current[slot] = el;
              }}
              fill="none"
              stroke="#BD312B"
              strokeWidth="0.95"
              style={{ opacity: 0 }}
            />
            <circle
              ref={(el) => {
                calloutDotRefs.current[slot] = el;
              }}
              r="3.2"
              fill="#FAF8F4"
              stroke="#BD312B"
              strokeWidth="1.4"
              style={{ opacity: 0 }}
            />
          </g>
        ))}
      </svg>

      {/* Top Height Boxed Badge [ H = XX.XX m ] */}
      <div
        ref={datumTopBadgeRef}
        style={{ opacity: 0 }}
        className="absolute top-0 left-0 pointer-events-none z-20 px-1.5 py-[1.5px] border border-[#BD312B] bg-[#FAF8F4]/95 text-[8.5px] font-semibold text-[#BD312B] whitespace-nowrap rounded-[2px]"
      >
        H = {m.totalHeight.toFixed(2)} m
      </div>

      {/* 3D Callout Text Labels (Positioned at 60Hz via translate3d) */}
      {[0, 1, 2].map((slot) => {
        const co = visibleCallouts[slot];
        const isLeft = co?.preferredSide === 'left';
        return (
          <div
            key={slot}
            ref={(el) => {
              calloutBoxRefs.current[slot] = el;
            }}
            style={{ opacity: 0, width: 248 }}
            className={`absolute top-0 left-0 pointer-events-none z-20 ${
              isLeft ? 'text-right pr-1' : 'text-left pl-1'
            }`}
          >
            <div className="inline-block max-w-full bg-[#FAF6F0]/84 backdrop-blur-[2px] px-1.5 py-0.5 rounded-[3px]">
              <div className="text-[10px] font-bold tracking-[0.03em] text-[#1E1508] truncate leading-tight">
                {co?.title ?? ''}
              </div>
              <div className="text-[9px] font-editorial text-[#A33630] truncate mt-1 leading-tight">
                {co?.subtitle ?? ''}
              </div>
            </div>
          </div>
        );
      })}

      {/* Top-Left 5-Pill Floating Control Bar */}
      <div className="absolute top-3 left-3 z-30 flex flex-wrap items-center gap-1.5">
        <button
          onClick={toggleCleanHud}
          title="Toggle Clean Viewport HUD"
          className={`h-7 w-7 rounded-lg border flex items-center justify-center transition cursor-pointer ${
            cleanHudMode
              ? 'bg-[#BD312B] border-[#BD312B] text-white'
              : 'bg-[#FFFFFB]/92 border-[#DDD5C7] text-[#1E1508] hover:border-[#BD312B]/60'
          }`}
        >
          <Menu className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => engineBridge.returnToDirectorCam()}
          title={
            cameraStats.isManualOrbit
              ? 'Manual Orbit active — Click to return to Automatic Director Camera'
              : 'Drag viewport with mouse to orbit/zoom freely'
          }
          className="h-7 px-2.5 rounded-lg border border-[#DDD5C7] bg-[#FFFFFB]/92 text-[10px] font-medium text-[#1E1508] flex items-center gap-1.5 hover:border-[#BD312B]/60 transition cursor-pointer"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              cameraStats.isManualOrbit ? 'bg-[#D97706]' : 'bg-[#BD312B]'
            }`}
          />
          <span>{cameraStats.isManualOrbit ? 'Manual Cam · Reset' : t.orbitCam}</span>
        </button>

        <button
          onClick={() => {
            const next =
              RENDER_CYCLE[(RENDER_CYCLE.indexOf(renderStyle) + 1) % RENDER_CYCLE.length];
            setRenderStyle(next);
          }}
          title="Cycle Shader Render Mode"
          className="h-7 px-2.5 rounded-lg border border-[#DDD5C7] bg-[#FFFFFB]/92 text-[10px] font-medium text-[#1E1508] flex items-center gap-1 hover:border-[#BD312B]/60 transition cursor-pointer"
        >
          <span>{RENDER_STYLE_LABELS[renderStyle]}</span>
          <ChevronDown className="w-3 h-3 text-[#6F6559]" />
        </button>

        <button
          onClick={toggleGhost}
          title="Toggle Future Unplaced Wireframe Silhouette"
          className={`h-7 px-2.5 rounded-lg border text-[10px] font-semibold transition cursor-pointer ${
            ghostEnabled
              ? 'border-[#BD312B] bg-[#FCECEB]/85 text-[#BD312B]'
              : 'border-[#DDD5C7] bg-[#FFFFFB]/92 text-[#6F6559]'
          }`}
        >
          Ghost
        </button>

        <button
          onClick={toggleMute}
          title="Toggle Ambient Architectural Synth Soundtrack"
          className={`h-7 px-2.5 rounded-lg border text-[10px] font-medium flex items-center gap-2 transition cursor-pointer ${
            !isMuted
              ? 'border-[#BD312B] bg-[#FCECEB]/85 text-[#BD312B]'
              : 'border-[#DDD5C7] bg-[#FFFFFB]/92 text-[#1E1508]'
          }`}
        >
          <Music2 className="w-3 h-3" />
          <div className="flex items-end gap-[1.5px] h-2.5">
            {[3, 6, 9, 5, 10, 7, 4, 8, 5].map((h, i) => (
              <span
                key={i}
                className={`w-[1.5px] rounded-full transition-all ${
                  !isMuted ? 'bg-[#BD312B] animate-pulse' : 'bg-[#C8BDAC]'
                }`}
                style={{ height: isMuted ? 2 : h }}
              />
            ))}
          </div>
          <span>{isMuted ? 'Muted' : 'Synth'}</span>
        </button>
      </div>

      {/* Top-Left Drawing Title & Live Step Overlay Card */}
      {!cleanHudMode && (
        <div className="absolute top-12 left-3 z-20 max-w-[360px] bg-[#FFFFFB]/86 backdrop-blur-[2px] rounded-r-lg rounded-l-[4px] border border-[#E5DDD0] border-l-[2.5px] border-l-[#BD312B] px-3.5 py-2.5 shadow-[0_2px_8px_rgba(30,21,8,0.04)] pointer-events-none">
          <h1 className="font-editorial text-[17px] font-semibold text-[#1E1508] leading-snug">
            {m.drawingTitle}
          </h1>
          <p className="font-editorial text-[10.5px] text-[#5E5448] mt-0.5 leading-snug">
            {m.drawingSubtitle}
          </p>
          <div className="text-[9.5px] font-semibold text-[#BD312B] tracking-[0.08em] uppercase mt-2">
            {bannerRedLine}
          </div>
          <div className="text-[11px] font-bold text-[#1E1508] tracking-[0.02em] mt-0.5 truncate">
            {bannerMainTitle}
          </div>
          <div className="font-editorial text-[10px] text-[#9E2B25] truncate leading-tight">
            {bannerSubSpec}
          </div>
        </div>
      )}

      {/* Top-Right CAD Title Block Stamp */}
      {!cleanHudMode && (
        <div className="absolute top-3 right-3 z-20 w-[206px] bg-[#FFFFFB]/90 backdrop-blur-[2px] border border-[#BD312B]/75 text-[#1E1508] pointer-events-none shadow-[0_2px_6px_rgba(30,21,8,0.03)]">
          <div className="px-2.5 py-1.5 border-b border-[#BD312B]/35">
            <div className="text-[7px] tracking-[0.12em] text-[#BD312B] uppercase">{t.drawing}</div>
            <div className="font-editorial text-[11px] font-semibold tracking-[0.03em] truncate mt-[1px]">
              {m.projectTitleUpper}
            </div>
          </div>

          <div className="grid grid-cols-[1.25fr_0.75fr] border-b border-[#BD312B]/35">
            <div className="px-2.5 py-1 border-r border-[#BD312B]/35">
              <div className="text-[6.5px] tracking-[0.1em] text-[#9E2B25] uppercase">{t.dwgNo}</div>
              <div className="text-[9.5px] font-semibold mt-[1px]">
                {m.dwgCode} / {activeStage.sheetCode}
              </div>
            </div>
            <div className="px-2.5 py-1">
              <div className="text-[6.5px] tracking-[0.1em] text-[#9E2B25] uppercase">{t.scale}</div>
              <div className="text-[9.5px] font-semibold mt-[1px]">1:{cameraStats.scaleRatio}</div>
            </div>
          </div>

          <div className="grid grid-cols-[1.25fr_0.75fr] border-b border-[#BD312B]/35">
            <div className="px-2.5 py-1 border-r border-[#BD312B]/35">
              <div className="text-[6.5px] tracking-[0.1em] text-[#9E2B25] uppercase">{t.phase}</div>
              <div className="text-[9.5px] font-semibold text-[#BD312B] mt-[1px] truncate">
                {phaseName}
              </div>
            </div>
            <div className="px-2.5 py-1">
              <div className="text-[6.5px] tracking-[0.1em] text-[#9E2B25] uppercase">{t.sheet}</div>
              <div className="text-[9.5px] font-semibold mt-[1px]">
                {activeStage.index + 1} / {m.stages.length}
              </div>
            </div>
          </div>

          <div className="px-2.5 py-1">
            <div className="text-[6.5px] tracking-[0.1em] text-[#9E2B25] uppercase">{t.camera}</div>
            <div className="text-[9.5px] font-semibold mt-[1px]">
              AZ {String(cameraStats.azimuthDeg).padStart(3, '0')}° · EL{' '}
              {cameraStats.elevationDeg >= 0 ? `+${cameraStats.elevationDeg}` : cameraStats.elevationDeg}° ·{' '}
              {cameraStats.focalLengthMm} mm
            </div>
          </div>
        </div>
      )}

      {/* Bottom Viewport Scrubber & Floating Transport Controls */}
      <div className="absolute bottom-2.5 left-4 right-4 z-30 flex flex-col gap-2 pointer-events-none">
        {/* Dynamic Architectural Graphic Scale Bar */}
        {!cleanHudMode && (
          <div className="w-[148px] mb-0.5 bg-[#F6F0EA]/78 backdrop-blur-[1.5px] px-1.5 py-1 rounded">
            <div className="flex justify-between text-[8.5px] font-semibold text-[#1E1508] mb-0.5">
              <span>0</span>
              <span>{(cameraStats.scaleBarMeters * 0.5).toFixed(cameraStats.scaleBarMeters === 5 ? 1 : 0)}</span>
              <span>{cameraStats.scaleBarMeters} m</span>
            </div>
            <div className="w-full h-[5px] border border-[#1E1508] grid grid-cols-4 bg-[#FFFFFB]">
              <div className="bg-[#1E1508]" />
              <div className="bg-[#FFFFFB]" />
              <div className="bg-[#1E1508]" />
              <div className="bg-[#FFFFFB]" />
            </div>
            <div className="text-[7.5px] tracking-[0.12em] text-[#BD312B] font-medium mt-0.5">
              SCALE · 1:{cameraStats.scaleRatio}
            </div>
          </div>
        )}

        {/* Full-Width Stage-Ticked Timeline Scrubber */}
        <div className="relative w-full pointer-events-auto">
          <div className="relative h-3.5 w-full text-[8px] tracking-[0.06em] text-[#3E352B] font-semibold [text-shadow:0_0_5px_#F6F0EA,0_0_3px_#F6F0EA]">
            {m.stages.map((st) => {
              const leftPct = (st.startTime / m.sequenceDuration) * 100;
              return (
                <span
                  key={st.id}
                  style={{ left: `${leftPct}%` }}
                  className="absolute top-0 -translate-x-0.5 select-none"
                >
                  {st.shortCode}
                </span>
              );
            })}
          </div>

          <div className="relative h-4 flex items-center">
            {/* Base Track */}
            <div className="w-full h-[2.5px] bg-[#D6CEC0] rounded-full relative">
              {m.stages.map((st) => (
                <span
                  key={st.id}
                  style={{ left: `${(st.startTime / m.sequenceDuration) * 100}%` }}
                  className="absolute -top-1 w-[1px] h-2.5 bg-[#ACA292]"
                />
              ))}
              <div
                className="h-full bg-[#BD312B] rounded-full"
                style={{ width: `${scrubberPct}%` }}
              />
            </div>

            <input
              type="range"
              min={0}
              max={m.sequenceDuration}
              step={0.02}
              value={currentTime}
              onChange={(e) => setCurrentTime( parseFloat(e.target.value) )}
              aria-label="Master assembly timeline scrubber"
              className="timeline-scrubber absolute inset-0 w-full h-full m-0"
            />
          </div>
        </div>

        {/* Centered Floating Transport & Shortcut Dock */}
        <div className="self-center bg-[#FAF8F4]/96 backdrop-blur-xs border border-[#DDD5C7] rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-[0_3px_12px_rgba(30,21,8,0.08)] pointer-events-auto">
          {/* Step Back / Play-Pause / Step Forward */}
          <button
            onClick={stepBackward}
            title="Previous Step [Left Arrow]"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#1E1508] hover:bg-[#EFEAE0] transition cursor-pointer"
          >
            <SkipBack className="w-3.5 h-3.5 fill-current" />
          </button>

          <button
            onClick={togglePlay}
            title="Play / Pause [Space]"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#1E1508] hover:bg-[#EFEAE0] transition cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
          </button>

          <button
            onClick={stepForward}
            title="Next Step [Right Arrow]"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#1E1508] hover:bg-[#EFEAE0] transition cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5 fill-current" />
          </button>

          {/* Timecode */}
          <div className="px-2 text-center leading-tight min-w-[68px]">
            <div className="text-[10px] font-bold text-[#1E1508]">
              {formatTimecode(currentTime)} /
            </div>
            <div className="text-[9.5px] font-semibold text-[#5E5448]">
              00:{Math.round(m.sequenceDuration)}
            </div>
          </div>

          <div className="h-6 w-[1px] bg-[#DDD5C7] mx-0.5" />

          {/* 7 Action & Shortcut Buttons */}
          <ShortcutButton label={t.rebuild} shortcut="R" active={false} onClick={rebuildFromZero} />
          <ShortcutButton
            label={t.autoRotate}
            shortcut="A"
            active={autoRotate}
            onClick={toggleAutoRotate}
          />
          <ShortcutButton
            label={t.colour}
            shortcut="C"
            active={forceColor || renderStyle === 'PAINT'}
            onClick={toggleForceColor}
          />
          <ShortcutButton
            label={t.frame}
            shortcut="X"
            active={renderStyle === 'WIRE'}
            onClick={() => setRenderStyle(renderStyle === 'WIRE' ? 'INK_PAINT' : 'WIRE')}
          />
          <ShortcutButton
            label={t.sectionBtn}
            shortcut="S"
            active={Boolean(manualSection?.active || liveSection.enabled)}
            onClick={toggleQuickSection}
          />
          <ShortcutButton
            label={`${t.speed} ×${speedMultiplier}`}
            shortcut="F"
            active={speedMultiplier !== 1}
            onClick={cycleSpeed}
          />
          <ShortcutButton
            label={t.view}
            shortcut="V"
            active={false}
            onClick={() => engineBridge.cycleCameraPreset()}
          />
        </div>
      </div>
    </section>
  );
};

interface ShortcutButtonProps {
  label: string;
  shortcut: string;
  active: boolean;
  onClick: () => void;
}

const ShortcutButton: React.FC<ShortcutButtonProps> = ({
  label,
  shortcut,
  active,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={`h-[36px] px-2.5 rounded-lg border flex flex-col items-center justify-center leading-none transition cursor-pointer ${
      active
        ? 'bg-[#BD312B] border-[#BD312B] text-white shadow-xs'
        : 'bg-[#FFFFFB] border-[#DDD5C7] text-[#1E1508] hover:border-[#BD312B]/50 hover:bg-[#F7F3EB]'
    }`}
  >
    <span className="text-[8.5px] font-bold tracking-[0.04em] whitespace-nowrap">
      {label}
    </span>
    <span
      className={`text-[7.5px] mt-1 ${
        active ? 'text-white/80' : 'text-[#8A7F72]'
      }`}
    >
      {shortcut}
    </span>
  </button>
);
