import React, { useEffect } from 'react';
import { TopHeaderBar } from '@/components/header/TopHeaderBar';
import { LeftToolRail } from '@/components/rail/LeftToolRail';
import { ViewportContainer } from '@/components/viewport/ViewportContainer';
import { RightInspectorPanel } from '@/components/inspector/RightInspectorPanel';
import { BottomStagesCarousel } from '@/components/stages/BottomStagesCarousel';
import { ToolDrawersOverlay } from '@/components/drawers/ToolDrawersOverlay';
import { useAppStore } from '@/store/useAppStore';
import { useI18nStore } from '@/store/useI18nStore';
import { engineBridge } from '@/engine/engineBridge';

export const AppShell: React.FC = () => {
  // Global CAD Keyboard Shortcuts (Space, R, A, C, X, S, F, V, 1..7, Left/Right, Esc)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const store = useAppStore.getState();
      const key = e.key.toLowerCase();

      switch (key) {
        case ' ':
          e.preventDefault();
          store.togglePlay();
          break;
        case 'r':
          store.rebuildFromZero();
          break;
        case 'a':
          store.toggleAutoRotate();
          break;
        case 'c':
          store.toggleForceColor();
          break;
        case 'x':
          store.setRenderStyle(store.renderStyle === 'WIRE' ? 'INK_PAINT' : 'WIRE');
          break;
        case 's':
          store.toggleQuickSection();
          break;
        case 'f':
          store.cycleSpeed();
          break;
        case 'v':
          engineBridge.cycleCameraPreset();
          break;
        case 'g':
          store.toggleGhost();
          break;
        case 'arrowleft':
          e.preventDefault();
          store.stepBackward();
          break;
        case 'arrowright':
          e.preventDefault();
          store.stepForward();
          break;
        case '1':
          store.setActiveDrawer('MODEL');
          break;
        case '2':
          store.setActiveDrawer('LAYERS');
          break;
        case '3':
          store.setActiveDrawer('PARTS');
          break;
        case '4':
          store.setActiveDrawer('SECTION');
          break;
        case '5':
          store.setActiveDrawer('RENDER');
          break;
        case '6':
          store.setActiveDrawer('SETTINGS');
          break;
        case '7':
          useI18nStore.getState().cycleLanguage();
          break;
        case 'escape':
          store.setActiveDrawer('NONE');
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="w-screen h-screen app-shell-grid-bg p-2.5 flex flex-col gap-2 overflow-hidden">
      {/* Row 1: Top Architectural Header Bar */}
      <TopHeaderBar />

      {/* Row 2: 3-Column CAD Workspace (Left Rail + Center 3D Viewport + Right Build Sequence Inspector) */}
      <main className="flex-1 min-h-0 flex items-stretch gap-2.5">
        <LeftToolRail />
        <ViewportContainer />
        <RightInspectorPanel />
      </main>

      {/* Row 3: 8-Stage Storyboard Strip */}
      <BottomStagesCarousel />

      {/* Modal & Slide-out Tool Drawers */}
      <ToolDrawersOverlay />
    </div>
  );
};
