import React, { useRef, useState } from 'react';
import {
  X,
  Upload,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
  FileDown,
  Search,
  RotateCcw,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { BUILTIN_MODEL_CATALOG } from '@/models/catalog';
import {
  compileGlbBufferToProject,
  generateSampleGlbBlob,
  type OptionalSidecarManifest,
} from '@/core/compiler/AutoGlbCompiler';
import { soundEngine } from '@/engine/AudioEngine';
import type { RenderStyle } from '@/core/types/project';

export const ToolDrawersOverlay: React.FC = () => {
  const activeDrawer = useAppStore((s) => s.activeDrawer);
  const setActiveDrawer = useAppStore((s) => s.setActiveDrawer);

  if (activeDrawer === 'NONE') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-start pointer-events-none">
      {/* Backdrop click to close */}
      <div
        onClick={() => setActiveDrawer('NONE')}
        className="absolute inset-0 bg-[#1E1508]/20 backdrop-blur-[1.5px] pointer-events-auto"
      />

      {activeDrawer === 'MODEL' ? (
        <ModelLibraryModal onClose={() => setActiveDrawer('NONE')} />
      ) : (
        <div className="relative ml-[82px] w-[360px] max-h-[calc(100vh-185px)] bg-[#FAF8F4] border border-[#C8BDAC] rounded-xl shadow-[0_12px_36px_rgba(30,21,8,0.18)] p-4 flex flex-col pointer-events-auto overflow-hidden">
          {activeDrawer === 'LAYERS' && <LayersDrawer onClose={() => setActiveDrawer('NONE')} />}
          {activeDrawer === 'PARTS' && <PartsDrawer onClose={() => setActiveDrawer('NONE')} />}
          {activeDrawer === 'SECTION' && <SectionDrawer onClose={() => setActiveDrawer('NONE')} />}
          {activeDrawer === 'RENDER' && <RenderDrawer onClose={() => setActiveDrawer('NONE')} />}
          {activeDrawer === 'SETTINGS' && <SettingsDrawer onClose={() => setActiveDrawer('NONE')} />}
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * [1] MODEL LIBRARY & EXTERNAL .GLB/.GLTF IMPORTER MODAL
 * ============================================================================ */
const ModelLibraryModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const currentPkg = useAppStore((s) => s.currentPackage);
  const importedPackages = useAppStore((s) => s.importedPackages);
  const isImporting = useAppStore((s) => s.isImporting);
  const importError = useAppStore((s) => s.importError);
  const selectBuiltinModel = useAppStore((s) => s.selectBuiltinModel);
  const addAndSelectImportedPackage = useAppStore((s) => s.addAndSelectImportedPackage);
  const setImportStatus = useAppStore((s) => s.setImportStatus);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setImportStatus(true, null);

    try {
      const files = Array.from(fileList);
      const glbFile = files.find((f) => /\.(glb|gltf)$/i.test(f.name));
      const jsonFile = files.find((f) => /\.json$/i.test(f.name));

      if (!glbFile) {
        throw new Error('Vui lòng chọn ít nhất một file mô hình 3D định dạng .glb hoặc .gltf.');
      }

      let sidecar: OptionalSidecarManifest | undefined;
      if (jsonFile) {
        const rawJson = await jsonFile.text();
        sidecar = JSON.parse(rawJson) as OptionalSidecarManifest;
      }

      const buf = await glbFile.arrayBuffer();
      const compiled = await compileGlbBufferToProject(buf, glbFile.name, sidecar);
      addAndSelectImportedPackage(compiled);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to compile 3D model.';
      setImportStatus(false, msg);
    }
  };

  const handleDownloadSampleGlb = async () => {
    const blob = await generateSampleGlbBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-observation-tower.glb';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleInstantSampleGlbImport = async () => {
    setImportStatus(true, null);
    try {
      const blob = await generateSampleGlbBlob();
      const buf = await blob.arrayBuffer();
      const pkg = await compileGlbBufferToProject(buf, 'Observation_Watchtower.glb', {
        dwgCode: 'WT-04',
        monogram: 'WT',
        brandPrefix: 'TOWER',
        drawingTitle: 'Three-Tier Observation Tower',
      });
      addAndSelectImportedPackage(pkg);
    } catch (err) {
      setImportStatus(false, err instanceof Error ? err.message : 'Sample GLB test failed.');
    }
  };

  return (
    <div className="relative mx-auto w-[860px] max-w-[94vw] max-h-[86vh] bg-[#FAF8F4] border border-[#C8BDAC] rounded-2xl shadow-[0_20px_60px_rgba(30,21,8,0.24)] flex flex-col overflow-hidden pointer-events-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#E2D9CC] bg-[#F4F0E9] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#BD312B] text-white text-[9px] font-bold tracking-[0.12em]">
              MODEL REGISTRY [1]
            </span>
            <h2 className="font-display-brand text-[17px] font-bold text-[#1E1508]">
              Select Structure or Load External 3D Model (.GLB / .GLTF)
            </h2>
          </div>
          <p className="text-[11px] text-[#6F6559] mt-0.5">
            Switch instantaneously between parametric heritage/modern structures or drop any 3D{' '}
            <code className="text-[#BD312B]">.glb / .gltf</code> file to auto-compile its bottom-up assembly sequence.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg border border-[#DDD5C7] bg-[#FFFFFB] flex items-center justify-center text-[#1E1508] hover:border-[#BD312B] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-6 overflow-y-auto space-y-6">
        {/* Built-in Architectural Showcase */}
        <div>
          <div className="text-[10px] font-bold tracking-[0.12em] text-[#6F6559] uppercase mb-2.5">
            Built-in Architectural Catalog ({BUILTIN_MODEL_CATALOG.length} Structures)
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {BUILTIN_MODEL_CATALOG.map((entry) => {
              const isSelected = currentPkg.manifest.id === entry.id;
              return (
                <button
                  key={entry.id}
                  onClick={() => selectBuiltinModel(entry.id)}
                  className={`text-left p-4 rounded-xl border transition flex flex-col justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'border-[#BD312B] bg-[#FCECEB]/55 ring-1 ring-[#BD312B]/30'
                      : 'border-[#DDD5C7] bg-[#FFFFFB] hover:border-[#BD312B]/60 hover:shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[8.5px] font-bold tracking-[0.1em] text-[#BD312B] uppercase">
                        {entry.originBadge}
                      </span>
                      <span className="w-6 h-6 rounded border border-[#BD312B] text-[#BD312B] text-[9px] font-bold flex items-center justify-center -rotate-3 bg-[#FFFFFB]">
                        {entry.monogram}
                      </span>
                    </div>

                    <div className="font-editorial text-[15px] font-bold text-[#1E1508] mt-2 leading-snug">
                      {entry.title}
                    </div>
                    <p className="text-[10px] text-[#6F6559] mt-1 leading-relaxed">
                      {entry.subtitle}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-[#EAE2D6] flex items-center justify-between text-[9px]">
                    <span className="font-semibold text-[#1E1508]">
                      DWG {entry.dwgCode} · H {entry.heightMeters}m
                    </span>
                    <span className="text-[#BD312B] font-bold flex items-center gap-1">
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {isSelected ? 'ACTIVE' : 'LOAD ▸'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Previously Imported Custom GLB Models in Session */}
        {importedPackages.length > 0 && (
          <div>
            <div className="text-[10px] font-bold tracking-[0.12em] text-[#6F6559] uppercase mb-2">
              Imported Custom 3D Models ({importedPackages.length})
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {importedPackages.map((pkg) => {
                const isSelected = currentPkg.manifest.id === pkg.manifest.id;
                return (
                  <button
                    key={pkg.manifest.id}
                    onClick={() => addAndSelectImportedPackage(pkg)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'border-[#BD312B] bg-[#FCECEB]/60'
                        : 'border-[#DDD5C7] bg-[#FFFFFB] hover:border-[#BD312B]/60'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11.5px] text-[#1E1508]">
                        {pkg.manifest.drawingTitle}
                      </div>
                      <div className="text-[9.5px] text-[#6F6559]">
                        {pkg.steps.length} steps · {pkg.totalPieces} meshes · H{' '}
                        {pkg.manifest.totalHeight}m
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded bg-[#BD312B] text-white text-[9px] font-bold">
                      {isSelected ? 'ACTIVE' : 'SWITCH'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Drag & Drop External .GLB / .GLTF + Optional manifest.json Importer */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold tracking-[0.12em] text-[#6F6559] uppercase">
              Import External 3D Model (.GLB / .GLTF + Optional manifest.json)
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => void handleDownloadSampleGlb()}
                className="px-2.5 py-1 rounded-lg border border-[#DDD5C7] bg-[#FFFFFB] text-[9.5px] font-semibold text-[#1E1508] hover:border-[#BD312B] flex items-center gap-1 cursor-pointer"
              >
                <FileDown className="w-3 h-3 text-[#BD312B]" />
                Download Sample .GLB
              </button>
              <button
                onClick={() => void handleInstantSampleGlbImport()}
                className="px-2.5 py-1 rounded-lg bg-[#1E1508] text-white text-[9.5px] font-semibold hover:bg-[#BD312B] transition flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                Test Auto-GLB Compiler Now
              </button>
            </div>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              void handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer drafting-grid-bg ${
              dragActive
                ? 'border-[#BD312B] bg-[#FCECEB]/60'
                : 'border-[#C8BDAC] hover:border-[#BD312B]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".glb,.gltf,.json"
              multiple
              onChange={(e) => void handleFiles(e.target.files)}
              className="hidden"
            />
            <Upload className="w-7 h-7 text-[#BD312B] mx-auto mb-2" />
            <div className="text-[12px] font-bold text-[#1E1508]">
              {isImporting
                ? 'Compiling 3D Geometry & Generating 8-Stage Assembly Choreography...'
                : 'Click or Drag & Drop any .glb / .gltf file here'}
            </div>
            <p className="text-[10px] text-[#6F6559] mt-1 max-w-lg mx-auto">
              Automatically normalizes scale to meters, sorts meshes bottom-to-top & core-to-facade,
              packs vertices into our 3-draw-call Ink + Paint + Ghost + Section A-A GPU pipeline, and
              builds the full BOM & Gantt timeline.
            </p>
            {importError && (
              <div className="mt-3 px-3 py-1.5 rounded bg-[#FCECEB] border border-[#BD312B] text-[10px] text-[#BD312B] font-semibold inline-block">
                {importError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * [2] LAYERS GPU BITMASK DRAWER
 * ============================================================================ */
const LayersDrawer: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const pkg = useAppStore((s) => s.currentPackage);
  const visibleMask = useAppStore((s) => s.visibleLayerMask);
  const toggleLayerBit = useAppStore((s) => s.toggleLayerBit);
  const showAllLayers = useAppStore((s) => s.showAllLayers);
  const soloLayerBit = useAppStore((s) => s.soloLayerBit);

  return (
    <div className="flex flex-col gap-3">
      <DrawerHeader
        badge="LAYERS [2]"
        title="Structural Layer Visibility"
        onClose={onClose}
      />
      <p className="text-[10px] text-[#6F6559]">
        Instant zero-cost GPU shader bitmask filtering. Toggle or solo structural zones at 60 FPS.
      </p>

      <div className="space-y-1.5 max-h-[340px] overflow-y-auto">
        {pkg.manifest.structureGroups.map((grp) => {
          const isVisible = Boolean((visibleMask >> grp.layerBit) & 1);
          return (
            <div
              key={grp.id}
              className="flex items-center justify-between p-2 rounded-lg border border-[#E2D9CC] bg-[#FFFFFB]"
            >
              <button
                onClick={() => toggleLayerBit(grp.layerBit)}
                className="flex items-center gap-2 text-left flex-1 cursor-pointer"
              >
                {isVisible ? (
                  <Eye className="w-4 h-4 text-[#BD312B]" />
                ) : (
                  <EyeOff className="w-4 h-4 text-[#9A8F80]" />
                )}
                <div>
                  <div className="text-[10.5px] font-bold text-[#1E1508]">{grp.label}</div>
                  <div className="text-[8.5px] text-[#6F6559]">{grp.totalSteps} assembly steps</div>
                </div>
              </button>

              <button
                onClick={() => soloLayerBit(grp.layerBit)}
                className="px-2 py-0.5 rounded border border-[#DDD5C7] text-[8.5px] font-semibold hover:border-[#BD312B] hover:text-[#BD312B] cursor-pointer"
              >
                SOLO
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={showAllLayers}
        className="w-full py-1.5 rounded-lg bg-[#1E1508] text-white text-[10px] font-bold hover:bg-[#BD312B] transition cursor-pointer"
      >
        SHOW ALL LAYERS
      </button>
    </div>
  );
};

/* ============================================================================
 * [3] PARTS / BILL OF MATERIALS EXPLORER DRAWER
 * ============================================================================ */
const PartsDrawer: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const pkg = useAppStore((s) => s.currentPackage);
  const setCurrentTime = useAppStore((s) => s.setCurrentTime);
  const highlightStep = useAppStore((s) => s.highlightStep);
  const setHighlightStep = useAppStore((s) => s.setHighlightStep);
  const [query, setQuery] = useState('');

  const filtered = pkg.steps.filter(
    (s) =>
      !query.trim() ||
      s.title.toLowerCase().includes(query.toLowerCase()) ||
      s.sku.toLowerCase().includes(query.toLowerCase()) ||
      s.materialLabel.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-2.5 h-[460px]">
      <DrawerHeader
        badge="BOM EXPLORER [3]"
        title={`Parts Catalog (${pkg.totalPieces} pcs)`}
        onClose={onClose}
      />

      <div className="relative">
        <Search className="w-3.5 h-3.5 text-[#8A7F72] absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search SKU, member, or material..."
          className="w-full h-8 pl-8 pr-2 rounded-lg border border-[#DDD5C7] bg-[#FFFFFB] text-[10.5px] focus:outline-none focus:border-[#BD312B]"
        />
      </div>

      <div
        className="flex-1 overflow-y-auto space-y-1 pr-1"
        onMouseLeave={() => setHighlightStep(0)}
      >
        {filtered.map((s) => (
          <button
            key={s.stepIndex}
            onMouseEnter={() => setHighlightStep(s.stepIndex)}
            onClick={() => setCurrentTime(s.startTime + 0.05)}
            className={`w-full text-left p-2 rounded-lg border transition cursor-pointer ${
              highlightStep === s.stepIndex
                ? 'border-[#BD312B] bg-[#FCECEB]/65'
                : 'border-[#E5DDD0] bg-[#FFFFFB] hover:border-[#BD312B]/50'
            }`}
          >
            <div className="flex justify-between text-[8.5px]">
              <span className="font-bold text-[#BD312B]">
                #{String(s.stepIndex).padStart(3, '0')} · {s.sku}
              </span>
              <span className="text-[#6F6559]">{s.pieceCount} pcs</span>
            </div>
            <div className="text-[10px] font-bold text-[#1E1508] truncate">{s.title}</div>
            <div className="text-[8.5px] text-[#6F6559] truncate">{s.specification}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ============================================================================
 * [4] SECTION A-A CUTTING PLANE STUDIO DRAWER
 * ============================================================================ */
const SectionDrawer: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const pkg = useAppStore((s) => s.currentPackage);
  const manualSection = useAppStore((s) => s.manualSection);
  const liveSection = useAppStore((s) => s.liveSectionState);
  const setManualSection = useAppStore((s) => s.setManualSection);

  const isActive = manualSection ? manualSection.active : liveSection.enabled;
  const az = manualSection ? manualSection.azimuthDeg : liveSection.azimuthDeg;
  const offset = manualSection ? manualSection.offset : liveSection.offset;
  const maxSpan = Math.ceil(pkg.manifest.footprintHalfExtent * 1.4);

  return (
    <div className="flex flex-col gap-3">
      <DrawerHeader
        badge="SECTION STUDIO [4]"
        title="Live 3D Section Plane A-A"
        onClose={onClose}
      />

      <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#E2D9CC] bg-[#FFFFFB]">
        <span className="text-[10.5px] font-bold text-[#1E1508]">Enable Section Cut [S]</span>
        <button
          onClick={() =>
            setManualSection({
              active: !isActive,
              azimuthDeg: az,
              offset: !isActive ? 0.35 : maxSpan,
            })
          }
          className={`px-3 py-1 rounded-md text-[9.5px] font-bold cursor-pointer ${
            isActive ? 'bg-[#BD312B] text-white' : 'bg-[#EFEAE0] text-[#1E1508]'
          }`}
        >
          {isActive ? 'ACTIVE' : 'OFF'}
        </button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[9.5px]">
          <span className="text-[#6F6559]">Cut Plane Azimuth Angle</span>
          <span className="font-bold text-[#1E1508]">{Math.round(az)}°</span>
        </div>
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={az}
          onChange={(e) =>
            setManualSection({
              active: true,
              azimuthDeg: parseFloat(e.target.value),
              offset,
            })
          }
          className="timeline-scrubber w-full"
        />
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[9.5px]">
          <span className="text-[#6F6559]">Cut Depth Offset (d)</span>
          <span className="font-bold text-[#BD312B]">{offset.toFixed(2)} m</span>
        </div>
        <input
          type="range"
          min={-maxSpan}
          max={maxSpan}
          step={0.05}
          value={offset}
          onChange={(e) =>
            setManualSection({
              active: true,
              azimuthDeg: az,
              offset: parseFloat(e.target.value),
            })
          }
          className="timeline-scrubber w-full"
        />
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-[9px]">
        {[
          { label: 'Section A-A (100°)', angle: 100 },
          { label: 'East-West (0°)', angle: 0 },
          { label: 'North-South (90°)', angle: 90 },
        ].map((p) => (
          <button
            key={p.label}
            onClick={() => setManualSection({ active: true, azimuthDeg: p.angle, offset: 0.3 })}
            className="py-1.5 px-1 rounded border border-[#DDD5C7] bg-[#FFFFFB] font-semibold hover:border-[#BD312B] cursor-pointer"
          >
            {p.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => setManualSection(null)}
        className="w-full py-1.5 rounded-lg border border-[#DDD5C7] bg-[#FFFFFB] text-[9.5px] font-bold flex items-center justify-center gap-1.5 hover:border-[#BD312B] cursor-pointer"
      >
        <RotateCcw className="w-3 h-3" />
        Follow Automatic Timeline Choreography
      </button>
    </div>
  );
};

/* ============================================================================
 * [5] RENDER SHADER PIPELINE DRAWER
 * ============================================================================ */
const RenderDrawer: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const renderStyle = useAppStore((s) => s.renderStyle);
  const setRenderStyle = useAppStore((s) => s.setRenderStyle);
  const ghostEnabled = useAppStore((s) => s.ghostEnabled);
  const toggleGhost = useAppStore((s) => s.toggleGhost);

  const options: { id: RenderStyle; title: string; desc: string }[] = [
    {
      id: 'INK_PAINT',
      title: 'Ink + Rising Paint Wash (Default)',
      desc: 'Assembles as Sumi ink drawing, then sweeps pigment wash upward in Stage 07.',
    },
    {
      id: 'INK',
      title: 'Pure Sumi Ink & Paper',
      desc: 'Monochrome architectural linework & ambient paper shading across all stages.',
    },
    {
      id: 'PAINT',
      title: 'Full Material Pigments [C]',
      desc: 'Displays vermilion lacquer, stone, clay tiles, gilt & metal colors immediately.',
    },
    {
      id: 'CLAY',
      title: 'Architectural Clay Maquette',
      desc: 'Warm museum plaster study highlighting pure massing and shadow.',
    },
    {
      id: 'WIRE',
      title: 'Structural Edge Wireframe [X]',
      desc: 'Transparent X-ray crease linework exposing internal joinery & core.',
    },
  ];

  return (
    <div className="flex flex-col gap-2.5">
      <DrawerHeader badge="SHADER PIPELINE [5]" title="Render Style" onClose={onClose} />

      <div className="space-y-1.5">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setRenderStyle(opt.id)}
            className={`w-full text-left p-2.5 rounded-lg border transition cursor-pointer ${
              renderStyle === opt.id
                ? 'border-[#BD312B] bg-[#FCECEB]/60'
                : 'border-[#E2D9CC] bg-[#FFFFFB] hover:border-[#BD312B]/50'
            }`}
          >
            <div className="text-[10.5px] font-bold text-[#1E1508]">{opt.title}</div>
            <div className="text-[9px] text-[#6F6559] mt-0.5">{opt.desc}</div>
          </button>
        ))}
      </div>

      <button
        onClick={toggleGhost}
        className={`w-full py-2 rounded-lg border text-[10px] font-bold cursor-pointer ${
          ghostEnabled
            ? 'border-[#BD312B] bg-[#BD312B] text-white'
            : 'border-[#DDD5C7] bg-[#FFFFFB] text-[#1E1508]'
        }`}
      >
        GHOST FUTURE WIREFRAME: {ghostEnabled ? 'ON' : 'OFF'}
      </button>
    </div>
  );
};

/* ============================================================================
 * [6] GRAPHICS, HUD & AUDIO SETTINGS DRAWER
 * ============================================================================ */
const SettingsDrawer: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const resScale = useAppStore((s) => s.resolutionScale);
  const setResolutionScale = useAppStore((s) => s.setResolutionScale);
  const showCallouts = useAppStore((s) => s.showCallouts);
  const toggleShowCallouts = useAppStore((s) => s.toggleShowCallouts);
  const isMuted = useAppStore((s) => s.isMuted);
  const toggleMute = useAppStore((s) => s.toggleMute);
  const [vol, setVol] = useState(0.6);

  return (
    <div className="flex flex-col gap-3">
      <DrawerHeader badge="ENGINE CONFIG [6]" title="Display & Audio Settings" onClose={onClose} />

      <div>
        <div className="text-[9.5px] font-semibold text-[#6F6559] mb-1.5">
          WebGL Supersampling Resolution Scale
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[1.0, 1.5, 2.0].map((val) => (
            <button
              key={val}
              onClick={() => setResolutionScale(val)}
              className={`py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer ${
                Math.abs(resScale - val) < 0.05
                  ? 'border-[#BD312B] bg-[#BD312B] text-white'
                  : 'border-[#DDD5C7] bg-[#FFFFFB] text-[#1E1508]'
              }`}
            >
              {val.toFixed(1)}× {val === 1.5 ? '(Std)' : val === 2.0 ? '(Ultra)' : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#E2D9CC] bg-[#FFFFFB]">
        <span className="text-[10px] font-bold text-[#1E1508]">3D Leader-Line Callouts</span>
        <button
          onClick={toggleShowCallouts}
          className={`px-2.5 py-1 rounded text-[9px] font-bold cursor-pointer ${
            showCallouts ? 'bg-[#BD312B] text-white' : 'bg-[#EFEAE0] text-[#6F6559]'
          }`}
        >
          {showCallouts ? 'VISIBLE' : 'HIDDEN'}
        </button>
      </div>

      <div className="p-2.5 rounded-lg border border-[#E2D9CC] bg-[#FFFFFB] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#1E1508]">Procedural Synth & Timber SFX</span>
          <button
            onClick={toggleMute}
            className={`px-2.5 py-1 rounded text-[9px] font-bold cursor-pointer ${
              !isMuted ? 'bg-[#BD312B] text-white' : 'bg-[#EFEAE0] text-[#6F6559]'
            }`}
          >
            {isMuted ? 'MUTED' : 'PLAYING'}
          </button>
        </div>

        <input
          type="range"
          min={0.05}
          max={1}
          step={0.05}
          value={vol}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setVol(v);
            soundEngine.setVolume(v);
          }}
          className="timeline-scrubber w-full"
        />
      </div>
    </div>
  );
};

const DrawerHeader: React.FC<{ badge: string; title: string; onClose: () => void }> = ({
  badge,
  title,
  onClose,
}) => (
  <div className="flex items-center justify-between pb-2 border-b border-[#E2D9CC]">
    <div>
      <div className="text-[8px] font-bold tracking-[0.12em] text-[#BD312B] uppercase">{badge}</div>
      <h3 className="font-display-brand text-[13.5px] font-bold text-[#1E1508]">{title}</h3>
    </div>
    <button
      onClick={onClose}
      className="w-7 h-7 rounded-lg border border-[#DDD5C7] bg-[#FFFFFB] flex items-center justify-center text-[#1E1508] hover:border-[#BD312B] cursor-pointer"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  </div>
);
