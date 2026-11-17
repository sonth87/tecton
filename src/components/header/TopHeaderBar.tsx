import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { formatSpacedInt } from '@/core/math/drawingMath';

export const TopHeaderBar: React.FC = () => {
  const pkg = useAppStore((s) => s.currentPackage);
  const currentTime = useAppStore((s) => s.currentTime);
  const gpuFps = useAppStore((s) => s.gpuStats.fps);
  const cameraAz = useAppStore((s) => s.cameraStats.azimuthDeg);
  const toggleQuickSection = useAppStore((s) => s.toggleQuickSection);
  const setActiveDrawer = useAppStore((s) => s.setActiveDrawer);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const m = pkg.manifest;

  // Determine current stage & placed counts
  const activeStage =
    m.stages.find((st) => currentTime >= st.startTime && currentTime < st.endTime) ??
    m.stages[m.stages.length - 1];

  let completedSteps = 0;
  let placedPieces = 0;
  for (const st of pkg.steps) {
    if (currentTime >= st.startTime) {
      completedSteps = st.stepIndex;
      placedPieces = st.cumulativePieces;
    } else {
      break;
    }
  }

  const phaseTitle =
    activeStage.phaseKind === 'ASSEMBLY'
      ? 'ASSEMBLY'
      : activeStage.phaseKind === 'LACQUER'
        ? m.id === 'steel-atrium-pavilion'
          ? 'COATING'
          : 'LACQUER'
        : 'SECTION A-A';

  const stepProgressPct = Math.min(100, (completedSteps / Math.max(1, pkg.steps.length)) * 100);

  const dateStr = now
    .toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    .toUpperCase();
  const timeStr = now.toTimeString().slice(0, 8);

  return (
    <header className="h-[54px] w-full flex items-center justify-between px-2 gap-3 shrink-0">
      {/* Left Brand Cluster */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setActiveDrawer('MODEL')}
          title="Switch Architectural Model [1]"
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/5 transition cursor-pointer shrink-0"
        >
          <svg viewBox="0 0 36 36" className="w-8 h-8">
            <line x1="18" y1="2" x2="18" y2="8" stroke="#BD312B" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 13 Q18 9 28 13" fill="none" stroke="#BD312B" strokeWidth="2" strokeLinecap="round" />
            <rect x="12" y="13" width="12" height="4" fill="none" stroke="#BD312B" strokeWidth="1.6" />
            <path d="M6 21 Q18 16 30 21" fill="none" stroke="#BD312B" strokeWidth="2" strokeLinecap="round" />
            <rect x="10" y="21" width="16" height="5" fill="none" stroke="#BD312B" strokeWidth="1.6" />
            <path d="M4 29 Q18 24 32 29" fill="none" stroke="#BD312B" strokeWidth="2" strokeLinecap="round" />
            <rect x="16" y="29" width="4" height="4" fill="none" stroke="#1E1508" strokeWidth="1.5" />
            <line x1="5" y1="33.5" x2="31" y2="33.5" stroke="#1E1508" strokeWidth="1.8" />
          </svg>
        </button>

        <div className="leading-none">
          <div className="font-display-brand text-[23px] font-bold tracking-[0.04em] flex items-center gap-1.5">
            <span className="text-[#1E1508]">{m.brandPrefix}</span>
            <span className="text-[#BD312B]">{m.brandSuffix}</span>
          </div>
          <div className="text-[8.5px] text-[#6F6559] tracking-[0.21em] uppercase mt-0.5 truncate">
            {m.headerSubtitle}
          </div>
        </div>
      </div>

      {/* Center Architectural Stamp Strip (Elevation Schematic + Section Symbol + Compass + Mini Revision Table) */}
      <div className="hidden xl:flex items-center gap-4 text-[#6F6559] shrink-0">
        {/* Mini Dynamic SVG Elevation */}
        <div className="flex items-end gap-1.5">
          <span className="text-[8px] tracking-[0.12em] text-[#8A7F72] mb-0.5">
            ELEV. S · 1:200
          </span>
          <svg viewBox="0 0 88 44" className="w-[88px] h-[42px] overflow-visible">
            {/* Ground baseline ticks */}
            <line x1="2" y1="40" x2="72" y2="40" stroke="#4A4137" strokeWidth="0.9" />
            {[8, 24, 40, 56].map((tx) => (
              <line key={tx} x1={tx} y1="38" x2={tx} y2="42" stroke="#4A4137" strokeWidth="0.8" />
            ))}
            {/* Dynamic Silhouette Lines */}
            {m.silhouetteLines.map((ln, idx) => {
              const x1 = 10 + ln.x1 * 48;
              const x2 = 10 + ln.x2 * 48;
              const y1 = 40 - (ln.y1 / Math.max(1, m.totalHeight)) * 34;
              const y2 = 40 - (ln.y2 / Math.max(1, m.totalHeight)) * 34;
              return (
                <line
                  key={idx}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#3E352B"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
              );
            })}
            {/* Total Height Red Dimension */}
            <line x1="65" y1="6" x2="65" y2="40" stroke="#BD312B" strokeWidth="0.9" strokeDasharray="2 1.5" />
            <line x1="63" y1="6" x2="67" y2="6" stroke="#BD312B" strokeWidth="0.9" />
            <line x1="63" y1="40" x2="67" y2="40" stroke="#BD312B" strokeWidth="0.9" />
          </svg>
          <span className="text-[8.5px] text-[#BD312B] font-medium mb-3">
            H {m.totalHeight.toFixed(2)}
          </span>
        </div>

        {/* Clickable Architectural Section Callout Mark (A / A-108) */}
        <button
          onClick={toggleQuickSection}
          title="Toggle Section A-A Cut [S]"
          className="flex items-center gap-1.5 group cursor-pointer"
        >
          <div className="w-5 h-[1px] bg-[#BD312B]" />
          <div className="relative w-7 h-7 rounded-full border border-[#3E352B] flex flex-col items-center justify-center bg-[#FAF8F3] group-hover:border-[#BD312B] transition">
            <span className="text-[8px] font-bold text-[#1E1508] leading-none">A</span>
            <div className="w-full h-[0.8px] bg-[#3E352B] my-[1px]" />
            <span className="text-[6.5px] text-[#BD312B] leading-none">A-108</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-[1.2px] bg-[#BD312B]" />
            <div className="w-0 h-0 border-y-[3.5px] border-y-transparent border-l-[5px] border-l-[#BD312B]" />
          </div>
        </button>

        {/* Live Rotating North Compass Rose */}
        <div className="flex flex-col items-center">
          <span className="text-[7.5px] font-bold text-[#1E1508] leading-none mb-0.5">N</span>
          <svg
            viewBox="0 0 28 28"
            className="w-6 h-6 transition-transform duration-150"
            style={{ transform: `rotate(${-cameraAz + 210}deg)` }}
          >
            <circle cx="14" cy="14" r="10" fill="none" stroke="#3E352B" strokeWidth="0.9" />
            <line x1="2" y1="14" x2="26" y2="14" stroke="#3E352B" strokeWidth="0.8" />
            <polygon points="14,2 11.2,14 14,14" fill="#1E1508" />
            <polygon points="14,2 16.8,14 14,14" fill="none" stroke="#1E1508" strokeWidth="0.8" />
            <polygon points="14,26 11.5,14 16.5,14" fill="none" stroke="#3E352B" strokeWidth="0.8" />
          </svg>
        </div>

        {/* Mini Drawing Revision Stamp Box */}
        <div className="border border-[#7A7064] text-[7px] leading-tight grid grid-cols-[30px_54px] bg-[#FAF8F3]/70">
          <div className="px-1 py-[1.5px] border-b border-r border-[#7A7064]/60 text-[#7A7064]">DWG</div>
          <div className="px-1 py-[1.5px] border-b border-[#7A7064]/60 text-[#1E1508] font-medium">{m.dwgCode}</div>
          <div className="px-1 py-[1.5px] border-b border-r border-[#7A7064]/60 text-[#7A7064]">REV</div>
          <div className="px-1 py-[1.5px] border-b border-[#7A7064]/60 text-[#BD312B] truncate">{m.revision}</div>
          <div className="px-1 py-[1.5px] border-r border-[#7A7064]/60 text-[#7A7064]">SHEET</div>
          <div className="px-1 py-[1.5px] text-[#1E1508]">{activeStage.sheetCode}</div>
        </div>
      </div>

      {/* Right Live Telemetry & Status Pill Card */}
      <div className="h-[46px] bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 flex items-center gap-3.5 shadow-[0_1px_3px_rgba(30,21,8,0.04)] shrink-0">
        <div className="w-7 h-7 rounded-lg border border-[#DDD5C7] bg-[#F4F0E9] flex items-center justify-center text-[#1E1508]">
          <svg viewBox="0 0 20 20" className="w-4 h-4">
            <path d="M4 8 L10 5 L16 8 M5 12 L15 12 M4 15.5 L16 15.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        <div className="min-w-[148px]">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display-brand text-[11px] font-bold tracking-[0.06em] text-[#1E1508]">
              {phaseTitle}
            </span>
          </div>
          <div className="text-[9px] text-[#6F6559] tracking-tight mt-[1px]">
            STEP {String(completedSteps).padStart(3, '0')}/{pkg.steps.length} · {formatSpacedInt(placedPieces)} PCS
          </div>
          <div className="w-full h-[3px] bg-[#E5DDD0] rounded-full mt-1 overflow-hidden">
            <div
              className="h-full bg-[#BD312B] rounded-full transition-all duration-100"
              style={{ width: `${stepProgressPct}%` }}
            />
          </div>
        </div>

        <div className="text-[12px] font-bold text-[#1E1508] pl-1">
          {activeStage.index + 1}
          <span className="text-[#8A7F72] font-normal">/{m.stages.length}</span>
        </div>

        <div className="h-7 w-[1px] bg-[#E4DDD0]" />

        {/* Live Clock & 60 FPS Indicator */}
        <div className="text-right leading-tight min-w-[82px]">
          <div className="text-[8px] text-[#6F6559] tracking-[0.08em]">{dateStr}</div>
          <div className="text-[13px] font-semibold text-[#1E1508] tracking-tight">{timeStr}</div>
          <div className="text-[8px] text-[#BD312B] font-medium flex items-center justify-end gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#BD312B] animate-pulse" />
            <span>LIVE · {gpuFps} FPS</span>
          </div>
        </div>

        {/* Tilted Japanese Hanko Project Stamp Badge */}
        <button
          onClick={() => setActiveDrawer('MODEL')}
          title="Open Model Library & GLB Importer [1]"
          className="w-7 h-7 rounded-md border-[1.5px] border-[#BD312B] bg-[#FFFDFB] flex items-center justify-center text-[10px] font-bold text-[#BD312B] -rotate-3 hover:rotate-0 hover:bg-[#FCECEB] transition cursor-pointer shadow-[inset_0_0_0_1px_rgba(189,49,43,0.18)]"
        >
          {m.monogram}
        </button>
      </div>
    </header>
  );
};
