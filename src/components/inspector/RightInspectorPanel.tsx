import React, { useMemo, useState } from 'react';
import { Download, Pause, Play, X, Search } from 'lucide-react';
import { useAppStore, deriveBuildLogsAtTime } from '@/store/useAppStore';
import { useI18nStore } from '@/store/useI18nStore';
import { formatSpacedInt } from '@/core/math/drawingMath';

export const RightInspectorPanel: React.FC = () => {
  const pkg = useAppStore((s) => s.currentPackage);
  const currentTime = useAppStore((s) => s.currentTime);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const inspectorTab = useAppStore((s) => s.inspectorTab);
  const logCollapsed = useAppStore((s) => s.logCollapsed);
  const gpu = useAppStore((s) => s.gpuStats);
  const highlightStep = useAppStore((s) => s.highlightStep);

  const togglePlay = useAppStore((s) => s.togglePlay);
  const setInspectorTab = useAppStore((s) => s.setInspectorTab);
  const toggleLogCollapsed = useAppStore((s) => s.toggleLogCollapsed);
  const setCurrentTime = useAppStore((s) => s.setCurrentTime);
  const setHighlightStep = useAppStore((s) => s.setHighlightStep);

  const t = useI18nStore((s) => s.t);
  const [memberSearch, setMemberSearch] = useState('');

  const m = pkg.manifest;

  const activeStage =
    m.stages.find((st) => currentTime >= st.startTime && currentTime < st.endTime) ??
    m.stages[m.stages.length - 1];

  // Find active assembly step & cumulative metrics
  const { activeStep, placedStepCount, cumulativeMassKg, groupCompletedMap } = useMemo(() => {
    let curStep = pkg.steps[0];
    let count = 0;
    let mass = 0;
    const grpMap: Record<string, number> = {};

    for (const s of pkg.steps) {
      if (currentTime >= s.startTime) {
        curStep = s;
        count = s.stepIndex;
        mass = s.cumulativeMassKg;
        grpMap[s.structureGroupId] = (grpMap[s.structureGroupId] || 0) + 1;
      } else {
        break;
      }
    }
    return {
      activeStep: curStep,
      placedStepCount: count,
      cumulativeMassKg: mass,
      groupCompletedMap: grpMap,
    };
  }, [pkg, currentTime]);

  const activeSpecialOp = useMemo(() => {
    if (currentTime < m.paintStartTime) return null;
    return (
      m.specialOperations.find(
        (op) => currentTime >= op.startTime && currentTime <= op.endTime
      ) ?? m.specialOperations[m.specialOperations.length - 1] ?? null
    );
  }, [m, currentTime]);

  const logs = useMemo(
    () => deriveBuildLogsAtTime(pkg, currentTime, gpu),
    [pkg, currentTime, gpu]
  );

  // Determine operation status badge & table fields
  const isLowering =
    activeStep &&
    currentTime >= activeStep.startTime &&
    currentTime < activeStep.startTime + activeStep.duration + 0.04 &&
    currentTime < m.paintStartTime;

  let motionBadge = 'PLACED ✓';
  if (activeStage.phaseKind === 'SECTION') {
    motionBadge = 'CUT · FLY-THROUGH';
  } else if (activeStage.phaseKind === 'LACQUER') {
    motionBadge = 'WASH ▲';
  } else if (isLowering) {
    motionBadge = 'LOWERING ▾';
  }

  const opMember = activeSpecialOp ? activeSpecialOp.title : activeStep?.title ?? '—';
  const opStepCode = activeSpecialOp
    ? activeSpecialOp.stepCode
    : `#${String(activeStep?.stepIndex ?? 1).padStart(3, '0')} / ${pkg.steps.length}`;
  const opStageCode = activeSpecialOp
    ? activeSpecialOp.stageLabel
    : `0${(activeStep?.stageIndex ?? 0) + 1} · ${m.stages[activeStep?.stageIndex ?? 0]?.shortCode ?? ''}`;
  const opQty = activeSpecialOp
    ? activeSpecialOp.quantityLabel
    : `${activeStep?.pieceCount ?? 0} pcs · ${activeStep?.sku ?? ''}`;
  const opMaterial = activeSpecialOp
    ? activeSpecialOp.materialLabel
    : activeStep?.materialLabel ?? '—';
  const opSpec = activeSpecialOp
    ? activeSpecialOp.specification
    : activeStep?.specification ?? '—';
  const opCoords = (activeSpecialOp ? activeSpecialOp.centroid : activeStep?.centroid) ?? [0, 0, 0];
  const opMass = activeSpecialOp
    ? activeSpecialOp.massLabel
    : activeStep && activeStep.massKg > 0
      ? activeStep.massKg >= 1000
        ? `≈ ${(activeStep.massKg / 1000).toFixed(2)} t`
        : `≈ ${activeStep.massKg} kg`
      : '—';

  const structurePct = Math.round((placedStepCount / Math.max(1, pkg.steps.length)) * 100);
  const structureTonnes = (cumulativeMassKg / 1000).toFixed(1);

  const logBadgeText =
    activeStage.phaseKind === 'ASSEMBLY'
      ? 'ASSEMBLING'
      : activeStage.phaseKind === 'LACQUER'
        ? 'LACQUERING'
        : 'SECTION A-A';

  // Export Bill of Materials & Build Sequence JSON
  const handleExportBom = () => {
    const payload = {
      manifest: {
        dwgCode: m.dwgCode,
        title: m.drawingTitle,
        totalHeightMeters: m.totalHeight,
        totalSteps: pkg.steps.length,
        totalPieces: pkg.totalPieces,
        totalMassTonnes: pkg.totalMassTonnes,
      },
      steps: pkg.steps,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${m.dwgCode.toLowerCase()}-build-sequence-bom.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return pkg.steps;
    return pkg.steps.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.sku.toLowerCase().includes(q) ||
        s.materialLabel.toLowerCase().includes(q)
    );
  }, [pkg.steps, memberSearch]);

  return (
    <aside className="w-[336px] h-full bg-[#FAF8F4]/95 border border-[#DDD5C7] rounded-xl p-3 flex flex-col gap-2.5 shadow-[0_1px_3px_rgba(30,21,8,0.04)] overflow-hidden shrink-0">
      {/* Panel Header */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <h2 className="font-display-brand text-[12px] font-bold tracking-[0.06em] text-[#1E1508] truncate">
          {t.buildSequence}
        </h2>

        {/* Segmented Sequence / Members Tab Switcher */}
        <div className="bg-[#EDE7DC] p-[2px] rounded-lg flex items-center text-[9.5px] font-medium shrink-0">
          <button
            onClick={() => setInspectorTab('SEQUENCE')}
            className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
              inspectorTab === 'SEQUENCE'
                ? 'bg-[#FFFFFB] text-[#BD312B] font-semibold shadow-2xs'
                : 'text-[#6F6559] hover:text-[#1E1508]'
            }`}
          >
            {t.sequenceTab}
          </button>
          <button
            onClick={() => setInspectorTab('MEMBERS')}
            className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
              inspectorTab === 'MEMBERS'
                ? 'bg-[#FFFFFB] text-[#BD312B] font-semibold shadow-2xs'
                : 'text-[#6F6559] hover:text-[#1E1508]'
            }`}
          >
            {t.membersTab}
          </button>
        </div>

        {/* Export BOM & Quick Pause/Play Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleExportBom}
            title="Export Build Sequence & BOM (.json)"
            className="w-6 h-6 rounded-md border border-[#DDD5C7] bg-[#FFFFFB] flex items-center justify-center text-[#1E1508] hover:border-[#BD312B] transition cursor-pointer"
          >
            <Download className="w-3 h-3" />
          </button>
          <button
            onClick={togglePlay}
            title="Play / Pause Sequence [Space]"
            className="w-6 h-6 rounded-md bg-[#BD312B] text-white flex items-center justify-center hover:bg-[#9E2520] transition cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-3 h-3 fill-current" />
            ) : (
              <Play className="w-3 h-3 fill-current" />
            )}
          </button>
        </div>
      </div>

      {/* Sub-header Summary Line */}
      <div className="text-[9px] text-[#6F6559] pb-1.5 border-b border-[#E5DDD0] shrink-0">
        <span>{m.dwgCode} ▸ </span>
        <span className="text-[#BD312B] font-semibold">Assembly</span>
        <span>
          {' '}
          · {pkg.steps.length} steps · {formatSpacedInt(pkg.totalPieces)} parts
        </span>
      </div>

      {inspectorTab === 'MEMBERS' ? (
        /* Interactive Searchable Members / BOM Tab */
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          <div className="relative shrink-0">
            <Search className="w-3.5 h-3.5 text-[#8A7F72] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Filter step, SKU, material..."
              className="w-full h-7 pl-8 pr-2 rounded-lg border border-[#DDD5C7] bg-[#FFFFFB] text-[10px] text-[#1E1508] focus:outline-none focus:border-[#BD312B]"
            />
          </div>

          <div
            className="flex-1 overflow-y-auto space-y-1 pr-0.5"
            onMouseLeave={() => setHighlightStep(0)}
          >
            {filteredMembers.map((step) => {
              const isPlaced = currentTime >= step.startTime;
              const isSelected = highlightStep === step.stepIndex;
              return (
                <button
                  key={step.stepIndex}
                  onMouseEnter={() => setHighlightStep(step.stepIndex)}
                  onClick={() => setCurrentTime(step.startTime + 0.05)}
                  className={`w-full text-left p-2 rounded-lg border transition cursor-pointer ${
                    isSelected
                      ? 'border-[#BD312B] bg-[#FCECEB]/65'
                      : isPlaced
                        ? 'border-[#E5DDD0] bg-[#FFFFFB] hover:border-[#BD312B]/50'
                        : 'border-transparent bg-[#F3EFE7]/60 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between text-[8.5px]">
                    <span className="font-bold text-[#BD312B]">
                      #{String(step.stepIndex).padStart(3, '0')} · {step.sku}
                    </span>
                    <span className="text-[#6F6559]">{step.startTime.toFixed(2)}s</span>
                  </div>
                  <div className="text-[9.5px] font-bold text-[#1E1508] truncate mt-0.5">
                    {step.title}
                  </div>
                  <div className="flex items-center justify-between text-[8px] text-[#6F6559] mt-0.5">
                    <span>
                      {step.pieceCount} pcs · {step.materialLabel}
                    </span>
                    <span>
                      {step.massKg >= 1000
                        ? `${(step.massKg / 1000).toFixed(2)} t`
                        : `${step.massKg} kg`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Main Live Sequence Inspector Tab */
        <div className="flex-1 flex flex-col justify-between gap-2 min-h-0 overflow-y-auto pr-0.5">
          {/* 1. STAGE TIMELINE (Stepped Segmented Gantt + Vertical Sweeping Playhead) */}
          <div className="shrink-0">
            <div className="flex items-center justify-between text-[8.5px] mb-1">
              <span className="font-display-brand font-bold tracking-[0.08em] text-[#1E1508]">
                {t.stageTimeline}
              </span>
              <span className="text-[#6F6559]">
                {currentTime.toFixed(1)} / {m.sequenceDuration.toFixed(1)} s
              </span>
            </div>

            <div className="bg-[#F5F1E9] border border-[#E5DDD0] rounded-lg px-2 py-1.5 relative">
              {/* Sweeping Vertical Playhead inside the Gantt Plot Area */}
              <div className="relative">
                <div
                  className="absolute top-0 bottom-0 pointer-events-none z-10"
                  style={{
                    left: `calc(62px + ${(currentTime / m.sequenceDuration).toFixed(4)} * (100% - 96px))`,
                  }}
                >
                  <div className="w-0 h-0 -ml-[3px] border-x-[3.5px] border-x-transparent border-t-[4.5px] border-t-[#BD312B]" />
                  <div className="w-[1.2px] h-full bg-[#BD312B]" />
                </div>

                <div className="space-y-[3px]">
                  {m.stages.map((st) => {
                    const isRowActive = activeStage.index === st.index;
                    const span = Math.max(0.1, st.endTime - st.startTime);
                    const pct = Math.round(
                      Math.max(0, Math.min(1, (currentTime - st.startTime) / span)) * 100
                    );
                    const startFrac = st.startTime / m.sequenceDuration;
                    const widthFrac = span / m.sequenceDuration;
                    const segCount = Math.max(5, Math.min(10, Math.round(widthFrac * 42)));

                    return (
                      <button
                        key={st.id}
                        onClick={() => setCurrentTime(st.startTime + 0.02)}
                        className="w-full flex items-center text-[8px] leading-none hover:bg-black/[0.03] rounded py-[1.5px] cursor-pointer"
                      >
                        <span
                          className={`w-[62px] text-left truncate ${
                            isRowActive
                              ? 'text-[#BD312B] font-bold'
                              : 'text-[#5E5448] font-medium'
                          }`}
                        >
                          {st.ganttLabel}
                        </span>

                        {/* Segmented Staggered Gantt Track */}
                        <div className="flex-1 h-[7px] relative">
                          <div
                            className="absolute top-0 bottom-0 flex gap-[1px]"
                            style={{
                              left: `${startFrac * 100}%`,
                              width: `${Math.max(7, widthFrac * 100)}%`,
                            }}
                          >
                            {Array.from({ length: segCount }).map((_, sIdx) => {
                              const segDone = ((sIdx + 0.5) / segCount) * 100 <= pct;
                              return (
                                <span
                                  key={sIdx}
                                  className={`flex-1 rounded-[1px] ${
                                    segDone ? 'bg-[#BD312B]' : 'bg-[#E9C5C3]/80'
                                  }`}
                                />
                              );
                            })}
                          </div>
                        </div>

                        <span
                          className={`w-[32px] text-right ${
                            isRowActive ? 'text-[#1E1508] font-semibold' : 'text-[#7A7064]'
                          }`}
                        >
                          {pct}%
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 2. ACTIVE OPERATION (Live BIM Property Card) */}
          <div className="shrink-0">
            <div className="flex items-center justify-between text-[8.5px] mb-1">
              <span className="font-display-brand font-bold tracking-[0.08em] text-[#1E1508]">
                {t.activeOperation}
              </span>
              <span className="text-[7.5px] tracking-[0.08em] text-[#6F6559] font-semibold">
                {motionBadge}
              </span>
            </div>

            <div className="bg-[#FFFFFB] border border-[#E2D9CC] rounded-lg divide-y divide-[#EAE2D6] text-[9px]">
              <div className="px-2.5 py-1.5">
                <div className="text-[6.5px] tracking-[0.1em] text-[#8A7F72] uppercase">
                  {t.member}
                </div>
                <div className="font-editorial text-[11px] font-bold text-[#1E1508] truncate mt-[1px]">
                  {opMember}
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-[#EAE2D6]">
                <div className="px-2.5 py-1">
                  <div className="text-[6.5px] tracking-[0.1em] text-[#8A7F72] uppercase">
                    {t.step}
                  </div>
                  <div className="text-[#BD312B] font-semibold mt-[1px]">{opStepCode}</div>
                </div>
                <div className="px-2.5 py-1">
                  <div className="text-[6.5px] tracking-[0.1em] text-[#8A7F72] uppercase">
                    {t.stage}
                  </div>
                  <div className="text-[#1E1508] font-semibold mt-[1px] truncate">
                    {opStageCode}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-[#EAE2D6]">
                <div className="px-2.5 py-1">
                  <div className="text-[6.5px] tracking-[0.1em] text-[#8A7F72] uppercase">
                    {t.quantity}
                  </div>
                  <div className="text-[#1E1508] font-semibold mt-[1px] truncate">{opQty}</div>
                </div>
                <div className="px-2.5 py-1">
                  <div className="text-[6.5px] tracking-[0.1em] text-[#8A7F72] uppercase">
                    {t.material}
                  </div>
                  <div className="text-[#1E1508] font-semibold mt-[1px] truncate">
                    {opMaterial}
                  </div>
                </div>
              </div>

              <div className="px-2.5 py-1">
                <div className="text-[6.5px] tracking-[0.1em] text-[#8A7F72] uppercase">
                  {t.specification}
                </div>
                <div className="text-[8.5px] text-[#1E1508] font-medium truncate mt-[1px]">
                  {opSpec}
                </div>
              </div>

              <div className="grid grid-cols-[1.25fr_0.75fr] divide-x divide-[#EAE2D6]">
                <div className="px-2.5 py-1">
                  <div className="text-[6.5px] tracking-[0.1em] text-[#8A7F72] uppercase">
                    {t.placedAt}
                  </div>
                  <div className="text-[#1E1508] font-semibold mt-[1px]">
                    {opCoords[0].toFixed(2)} · {opCoords[1].toFixed(2)} · {opCoords[2].toFixed(2)}
                  </div>
                </div>
                <div className="px-2.5 py-1">
                  <div className="text-[6.5px] tracking-[0.1em] text-[#8A7F72] uppercase">
                    {t.estMass}
                  </div>
                  <div className="text-[#1E1508] font-semibold mt-[1px]">{opMass}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. STRUCTURE (Stepped Architectural Silhouette Pyramid + Cumulative Mass) */}
          <div className="shrink-0">
            <div className="flex items-center justify-between text-[8.5px] mb-1">
              <span className="font-display-brand font-bold tracking-[0.08em] text-[#1E1508]">
                {t.structure}
              </span>
              <span className="text-[#6F6559] font-medium">
                {structurePct} % · {structureTonnes} t
              </span>
            </div>

            <div className="space-y-[3px]">
              {m.structureGroups.map((grp) => {
                const done = groupCompletedMap[grp.id] || 0;
                const total = Math.max(1, grp.totalSteps);
                const fillPct = Math.min(100, (done / total) * 100);
                const isCurrentGrp = activeStep?.structureGroupId === grp.id && currentTime < m.paintStartTime;

                return (
                  <div key={grp.id} className="flex items-center gap-2 text-[8px]">
                    {/* Centered Stepped Pyramid Bar */}
                    <div className="w-[106px] flex justify-center">
                      <div
                        style={{ width: `${Math.round(grp.widthRatio * 100)}%` }}
                        className="h-[8px] rounded-[2px] border border-[#CFC6B6] bg-[#F3EFE7] overflow-hidden"
                      >
                        <div
                          className="h-full bg-[#BD312B] transition-all duration-100"
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                    </div>

                    <span
                      className={`w-[56px] font-semibold truncate ${
                        isCurrentGrp ? 'text-[#BD312B]' : 'text-[#1E1508]'
                      }`}
                    >
                      {grp.label}
                    </span>

                    <div className="flex-1 border-b border-dotted border-[#D8CFC0]" />

                    <span
                      className={`text-right min-w-[38px] ${
                        isCurrentGrp ? 'text-[#BD312B] font-bold' : 'text-[#6F6559]'
                      }`}
                    >
                      {done} / {grp.totalSteps}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. BUILD LOG (Real-time Engineering Console) */}
          <div className="pt-1 border-t border-[#E5DDD0] flex flex-col min-h-[96px]">
            <div className="flex items-center justify-between gap-1.5 mb-1 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="font-display-brand text-[8.5px] font-bold tracking-[0.08em] text-[#1E1508]">
                  {t.buildLog}
                </span>
                <span className="px-1.5 py-[1px] rounded bg-[#BD312B] text-white text-[7px] font-bold tracking-[0.08em]">
                  {logBadgeText}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-end gap-[1px] h-2">
                  {[2, 4, 3, 6, 4, 7, 3, 5, 2, 6, 4, 3].map((h, idx) => (
                    <span
                      key={idx}
                      className="w-[1.5px] bg-[#C8BDAC]"
                      style={{ height: isPlaying ? ((idx + Math.floor(currentTime * 5)) % 6) + 2 : h * 0.5 }}
                    />
                  ))}
                </div>
                <button
                  onClick={toggleLogCollapsed}
                  title="Collapse / Expand Build Log"
                  className="w-4 h-4 rounded border border-[#DDD5C7] bg-[#FFFFFB] flex items-center justify-center text-[#5E5448] hover:border-[#BD312B] cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>

            {!logCollapsed && (
              <div className="flex-1 overflow-y-auto text-[7.8px] leading-[1.45] text-[#4E453A] space-y-[1px] font-tech">
                {logs.map((entry, idx) => {
                  const isNewest = idx === logs.length - 1;
                  return (
                    <div
                      key={entry.id}
                      className={`truncate ${
                        entry.kind === 'STAGE' || entry.kind === 'CHK'
                          ? 'text-[#1E1508] font-semibold'
                          : entry.kind === 'PERF'
                            ? 'text-[#8A7F72]'
                            : isNewest
                              ? 'text-[#1E1508] font-medium'
                              : 'text-[#5E5448]'
                      }`}
                    >
                      <span className="text-[#8A7F72]">
                        [{entry.timeSec.toFixed(2).padStart(5, '0')}]
                      </span>{' '}
                      {entry.text}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
