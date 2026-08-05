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

// 一日四餐 + 饮水 + 补充剂 + 备注
export interface NutritionRecord {
  id: string
  date: string // YYYY-MM-DD
  breakfast?: string // 早餐
  lunch?: string // 午餐
  dinner?: string // 晚餐
  snack?: string // 加餐 / 间食
  waterMl?: number // 饮水量（毫升）
  supplement?: string // 营养补充剂（如 维D / 钙 / 鱼油）
  note?: string // 备注（挑食、外食、过敏等）
}

interface NutritionState {
  records: NutritionRecord[]
  addRecord: (r: Omit<NutritionRecord, 'id'> & { id?: string }) => void
  deleteRecord: (id: string) => void
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

export const useNutritionStore = create<NutritionState>()(
  persist(
    (set) => ({
      records: [
        // 示例数据（可删除）：方便首次打开即见趋势
        {
          id: uid(), date: '2026-03-10',
          breakfast: '牛奶+鸡蛋+包子', lunch: '学校午餐', dinner: '米饭+青菜+鱼', snack: '苹果',
          waterMl: 1200, supplement: '维D', note: '近期偏爱吃鱼',
        },
        {
          id: uid(), date: '2026-03-20',
          breakfast: '粥+咸菜', lunch: '学校午餐', dinner: '面条', snack: '',
          waterMl: 800, supplement: '维D', note: '早餐较单一',
        },
      ],
      addRecord: (r) => set((s) => ({ records: [...s.records, { ...r, id: (r as any).id || uid() }] })),
      deleteRecord: (id) => set((s) => ({ records: s.records.filter((x) => x.id !== id) })),
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
