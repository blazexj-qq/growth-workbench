import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { feishuSync, getCloudSync, getFcUrl } from './feishuSync'

// 营养与膳食管理 O 模块数据层（本地优先）
// 字段设计与未来「飞书多维表格·营养与膳食表」一一对应，见《数据层规范·飞书字段映射》
// 当前用 localStorage 持久化（persist）；飞书重连后整体导出 JSON 导入，零损耗迁移。
//
// 合规约束（见集成优化 V2）：
//   - 不诊断：本模块仅记录每日饮食客观情况（吃了什么、喝了多少、有无补充剂），
//     用于看规律与趋势；绝不做「营养不良/发育迟缓」等医学诊断结论，持续异常仅提示咨询专业机构。
//   - 防焦虑：饮食只做记录与小结，不给孩子贴"吃得太少/太挑食"等标签；体重类敏感项在 B 模块且仅家长端。

// 一日四餐 + 饮食结构 + 饮水 + 补充剂 + 备注
// 依据《中国学龄儿童膳食指南(2022)》：
//   - 早餐应含谷薯/蔬果/肉蛋奶/大豆坚果中 3 类及以上
//   - 天天喝奶 300ml 以上
//   - 足量饮水 800-1400ml，首选白水，不喝含糖饮料
//   - 合理选择零食，减少高盐高糖高脂
export interface NutritionRecord {
  id: string
  date: string // YYYY-MM-DD
  breakfast?: string // 早餐（文字）
  lunch?: string // 午餐（文字）
  dinner?: string // 晚餐（文字）
  snack?: string // 加餐 / 间食（文字）

  // 新增：更符合学龄儿童膳食指南的维度
  breakfastScore?: number // 早餐质量：0未吃 1仅1类 2含2类 3含3类及以上
  veg?: number // 蔬菜份数（约1拳头/份，当天累计）
  fruit?: number // 水果份数（约1拳头/份）
  milk?: boolean // 今天喝奶/奶制品是否≥300ml
  waterMl?: number // 主动饮水量（毫升）——改为可选，允许只记杯数
  waterCups?: number // 饮水杯/瓶数（简化记录，适合零碎时间）
  sugarDrink?: number // 含糖饮料次数（0=无，1-2=少量，3+=偏多）
  snackHealthy?: number // 零食健康度：1不健康（高糖高脂） 2一般 3健康（水果/奶/坚果）
  screenWhileEating?: boolean // 是否边吃饭边看屏幕
  eatOut?: boolean // 是否在外就餐

  supplement?: string // 营养补充剂（如 维D / 钙 / 鱼油）
  note?: string // 备注（挑食、外食、过敏等）
}

interface NutritionState {
  records: NutritionRecord[]
  addRecord: (r: Omit<NutritionRecord, 'id'> & { id?: string }) => void
  deleteRecord: (id: string) => void
  updateRecord: (id: string, patch: Partial<NutritionRecord>) => void
  clearRecords: () => void
  syncFromCloud: () => Promise<{ ok: boolean; count?: number; error?: string }>
}

function uid() {
  return 'nu_' + Math.random().toString(36).slice(2, 9)
}

// 已记录几餐（用于看"三餐是否规律"）
export function mealCount(r: NutritionRecord): number {
  return ['breakfast', 'lunch', 'dinner', 'snack'].filter((k) => !!(r as any)[k]).length
}

// 早餐质量文字
export function breakfastScoreText(score?: number) {
  if (score == null) return '未评'
  const map: Record<number, string> = {
    0: '未吃/仅饮料',
    1: '1类（单一）',
    2: '2类（一般）',
    3: '3类及以上（优质）',
  }
  return map[score] ?? '未评'
}

// 当天膳食结构得分：0-5（早餐+蔬果+奶+饮水+零食健康+无含糖饮料）
export function dietScore(r: NutritionRecord): number {
  let s = 0
  if ((r.breakfastScore || 0) >= 3) s += 1
  if ((r.veg || 0) >= 2 && (r.fruit || 0) >= 1) s += 1 // 蔬果合计3份以上
  if (r.milk) s += 1
  if ((r.waterMl || 0) >= 600 || (r.waterCups || 0) >= 3) s += 1
  if ((r.sugarDrink || 0) === 0) s += 1
  if ((r.snackHealthy || 0) >= 2) s += 1
  return s
}

export const useNutritionStore = create<NutritionState>()(
  persist(
    (set) => ({
      records: [
        // 示例数据（可删除）：方便首次打开即见趋势
        {
          id: uid(), date: '2026-03-10',
          breakfast: '牛奶+鸡蛋+包子', lunch: '学校午餐', dinner: '米饭+青菜+鱼', snack: '苹果',
          breakfastScore: 3, veg: 2, fruit: 1, milk: true,
          waterMl: 1200, waterCups: 5, sugarDrink: 0, snackHealthy: 3,
          screenWhileEating: false, eatOut: false,
          supplement: '维D', note: '近期偏爱吃鱼',
        },
        {
          id: uid(), date: '2026-03-20',
          breakfast: '粥+咸菜', lunch: '学校午餐', dinner: '面条', snack: '薯片',
          breakfastScore: 1, veg: 1, fruit: 0, milk: false,
          waterMl: 800, waterCups: 3, sugarDrink: 1, snackHealthy: 1,
          screenWhileEating: true, eatOut: false,
          supplement: '维D', note: '早餐较单一',
        },
      ],
      addRecord: (r) => set((s) => ({ records: [...s.records, { ...r, id: (r as any).id || uid() }] })),
      deleteRecord: (id) => set((s) => ({ records: s.records.filter((x) => x.id !== id) })),
      updateRecord: (id, patch) => set((s) => ({ records: s.records.map((x) => x.id === id ? { ...x, ...patch } : x) })),
      clearRecords: () => set({ records: [] }),
      syncFromCloud: async () => {
        if (!getCloudSync() || !getFcUrl()) return { ok: false, error: '未开启云同步或未配置地址' }
        try {
          const list = (await feishuSync.pullNutrition()) as unknown as NutritionRecord[]
          set((s) => {
            const cloudMap = new Map(list.map((r) => [r.id, r]))
            const merged = s.records.map((r) => cloudMap.get(r.id) || r)
            const cloudIds = new Set(list.map((r) => r.id))
            const localOnly = s.records.filter((r) => !cloudIds.has(r.id))
            return { records: [...merged, ...localOnly] }
          })
          return { ok: true, count: list.length }
        } catch (e: any) {
          return { ok: false, error: e?.message || '同步出错' }
        }
      },
    }),
    { name: 'growth-workbench-nutrition' }
  )
)
