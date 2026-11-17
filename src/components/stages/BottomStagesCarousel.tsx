import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useI18nStore } from '@/store/useI18nStore';

export const BottomStagesCarousel: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const pkg = useAppStore((s) => s.currentPackage);
  const stageThumbnails = useAppStore((s) => s.stageThumbnails);
  const currentTime = useAppStore((s) => s.currentTime);
  const jumpToStage = useAppStore((s) => s.jumpToStage);
  const t = useI18nStore((s) => s.t);

  const m = pkg.manifest;
  const activeStage =
    m.stages.find((st) => currentTime >= st.startTime && currentTime < st.endTime) ??
    m.stages[m.stages.length - 1];

  const scrollByCards = (dir: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: dir * 280, behavior: 'smooth' });
  };

  return (
    <footer className="h-[124px] w-full flex flex-col justify-between px-1 shrink-0 select-none">
      {/* Strip Header & Line Legend */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display-brand text-[11px] font-bold tracking-[0.08em] text-[#1E1508]">
            {t.stages}
          </span>
          <span className="text-[8.5px] tracking-[0.09em] text-[#7A7064] uppercase">
            {m.stages.length} STAGES · {pkg.steps.length} STEPS · {Math.round(m.sequenceDuration)} SEC SEQUENCE
          </span>
        </div>

        <div className="flex items-center gap-3.5 text-[8px] tracking-[0.09em] text-[#5E5448] font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-[1.5px] bg-[#1E1508]" />
            {t.placed}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-[1.5px] bg-[#BD312B]" />
            {t.active}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-[1.5px] border-t border-dashed border-[#D16B66]" />
            {t.ghost}
          </span>
        </div>
      </div>

      {/* 8-Card 3D Rendered Storyboard Strip with Circular Left/Right Arrows */}
      <div className="relative flex items-center gap-2 h-[98px]">
        <button
          onClick={() => scrollByCards(-1)}
          aria-label="Scroll stages left"
          className="w-7 h-7 rounded-full border border-[#DFD8CA] bg-[#FFFFFB] flex items-center justify-center text-[#1E1508] hover:border-[#BD312B] transition cursor-pointer shrink-0 shadow-[0_1px_3px_rgba(30,21,8,0.06)]"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div
          ref={scrollRef}
          className="flex-1 h-full grid grid-cols-8 gap-2.5 overflow-x-auto no-scrollbar py-[1px]"
        >
          {m.stages.map((st, idx) => {
            const isCurrent = activeStage.index === st.index;
            const isCompleted = currentTime >= st.endTime;
            const span = Math.max(0.1, st.endTime - st.startTime);
            const progressPct = Math.max(
              0,
              Math.min(100, ((currentTime - st.startTime) / span) * 100)
            );
            const thumbUrl = stageThumbnails[idx];

            return (
              <button
                key={st.id}
                onClick={() => jumpToStage(st.index)}
                className={`group min-w-[132px] h-full rounded-[11px] overflow-hidden flex flex-col justify-between text-left transition-all duration-150 cursor-pointer relative ${
                  isCurrent
                    ? 'border-[1.5px] border-[#BD312B] bg-[#FBF2F0] shadow-[0_3px_10px_rgba(189,49,43,0.12)]'
                    : 'border border-[#DFD8CA] bg-[#F8F5EE] hover:border-[#BD312B]/60 hover:bg-[#FAF7F1]'
                }`}
              >
                {/* Real Offscreen-Rendered 3D Architectural Snapshot over Fine Blueprint Grid */}
                <div className="relative h-[58px] w-full stage-thumb-grid border-b border-[#EAE2D6] overflow-hidden shrink-0">
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={st.cardTitle}
                      className="w-full h-full object-cover object-center select-none pointer-events-none group-hover:scale-[1.03] transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px] text-[#9A8F80]">
                      RENDERING...
                    </div>
                  )}

                  {/* Top-Left Start Timestamp Pill */}
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-[1px] rounded-[4px] bg-[#FFFFFB]/92 backdrop-blur-[1px] border border-[#DFD8CA] text-[7.8px] font-semibold text-[#1E1508] leading-tight shadow-[0_1px_2px_rgba(30,21,8,0.05)]">
                    {st.startTime.toFixed(1)}s
                  </span>

                  {/* Top-Right Sheet Code Pill */}
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-[1px] rounded-[4px] bg-[#FFFFFB]/94 backdrop-blur-[1px] border border-[#D89B98] text-[7.2px] font-bold text-[#A8322C] leading-tight shadow-[0_1px_2px_rgba(30,21,8,0.05)]">
                    {st.sheetCode}
                  </span>
                </div>

                {/* Stage Title & Sub-Spec Caption */}
                <div className="px-2.5 py-1 flex-1 flex flex-col justify-center min-w-0">
                  <div
                    className={`font-display-brand text-[9.2px] font-bold tracking-[0.025em] truncate leading-tight ${
                      isCurrent ? 'text-[#BD312B]' : 'text-[#1E1508]'
                    }`}
                  >
                    {st.cardTitle}
                  </div>
                  <div className="text-[7.6px] text-[#7A7064] truncate mt-[2px] leading-tight">
                    {st.cardSubtitle}
                  </div>
                </div>

                {/* Bottom Card Progress Bar (Full on Completed, Live % on Active) */}
                <div className="h-[2.5px] w-full bg-transparent shrink-0">
                  {(isCompleted || isCurrent) && (
                    <div
                      className="h-full bg-[#BD312B] transition-all duration-100"
                      style={{ width: isCompleted ? '100%' : `${progressPct}%` }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => scrollByCards(1)}
          aria-label="Scroll stages right"
          className="w-7 h-7 rounded-full border border-[#DFD8CA] bg-[#FFFFFB] flex items-center justify-center text-[#1E1508] hover:border-[#BD312B] transition cursor-pointer shrink-0 shadow-[0_1px_3px_rgba(30,21,8,0.06)]"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  );
};
