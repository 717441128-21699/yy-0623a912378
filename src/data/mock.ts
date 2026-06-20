import type { Section, CheckCategory, SamplingTask } from '@/types/inspection';

export const mockSections: Section[] = [
  { id: 's1', name: '一标段', project: '1#~3#住宅楼' },
  { id: 's2', name: '二标段', project: '4#~6#住宅楼' },
  { id: 's3', name: '三标段', project: '地下车库及配套' },
  { id: 's4', name: '四标段', project: '商业裙楼' },
];

export const mockCheckCategories: CheckCategory[] = [
  {
    name: '砌体工程',
    items: [
      { id: 'ci1', name: '砌体垂直度', category: '砌体工程', standard: '≤5mm', tolerance: 5, unit: 'mm' },
      { id: 'ci2', name: '砌体平整度', category: '砌体工程', standard: '≤8mm', tolerance: 8, unit: 'mm' },
      { id: 'ci3', name: '水平灰缝厚度', category: '砌体工程', standard: '±2mm', tolerance: 2, unit: 'mm' },
    ],
  },
  {
    name: '混凝土工程',
    items: [
      { id: 'ci4', name: '截面尺寸', category: '混凝土工程', standard: '≤5mm', tolerance: 5, unit: 'mm' },
      { id: 'ci5', name: '表面平整度', category: '混凝土工程', standard: '≤8mm', tolerance: 8, unit: 'mm' },
      { id: 'ci6', name: '垂直度', category: '混凝土工程', standard: '≤5mm', tolerance: 5, unit: 'mm' },
    ],
  },
  {
    name: '地面工程',
    items: [
      { id: 'ci7', name: '地面平整度', category: '地面工程', standard: '≤5mm', tolerance: 5, unit: 'mm' },
      { id: 'ci8', name: '地面水平度', category: '地面工程', standard: '≤3mm', tolerance: 3, unit: 'mm' },
    ],
  },
  {
    name: '装饰装修',
    items: [
      { id: 'ci9', name: '墙面平整度', category: '装饰装修', standard: '≤3mm', tolerance: 3, unit: 'mm' },
      { id: 'ci10', name: '墙面垂直度', category: '装饰装修', standard: '≤3mm', tolerance: 3, unit: 'mm' },
      { id: 'ci11', name: '阴阳角方正', category: '装饰装修', standard: '≤3mm', tolerance: 3, unit: 'mm' },
    ],
  },
];

const locationPool = [
  '3层A轴交1轴', '5层C轴交3轴', '2层B轴交2轴', '7层D轴交4轴',
  '4层A轴交5轴', '6层B轴交1轴', '1层C轴交2轴', '8层D轴交3轴',
  '3层E轴交6轴', '5层A轴交4轴', '2层F轴交5轴', '6层C轴交1轴',
  '4层B轴交3轴', '1层D轴交6轴', '7层E轴交2轴',
];

export function generateRandomLocations(count: number): string[] {
  const shuffled = [...locationPool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export const mockTasks: SamplingTask[] = [
  {
    id: 't1',
    sectionId: 's1',
    sectionName: '一标段 1#~3#住宅楼',
    date: '2025-06-19',
    status: 'signed',
    checkItemIds: ['ci1', 'ci2'],
    points: [
      {
        id: 'p1', checkItemId: 'ci1', checkItemName: '砌体垂直度', location: '3层A轴交1轴',
        standardValue: '≤5', measuredValue: '3', isDeviation: false,
        photos: ['https://picsum.photos/id/787/200/200'], inspector: '张工',
        rectificationOpinion: '', rectificationDeadline: '', retestValue: '', retestPhotos: [], retestDate: '', retestInspector: '',
      },
      {
        id: 'p2', checkItemId: 'ci1', checkItemName: '砌体垂直度', location: '5层C轴交3轴',
        standardValue: '≤5', measuredValue: '4', isDeviation: false,
        photos: ['https://picsum.photos/id/1082/200/200'], inspector: '张工',
        rectificationOpinion: '', rectificationDeadline: '', retestValue: '', retestPhotos: [], retestDate: '', retestInspector: '',
      },
      {
        id: 'p3', checkItemId: 'ci2', checkItemName: '砌体平整度', location: '2层B轴交2轴',
        standardValue: '≤8', measuredValue: '6', isDeviation: false,
        photos: ['https://picsum.photos/id/3/200/200'], inspector: '李工',
        rectificationOpinion: '', rectificationDeadline: '', retestValue: '', retestPhotos: [], retestDate: '', retestInspector: '',
      },
    ],
    supervisorName: '王监理',
    signResult: 'approved',
    signDate: '2025-06-20',
    signComment: '各项指标合格',
  },
  {
    id: 't2',
    sectionId: 's2',
    sectionName: '二标段 4#~6#住宅楼',
    date: '2025-06-20',
    status: 'pending_sign',
    checkItemIds: ['ci4', 'ci7'],
    points: [
      {
        id: 'p4', checkItemId: 'ci4', checkItemName: '截面尺寸', location: '4层A轴交5轴',
        standardValue: '≤5', measuredValue: '7', isDeviation: true,
        photos: ['https://picsum.photos/id/787/200/200', 'https://picsum.photos/id/1082/200/200'], inspector: '赵工',
        rectificationOpinion: '截面尺寸偏差超限，要求3日内整改', rectificationDeadline: '2025-06-23',
        retestValue: '4', retestPhotos: ['https://picsum.photos/id/3/200/200'], retestDate: '2025-06-22', retestInspector: '赵工',
      },
      {
        id: 'p5', checkItemId: 'ci4', checkItemName: '截面尺寸', location: '6层B轴交1轴',
        standardValue: '≤5', measuredValue: '3', isDeviation: false,
        photos: ['https://picsum.photos/id/1082/200/200'], inspector: '赵工',
        rectificationOpinion: '', rectificationDeadline: '', retestValue: '', retestPhotos: [], retestDate: '', retestInspector: '',
      },
      {
        id: 'p6', checkItemId: 'ci7', checkItemName: '地面平整度', location: '1层C轴交2轴',
        standardValue: '≤5', measuredValue: '4', isDeviation: false,
        photos: ['https://picsum.photos/id/3/200/200'], inspector: '钱工',
        rectificationOpinion: '', rectificationDeadline: '', retestValue: '', retestPhotos: [], retestDate: '', retestInspector: '',
      },
    ],
    supervisorName: '王监理',
    signResult: 'approved',
    signDate: '',
    signComment: '',
  },
  {
    id: 't3',
    sectionId: 's1',
    sectionName: '一标段 1#~3#住宅楼',
    date: '2025-06-21',
    status: 'rectifying',
    checkItemIds: ['ci9', 'ci10'],
    points: [
      {
        id: 'p7', checkItemId: 'ci9', checkItemName: '墙面平整度', location: '7层D轴交4轴',
        standardValue: '≤3', measuredValue: '5', isDeviation: true,
        photos: ['https://picsum.photos/id/787/200/200'], inspector: '孙工',
        rectificationOpinion: '墙面平整度偏差超出允许范围，要求2日内整改', rectificationDeadline: '2025-06-23',
        retestValue: '', retestPhotos: [], retestDate: '', retestInspector: '',
      },
      {
        id: 'p8', checkItemId: 'ci10', checkItemName: '墙面垂直度', location: '8层D轴交3轴',
        standardValue: '≤3', measuredValue: '2', isDeviation: false,
        photos: ['https://picsum.photos/id/1082/200/200'], inspector: '孙工',
        rectificationOpinion: '', rectificationDeadline: '', retestValue: '', retestPhotos: [], retestDate: '', retestInspector: '',
      },
    ],
    supervisorName: '王监理',
    signResult: 'approved',
    signDate: '',
    signComment: '',
  },
  {
    id: 't4',
    sectionId: 's3',
    sectionName: '三标段 地下车库及配套',
    date: '2025-06-21',
    status: 'inspecting',
    checkItemIds: ['ci5', 'ci8'],
    points: [
      {
        id: 'p9', checkItemId: 'ci5', checkItemName: '表面平整度', location: 'B1层A区3跨',
        standardValue: '≤8', measuredValue: '', isDeviation: false,
        photos: [], inspector: '',
        rectificationOpinion: '', rectificationDeadline: '', retestValue: '', retestPhotos: [], retestDate: '', retestInspector: '',
      },
      {
        id: 'p10', checkItemId: 'ci5', checkItemName: '表面平整度', location: 'B1层C区1跨',
        standardValue: '≤8', measuredValue: '', isDeviation: false,
        photos: [], inspector: '',
        rectificationOpinion: '', rectificationDeadline: '', retestValue: '', retestPhotos: [], retestDate: '', retestInspector: '',
      },
      {
        id: 'p11', checkItemId: 'ci8', checkItemName: '地面水平度', location: 'B1层B区2跨',
        standardValue: '≤3', measuredValue: '', isDeviation: false,
        photos: [], inspector: '',
        rectificationOpinion: '', rectificationDeadline: '', retestValue: '', retestPhotos: [], retestDate: '', retestInspector: '',
      },
    ],
    supervisorName: '王监理',
    signResult: 'approved',
    signDate: '',
    signComment: '',
  },
];
