import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { feishuSync, getCloudSync, getFcUrl } from './feishuSync'

// 兴趣与阅读管理 C 模块数据层（本地优先）
// 字段设计与「飞书多维表格·兴趣与阅读表」一一对应（表已建：tbldnDYR92g3fciD），见《数据层规范·飞书字段映射》
// 当前用 localStorage 持久化（persist）；飞书重连后整体导出 JSON 导入，零损耗迁移。
//
// 2026-08-05 升级：从「只能记阅读」扩成「兴趣发现 + 天赋发掘」面板。
// 框架参考：
//   - 加德纳 8 大智能（语言/数理/空间/身体-动觉/音乐/人际/内省/自然观察）
//   - 天赋 4 大信号：自发性 + 沉浸度 + 表现/学习速度 + 反复/持续性
// 合规约束（见集成优化 V2）：
//   - 不诊断：本模块仅记录客观情况与自评分，用于看兴趣与天赋信号分布；
//     绝不做「某领域有天赋/无天赋」等医学或心理诊断结论。
//   - 防焦虑：兴趣只做记录与小结，不给孩子贴"没有天赋"标签；分数仅家长参考。
//
// 接读伴：本模块不内置阅读引擎，通过「读伴入口」卡打开已部署的读伴 ReadingBuddy（地址可配置）。

// ---- 兴趣大类（含 emoji + 颜色 + 加德纳智能映射） ----
export type IntelligenceKey =
  | '语言' | '数理' | '空间' | '动觉' | '音乐' | '人际' | '内省' | '自然观察'

export interface InterestCategory {
  key: string         // 大类键名（写入飞书）
  label: string       // 中文标签（家长可见）
  emoji: string
  color: string       // 主色
  intelligences: IntelligenceKey[]  // 对应加德纳智能（多对一，多对多）
  examples: string    // 活动示例
}

export const INTEREST_CATEGORIES: InterestCategory[] = [
  { key: '阅读写作', label: '阅读写作', emoji: '📚', color: '#0EA5A4',
    intelligences: ['语言'], examples: '书、绘本、写作、演讲、播音' },
  { key: '数学逻辑', label: '数学逻辑', emoji: '🧮', color: '#6366F1',
    intelligences: ['数理'], examples: '数独、奥数、逻辑谜题、围棋' },
  { key: '科学探索', label: '科学探索', emoji: '🔬', color: '#06B6D4',
    intelligences: ['数理', '自然观察'], examples: '实验、天文、动植物观察' },
  { key: '自然观察', label: '自然观察', emoji: '🌿', color: '#22C55E',
    intelligences: ['自然观察'], examples: '观鸟、博物、地理、气象' },
  { key: '艺术创作', label: '艺术创作', emoji: '🎨', color: '#EC4899',
    intelligences: ['空间'], examples: '绘画、手工、摄影、雕塑、设计' },
  { key: '音乐', label: '音乐', emoji: '🎵', color: '#8B5CF6',
    intelligences: ['音乐'], examples: '乐器、唱歌、作曲' },
  { key: '表演舞蹈', label: '表演舞蹈', emoji: '🎭', color: '#F43F5E',
    intelligences: ['动觉'], examples: '舞蹈、戏剧、主持、戏曲' },
  { key: '体育运动', label: '体育运动', emoji: '⚽', color: '#F59E0B',
    intelligences: ['动觉'], examples: '球类、跑步、游泳、武术、跆拳道' },
  { key: '数字科技', label: '数字科技', emoji: '💻', color: '#3B82F6',
    intelligences: ['数理'], examples: '编程、机器人、电子、AI 玩具' },
  { key: '社交公益', label: '社交公益', emoji: '🗣️', color: '#10B981',
    intelligences: ['人际'], examples: '志愿服务、学生会、辩论、主持' },
  { key: '策略棋类', label: '策略棋类', emoji: '🧩', color: '#A855F7',
    intelligences: ['数理', '动觉'], examples: '象棋、围棋、魔方、桌游' },
  { key: '生活实践', label: '生活实践', emoji: '🍳', color: '#84CC16',
    intelligences: ['内省', '自然观察'], examples: '烹饪、园艺、DIY、收藏、整理' },
]

// ---- 加德纳 8 大智能（家长看得懂的科普名） ----
export const INTELLIGENCE_DIMS: { key: IntelligenceKey; label: string; emoji: string; desc: string }[] = [
  { key: '语言', label: '语言', emoji: '📝', desc: '听、说、读、写' },
  { key: '数理', label: '数理', emoji: '🧮', desc: '推理、计算、规律' },
  { key: '空间', label: '空间', emoji: '🎨', desc: '图像、立体、方位' },
  { key: '动觉', label: '动觉', emoji: '⚽', desc: '身体协调、动作' },
  { key: '音乐', label: '音乐', emoji: '🎵', desc: '节奏、音高、音色' },
  { key: '人际', label: '人际', emoji: '🗣️', desc: '沟通、共情、合作' },
  { key: '内省', label: '内省', emoji: '🪞', desc: '自知、自律、自省' },
  { key: '自然观察', label: '自然观察', emoji: '🌿', desc: '分类、观察、辨识' },
]

// ---- 记录类型（兼容旧阅读字段，新增天赋信号字段） ----
export interface InterestRecord {
  id: string
  date: string // YYYY-MM-DD
  // 兴趣大类（新）
  category?: string         // 兴趣大类键名（见 INTEREST_CATEGORIES）
  activity?: string         // 具体活动名称（自由文本，如"哈利波特与魔法石"、"围棋"、"油画"）
  // 天赋 4 大信号（新）
  spontaneity?: number      // 自发性 1-5（孩子主动要求 vs 家长推动）
  immersion?: number        // 沉浸度 1-5（做的时候忘我、忘了时间）
  performance?: number      // 表现/学习速度 1-5（孩子在该活动的表现）
  // 兼容旧阅读字段
  book?: string             // 书名（旧字段；阅读写作大类的活动也可填这里）
  readMode?: string         // 阅读方式：自主 / 亲子共读 / 听读 / 读伴伴读
  durationMin?: number      // 时长（分钟）
  amount?: string           // 阅读量（自由文本）
  comprehension?: number    // 理解自评（1-5；阅读写作大类用）
  interest?: number         // 兴趣度（1-5；所有大类都可用）
  parentObs?: string        // 家长观察
  note?: string             // 备注
}

interface InterestState {
  records: InterestRecord[]
  addRecord: (r: Omit<InterestRecord, 'id'> & { id?: string }) => void
  deleteRecord: (id: string) => void
  clearRecords: () => void
  syncFromCloud: () => Promise<{ ok: boolean; count?: number; error?: string }>
}

function uid() {
  return 'ci_' + Math.random().toString(36).slice(2, 9)
}

// 兼容：云端拉来的记录是中文键（飞书 schema），前端 store 用英文键；
// 这个函数把任意来源归一化成英文键 InterestRecord。
export function normalizeInterestRecord(raw: any): InterestRecord {
  if (!raw) return { id: '', date: '' }
  const pick = (cn: string, en: keyof InterestRecord): any =>
    raw[cn] !== undefined && raw[cn] !== null && raw[cn] !== '' ? raw[cn] : raw[en]
  return {
    id: raw.id || raw['本地ID'] || raw['记录ID'] || '',
    date: (raw.date || raw['日期'] || '').slice(0, 10),
    category: pick('兴趣大类', 'category') || undefined,
    activity: pick('活动名称', 'activity') || undefined,
    spontaneity: pick('自发性', 'spontaneity') != null ? Number(pick('自发性', 'spontaneity')) : undefined,
    immersion: pick('沉浸度', 'immersion') != null ? Number(pick('沉浸度', 'immersion')) : undefined,
    performance: pick('表现', 'performance') != null ? Number(pick('表现', 'performance')) : undefined,
    book: pick('书名', 'book') || undefined,
    readMode: pick('阅读方式', 'readMode') || undefined,
    durationMin: pick('时长分钟', 'durationMin') != null ? Number(pick('时长分钟', 'durationMin')) : undefined,
    amount: pick('阅读量', 'amount') || undefined,
    comprehension: pick('理解自评', 'comprehension') != null ? Number(pick('理解自评', 'comprehension')) : undefined,
    interest: pick('兴趣度', 'interest') != null ? Number(pick('兴趣度', 'interest')) : undefined,
    parentObs: pick('家长观察', 'parentObs') || undefined,
    note: raw.note || raw['备注'] || undefined,
  } as InterestRecord
}

// 阅读方式枚举（下拉用，与飞书表文本字段一致）
export const READ_MODES = ['自主', '亲子共读', '听读', '读伴伴读']

// ---- 工具：根据大类查色 ----
export function categoryColor(cat?: string): string {
  const c = INTEREST_CATEGORIES.find((x) => x.key === cat)
  return c?.color || '#94A3B8'
}
export function categoryEmoji(cat?: string): string {
  const c = INTEREST_CATEGORIES.find((x) => x.key === cat)
  return c?.emoji || '📌'
}
export function categoryIntelligences(cat?: string): IntelligenceKey[] {
  const c = INTEREST_CATEGORIES.find((x) => x.key === cat)
  return c?.intelligences || []
}

export const useInterestStore = create<InterestState>()(
  persist(
    (set) => ({
      records: [
        // 示例数据（可删除）：方便首次打开即见趋势
        {
          id: uid(), date: '2026-03-12', category: '阅读写作', activity: '哈利·波特与魔法石',
          book: '哈利·波特与魔法石', readMode: '自主', durationMin: 40, amount: '2章',
          comprehension: 4, interest: 5, spontaneity: 5, immersion: 5, performance: 4,
          parentObs: '沉浸，主动续读；连读 1 小时不愿停', note: '读伴伴读 + 自主',
        },
        {
          id: uid(), date: '2026-03-22', category: '阅读写作', activity: '昆虫记（青少版）',
          book: '昆虫记（青少版）', readMode: '亲子共读', durationMin: 25, amount: '15页',
          comprehension: 3, interest: 3, spontaneity: 2, immersion: 3, performance: 3,
          parentObs: '部分名词需解释；主动翻阅但不如哈利波特投入', note: '科普类兴趣一般',
        },
      ],
      addRecord: (r) => set((s) => ({ records: [...s.records, { ...r, id: (r as any).id || uid() }] })),
      deleteRecord: (id) => set((s) => ({ records: s.records.filter((x) => x.id !== id) })),
      clearRecords: () => set({ records: [] }),
      syncFromCloud: async () => {
        if (!getCloudSync() || !getFcUrl()) return { ok: false, error: '未开启云同步或未配置地址' }
        try {
          const list = (await feishuSync.pullInterest()) as any[]
          // 归一化：飞书返回的是中文键，转成前端 InterestRecord（英文键）
          const normalized = list.map((x) => normalizeInterestRecord(x))
          set((s) => {
            const cloudMap = new Map(normalized.map((r) => [r.id, r]))
            const merged = s.records.map((r) => cloudMap.get(r.id) || r)
            const cloudIds = new Set(normalized.map((r) => r.id))
            const localOnly = s.records.filter((r) => !cloudIds.has(r.id))
            return { records: [...merged, ...localOnly] }
          })
          return { ok: true, count: normalized.length }
        } catch (e: any) {
          return { ok: false, error: e?.message || '同步出错' }
        }
      },
    }),
    { name: 'growth-workbench-interest' }
  )
)