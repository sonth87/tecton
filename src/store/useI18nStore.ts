import { create } from 'zustand';
import type { LanguageCode } from '@/core/types/project';

interface I18nLabels {
  model: string;
  layers: string;
  parts: string;
  section: string;
  render: string;
  settings: string;
  language: string;
  buildSequence: string;
  sequenceTab: string;
  membersTab: string;
  stageTimeline: string;
  activeOperation: string;
  structure: string;
  buildLog: string;
  stages: string;
  placed: string;
  active: string;
  ghost: string;
  rebuild: string;
  autoRotate: string;
  colour: string;
  frame: string;
  sectionBtn: string;
  speed: string;
  view: string;
  orbitCam: string;
  drawing: string;
  dwgNo: string;
  scale: string;
  phase: string;
  sheet: string;
  camera: string;
  member: string;
  step: string;
  stage: string;
  quantity: string;
  material: string;
  specification: string;
  placedAt: string;
  estMass: string;
}

const DICT: Record<LanguageCode, I18nLabels> = {
  EN: {
    model: 'Model',
    layers: 'Layers',
    parts: 'Parts',
    section: 'Section',
    render: 'Render',
    settings: 'Settings',
    language: 'Language',
    buildSequence: 'BUILD SEQUENCE',
    sequenceTab: 'Sequence',
    membersTab: 'Members',
    stageTimeline: 'STAGE TIMELINE',
    activeOperation: 'ACTIVE OPERATION',
    structure: 'STRUCTURE',
    buildLog: 'BUILD LOG',
    stages: 'STAGES',
    placed: 'PLACED',
    active: 'ACTIVE',
    ghost: 'GHOST',
    rebuild: 'REBUILD',
    autoRotate: 'AUTO-ROTATE',
    colour: 'COLOUR',
    frame: 'FRAME',
    sectionBtn: 'SECTION',
    speed: 'SPEED',
    view: 'VIEW',
    orbitCam: 'Orbit Cam',
    drawing: 'DRAWING',
    dwgNo: 'DWG NO.',
    scale: 'SCALE',
    phase: 'PHASE',
    sheet: 'SHEET',
    camera: 'CAMERA',
    member: 'MEMBER',
    step: 'STEP',
    stage: 'STAGE',
    quantity: 'QUANTITY',
    material: 'MATERIAL',
    specification: 'SPECIFICATION',
    placedAt: 'PLACED AT X · Y · Z',
    estMass: 'EST. MASS',
  },
  VI: {
    model: 'Mô hình',
    layers: 'Lớp',
    parts: 'Vật tư',
    section: 'Mặt cắt',
    render: 'Hiển thị',
    settings: 'Cài đặt',
    language: 'Ngôn ngữ',
    buildSequence: 'TRÌNH TỰ THI CÔNG',
    sequenceTab: 'Trình tự',
    membersTab: 'Cấu kiện',
    stageTimeline: 'TIẾN ĐỘ GIAI ĐOẠN',
    activeOperation: 'HẠNG MỤC ĐANG LẮP',
    structure: 'KẾT CẤU',
    buildLog: 'NHẬT KÝ LẮP DỰNG',
    stages: 'GIAI ĐOẠN',
    placed: 'ĐÃ LẮP',
    active: 'ĐANG HẠ',
    ghost: 'KHUNG MỜ',
    rebuild: 'XÂY LẠI',
    autoRotate: 'TỰ XOAY',
    colour: 'MÀU SẮC',
    frame: 'KHUNG DÂY',
    sectionBtn: 'MẶT CẮT',
    speed: 'TỐC ĐỘ',
    view: 'GÓC NHÌN',
    orbitCam: 'Xoay tự do',
    drawing: 'BẢN VẼ',
    dwgNo: 'MÃ BẢN VẼ',
    scale: 'TỶ LỆ',
    phase: 'GIAI ĐOẠN',
    sheet: 'TỜ SỐ',
    camera: 'ỐNG KÍNH',
    member: 'CẤU KIỆN',
    step: 'BƯỚC',
    stage: 'PHẦN',
    quantity: 'SỐ LƯỢNG',
    material: 'VẬT LIỆU',
    specification: 'QUY CÁCH KỸ THUẬT',
    placedAt: 'TỌA ĐỘ X · Y · Z',
    estMass: 'KHỐI LƯỢNG',
  },
  JA: {
    model: 'モデル',
    layers: 'レイヤー',
    parts: '部材表',
    section: '断面図',
    render: '描画',
    settings: '設定',
    language: '言語',
    buildSequence: '組立シーケンス',
    sequenceTab: '工程順',
    membersTab: '部材一覧',
    stageTimeline: '工程タイムライン',
    activeOperation: '現在の施工部材',
    structure: '構造進捗',
    buildLog: '施工ログ',
    stages: '施工段階',
    placed: '設置済',
    active: '吊込中',
    ghost: '仮線',
    rebuild: '再構築',
    autoRotate: '自動回転',
    colour: '彩色',
    frame: '線画枠',
    sectionBtn: '断面切替',
    speed: '速度',
    view: '視点',
    orbitCam: '自由視点',
    drawing: '図面名称',
    dwgNo: '図番',
    scale: '縮尺',
    phase: '工程',
    sheet: '図面頁',
    camera: 'カメラ',
    member: '部材名称',
    step: '工程番号',
    stage: '段階',
    quantity: '数量',
    material: '材質',
    specification: '寸法・仕様',
    placedAt: '配置座標 X · Y · Z',
    estMass: '推定質量',
  },
};

interface I18nState {
  lang: LanguageCode;
  t: I18nLabels;
  cycleLanguage: () => void;
  setLanguage: (lang: LanguageCode) => void;
}

const ORDER: LanguageCode[] = ['EN', 'VI', 'JA'];

export const useI18nStore = create<I18nState>((set, get) => ({
  lang: 'EN',
  t: DICT.EN,
  cycleLanguage: () => {
    const next = ORDER[(ORDER.indexOf(get().lang) + 1) % ORDER.length];
    set({ lang: next, t: DICT[next] });
  },
  setLanguage: (lang) => set({ lang, t: DICT[lang] }),
}));
