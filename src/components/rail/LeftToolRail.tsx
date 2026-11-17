import React from 'react';
import {
  Box,
  Layers,
  Grid2x2Plus,
  ScissorsLineDashed,
  CircleSlash2,
  SlidersHorizontal,
  Globe,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useI18nStore } from '@/store/useI18nStore';
import type { ActiveToolDrawer } from '@/core/types/project';

export const LeftToolRail: React.FC = () => {
  const pkg = useAppStore((s) => s.currentPackage);
  const activeDrawer = useAppStore((s) => s.activeDrawer);
  const setActiveDrawer = useAppStore((s) => s.setActiveDrawer);
  const renderStyle = useAppStore((s) => s.renderStyle);
  const gpu = useAppStore((s) => s.gpuStats);

  const lang = useI18nStore((s) => s.lang);
  const t = useI18nStore((s) => s.t);
  const cycleLanguage = useI18nStore((s) => s.cycleLanguage);

  const piecesShort =
    pkg.totalPieces >= 1000
      ? `${(pkg.totalPieces / 1000).toFixed(1)}K PCS`
      : `${pkg.totalPieces} PCS`;

  const renderShort =
    renderStyle === 'INK_PAINT'
      ? 'INK'
      : renderStyle;

  const tools: {
    keyNum: number;
    drawer: ActiveToolDrawer | 'LANG';
    label: string;
    sublabel: string;
    icon: React.ReactNode;
  }[] = [
    {
      keyNum: 1,
      drawer: 'MODEL',
      label: t.model,
      sublabel: pkg.manifest.categoryTag,
      icon: <Box className="w-4 h-4" />,
    },
    {
      keyNum: 2,
      drawer: 'LAYERS',
      label: t.layers,
      sublabel: `${pkg.manifest.stages.length} STAGES`,
      icon: <Layers className="w-4 h-4" />,
    },
    {
      keyNum: 3,
      drawer: 'PARTS',
      label: t.parts,
      sublabel: piecesShort,
      icon: <Grid2x2Plus className="w-4 h-4" />,
    },
    {
      keyNum: 4,
      drawer: 'SECTION',
      label: t.section,
      sublabel: 'A - A',
      icon: <ScissorsLineDashed className="w-4 h-4" />,
    },
    {
      keyNum: 5,
      drawer: 'RENDER',
      label: t.render,
      sublabel: renderShort,
      icon: <CircleSlash2 className="w-4 h-4" />,
    },
    {
      keyNum: 6,
      drawer: 'SETTINGS',
      label: t.settings,
      sublabel: `MSAA · ${gpu.resolutionScale.toFixed(1)}×`,
      icon: <SlidersHorizontal className="w-4 h-4" />,
    },
    {
      keyNum: 7,
      drawer: 'LANG',
      label: t.language,
      sublabel: lang,
      icon: <Globe className="w-4 h-4" />,
    },
  ];

  // Build SVG polyline points for live FPS sparkline
  const sparkPoints = gpu.fpsHistory
    .map((val, idx) => {
      const x = (idx / Math.max(1, gpu.fpsHistory.length - 1)) * 52;
      const clamped = Math.max(20, Math.min(65, val));
      const y = 14 - ((clamped - 20) / 45) * 12;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <aside className="w-[66px] h-full flex flex-col justify-between gap-2 shrink-0 select-none">
      {/* 7-Item Primary Tool Switcher Card */}
      <div className="bg-[#FAF8F4]/90 border border-[#DDD5C7] rounded-xl p-1 flex flex-col gap-1 shadow-[0_1px_3px_rgba(30,21,8,0.04)] overflow-y-auto">
        {tools.map((item) => {
          const isActive =
            item.drawer === 'MODEL'
              ? activeDrawer === 'MODEL' || activeDrawer === 'NONE'
              : activeDrawer === item.drawer;

          return (
            <button
              key={item.keyNum}
              onClick={() => {
                if (item.drawer === 'LANG') {
                  cycleLanguage();
                } else {
                  setActiveDrawer(item.drawer);
                }
              }}
              className={`relative group w-full py-1.5 px-1 rounded-lg flex flex-col items-center transition cursor-pointer ${
                isActive
                  ? 'bg-[#FFFFFB] border border-[#DDD5C7] shadow-xs'
                  : 'hover:bg-[#EFEAE0]/70 border border-transparent'
              }`}
            >
              {/* Left Crimson Active Indicator Strip */}
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-r bg-[#BD312B]" />
              )}

              {/* Shortcut Number Badge */}
              <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded text-[7.5px] border border-[#E2D9CC] bg-[#FAF8F4] text-[#8A7F72] flex items-center justify-center leading-none">
                {item.keyNum}
              </span>

              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                  isActive
                    ? 'bg-[#BD312B] text-white shadow-xs'
                    : 'bg-[#FAF8F4] border border-[#DDD5C7] text-[#2C2319] group-hover:border-[#BD312B]/50'
                }`}
              >
                {item.icon}
              </div>

              <span
                className={`text-[9.5px] font-medium mt-1 leading-tight ${
                  isActive ? 'text-[#BD312B] font-semibold' : 'text-[#1E1508]'
                }`}
              >
                {item.label}
              </span>
              <span className="text-[6.8px] text-[#7A7064] tracking-[0.04em] uppercase leading-tight mt-[1px] text-center whitespace-nowrap">
                {item.sublabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom GPU LIVE Telemetry Mini-Card */}
      <div className="bg-[#FAF8F4]/95 border border-[#DDD5C7] rounded-xl p-2 flex flex-col gap-1 shadow-[0_1px_3px_rgba(30,21,8,0.04)] shrink-0">
        <div className="flex items-center justify-between text-[7.5px] tracking-[0.08em]">
          <span className="text-[#7A7064] font-medium">GPU</span>
          <span className="text-[#BD312B] font-bold">LIVE</span>
        </div>

        <div className="flex items-baseline gap-1 leading-none">
          <span className="font-display-brand text-[19px] font-bold text-[#1E1508]">
            {gpu.fps}
          </span>
          <span className="text-[8px] text-[#7A7064]">FPS</span>
        </div>

        {/* Real-time FPS Sparkline */}
        <div className="w-full h-[16px] bg-[#F7ECEA]/70 rounded overflow-hidden">
          <svg viewBox="0 0 52 16" className="w-full h-full preserve-3d">
            <polyline
              fill="none"
              stroke="#BD312B"
              strokeWidth="1.3"
              points={sparkPoints}
            />
          </svg>
        </div>

        <div className="text-[7.5px] space-y-[2px] pt-0.5 text-[#6F6559]">
          <div className="flex justify-between">
            <span>DRAWS</span>
            <span className="text-[#1E1508] font-semibold">{gpu.drawCalls}</span>
          </div>
          <div className="flex justify-between">
            <span>TRIS</span>
            <span className="text-[#1E1508] font-semibold">
              {Math.round(gpu.triangles / 1000)}k
            </span>
          </div>
          <div className="flex justify-between">
            <span>RES</span>
            <span className="text-[#1E1508] font-semibold">
              {gpu.resolutionScale.toFixed(2)}×
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
