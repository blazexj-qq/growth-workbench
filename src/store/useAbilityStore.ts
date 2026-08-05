import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { feishuSync, getCloudSync, getFcUrl } from './feishuSync'

// 学习能力画像 P 模块数据层（本地优先）
// 字段设计与未来「飞书多维表格·学习能力表」一一对应，见《数据层规范·飞书字段映射》
// 当前用 localStorage 持久化（persist）；飞书重连后整体导出 JSON 导入，零损耗迁移。
//
// 合规约束（见集成优化 V2）：
//   - 不诊断：本模块仅记录家长/老师的日常观察评分（1-5），用于看趋势；
//     绝不做「多动症/读写障碍」等医学诊断结论，持续异常仅提示寻求专业评估。
//   - 防焦虑：得分只是观察参考，不贴标签、不给孩子看排名式结论。

// 6 个核心维度（键名与飞书字段一致，均为中文；1-5 分，5 最好）
export const ABILITY_DIMS = ['注意力', '工作记忆', '逻辑思维', '语言理解', '执行功能', '学习动机'] as const
export type AbilityDim = (typeof ABILITY_DIMS)[number]
export type AbilityScores = Partial<Record<AbilityDim, number>>

export interface AbilityRecord {
  id: string
  date: string // YYYY-MM-DD
  scores: AbilityScores
  note?: string
}

interface AbilityState {
  records: AbilityRecord[]
  addRecord: (r: Omit<AbilityRecord, 'id'> & { id?: string }) => void
  deleteRecord: (id: string) => void
  clearRecords: () => void
  syncFromCloud: () => Promise<{ ok: boolean; count?: number; error?: string }>
}

function uid() {
  return 'ab_' + Math.random().toString(36).slice(2, 9)
}

// 综合分（各维度平均，1-5）
export function abilityAvg(r: AbilityRecord): number | undefined {
  const vals = ABILITY_DIMS.map((d) => r.scores[d]).filter((v): v is number => typeof v === 'number')
  if (!vals.length) return undefined
  return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1))
}

export const useAbilityStore = create<AbilityState>()(
  persist(
    (set) => ({
      records: [
        // 示例数据（可删除）：方便首次打开即见雷达对比
        { id: uid(), date: '2025-09-15', scores: { 注意力: 3, 工作记忆: 3, 逻辑思维: 4, 语言理解: 4, 执行功能: 3, 学习动机: 4 }, note: '四年级期初观察' },
        { id: uid(), date: '2026-03-15', scores: { 注意力: 4, 工作记忆: 4, 逻辑思维: 4, 语言理解: 4, 执行功能: 4, 学习动机: 4 }, note: '学期中观察' },
      ],
      addRecord: (r) => set((s) => ({ records: [...s.records, { ...r, id: (r as any).id || uid() }] })),
      deleteRecord: (id) => set((s) => ({ records: s.records.filter((x) => x.id !== id) })),
      clearRecords: () => set({ records: [] }),
      syncFromCloud: async () => {
        if (!getCloudSync() || !getFcUrl()) return { ok: false, error: '未开启云同步或未配置地址' }
        try {
          const list = (await feishuSync.pullAbility()) as unknown as AbilityRecord[]
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
    { name: 'growth-workbench-ability' }
  )
)
