# ARCHI / PAGODA BUILD — Multi-Model 3D Architectural Assembly & Section Visualizer

An interactive 60 FPS WebGL / 4D BIM architectural assembly & live cross-section platform inspired by classic *Ink & Paper* technical drawings.

## Key Capabilities

- **3–4 Draw Call Custom GLSL Rendering Pipeline**:
  - **Pass 1 (`SOLID_FRAGMENT_SHADER`)**: Batched solid triangles supporting *Sumi Ink & Paper* ambient shading, *Lowering* coral highlights, *Stage 07 Rising Brush Paint Wash*, live *Section A-A* clipping plane with diagonal cross-section *poché* hatch, zero-cost GPU layer bitmask visibility, and BOM hover highlighting.
  - **Pass 2 (`PLACED_EDGE_FRAGMENT_SHADER`)**: Crisp dark Sumi ink crease linework (`#2B241E`) & active lowering crimson lines (`#D6362E`).
  - **Pass 3 (`GHOST_EDGE_FRAGMENT_SHADER`)**: Translucent cinnabar-red wireframe silhouette (`Ghost`) of future unplaced components reusing the identical GPU vertex buffer.
- **Decoupled Multi-Model Engine (`[1] Model`)**:
  1. **`PG-05` — Five-Tier Timber Pagoda (*Gojū-no-tō*)**: `191` steps, `5,627` pieces, `438.8 t`, `H = 37.54 m` (Plinth, Mokoshi, 4 gilt Buddhas, free-standing *Shinbashira* central mast, and bronze *Sōrin* spire).
  2. **`KV-01` — Khuê Văn Các (*Văn Miếu, Hà Nội*)**: Bát Tràng brick courtyard, 4 ancient brick piers with arched portals, Ironwood (*Gỗ Lim*) deck, 8 circular *Khuê Tinh* sun-ray windows, and double-tiered 8-roof *Mũi Hài* clay tiles (`H = 9.45 m`).
  3. **`SF-03` — Diagrid Steel Atrium Pavilion**: Reinforced concrete pile caps, S460 mega-columns, suspended atrium skybridges, tubular diagrid exoskeleton, and cantilevered oculus canopy (`H = 26.40 m`).
  4. **External `.GLB / .GLTF` Drag-and-Drop Auto-Compiler**: Drop any `.glb` or `.gltf` file (with an optional sidecar `manifest.json`) into the `[1] Model` dialog to automatically normalize scale, sort meshes bottom-to-top & core-to-facade, batch vertices into 3 GPU draw calls, and generate the complete 8-stage sequence, BOM, Gantt chart, and `Section A-A` interior flight.

## Quick Start

```bash
npm install
npm run dev
```

## Keyboard Shortcuts

| Key | Action |
| :---: | :--- |
| `Space` | Play / Pause 25s sequence |
| `←` / `→` | Step Backward / Forward |
| `R` | Rebuild from `00:00` (`STEP 001`) |
| `A` | Toggle Turntable `AUTO-ROTATE` |
| `C` | Toggle Full Material `COLOUR` vs Ink |
| `X` | Toggle Structural `FRAME` (Wireframe) |
| `S` | Toggle Live `SECTION A-A` Cut Plane |
| `F` | Cycle Playback `SPEED` (`×1`, `×2`, `×4`, `×0.5`) |
| `V` | Cycle Architectural `VIEW` Presets |
| `G` | Toggle `Ghost` Future Silhouette |
| `1` – `6` | Open Model / Layers / Parts / Section / Render / Settings Drawers |
| `7` | Cycle UI Language (`EN` / `VI` / `JA`) |

## Optional Sidecar `manifest.json` Format (for Custom `.GLB` Imports)

```json
{
  "dwgCode": "TW-01",
  "monogram": "TW",
  "brandPrefix": "TOWER",
  "drawingTitle": "Custom Timber Watchtower",
  "drawingSubtitle": "Imported from Blender GLB · built member by member",
  "stageNames": [
    "FOUNDATION & PLINTH",
    "PRIMARY COLUMNS",
    "FLOOR DECKING",
    "ENVELOPE WALLS",
    "ROOF TRUSSES",
    "CROWN & FINIAL"
  ]
}
```
