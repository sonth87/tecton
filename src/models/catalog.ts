import type { CompiledProjectPackage } from '@/core/types/project';
import { buildPagodaFiveTierPackage } from '@/models/pagodaFiveTier';
import { buildKhueVanCacPackage } from '@/models/khueVanCac';
import { buildSteelAtriumPackage } from '@/models/steelAtriumPavilion';

export interface CatalogEntryMeta {
  id: string;
  dwgCode: string;
  monogram: string;
  title: string;
  subtitle: string;
  categoryTag: string;
  heightMeters: number;
  approxPieces: string;
  originBadge: string;
  buildFn: () => CompiledProjectPackage;
}

export const BUILTIN_MODEL_CATALOG: CatalogEntryMeta[] = [
  {
    id: 'pagoda-five-tier',
    dwgCode: 'PG-05',
    monogram: 'PG',
    title: 'Five-Tier Timber Pagoda (Gojū-no-tō)',
    subtitle: 'Traditional Japanese Hinoki timber pagoda · Mokoshi, 4 gilt Buddhas & seismic Shinbashira',
    categoryTag: '5 TIERS',
    heightMeters: 37.54,
    approxPieces: '5,627 PCS · 191 STEPS',
    originBadge: 'BUILT-IN · JAPANESE HERITAGE',
    buildFn: buildPagodaFiveTierPackage,
  },
  {
    id: 'khue-van-cac',
    dwgCode: 'KV-01',
    monogram: 'KV',
    title: 'Khuê Văn Các — Văn Miếu Hà Nội',
    subtitle: 'Biểu tượng văn hiến Việt Nam · 4 trụ gạch vồ, 8 cửa tròn Khuê Tinh & mái chồng diêm ngói mũi hài',
    categoryTag: '8 ROOFS',
    heightMeters: 9.45,
    approxPieces: '954 PCS · 30 STEPS',
    originBadge: 'BUILT-IN · VIETNAMESE HERITAGE',
    buildFn: buildKhueVanCacPackage,
  },
  {
    id: 'steel-atrium-pavilion',
    dwgCode: 'SF-03',
    monogram: 'SF',
    title: 'Diagrid Steel Atrium Pavilion',
    subtitle: 'Contemporary structural engineering · S460 mega-columns, tubular diagrid, skybridges & oculus canopy',
    categoryTag: 'DIAGRID',
    heightMeters: 26.4,
    approxPieces: '962 PCS · 26 STEPS',
    originBadge: 'BUILT-IN · MODERN STRUCTURAL',
    buildFn: buildSteelAtriumPackage,
  },
];

const compiledCache = new Map<string, CompiledProjectPackage>();

export function getOrBuildCatalogPackage(id: string): CompiledProjectPackage {
  const cached = compiledCache.get(id);
  if (cached) return cached;

  const entry = BUILTIN_MODEL_CATALOG.find((e) => e.id === id) ?? BUILTIN_MODEL_CATALOG[0];
  const pkg = entry.buildFn();
  compiledCache.set(entry.id, pkg);
  return pkg;
}

export function registerImportedPackage(pkg: CompiledProjectPackage): void {
  compiledCache.set(pkg.manifest.id, pkg);
}
