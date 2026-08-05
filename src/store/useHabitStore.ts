import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { feishuSync, getCloudSync, getFcUrl } from './feishuSync'

// 时间管理与习惯养成 H 模块数据层（本地优先）
// 字段设计与「飞书多维表格·习惯打卡表」一一对应，见《数据层规范·飞书字段映射》。
// 当前用 localStorage 持久化（persist）；飞书重连后整体导出 JSON 导入，零损耗迁移。
//
// 合规约束：
//   - 本模块仅记录每日习惯打卡（是否完成/时长），用于看坚持度与节律；
//   - 不诊断：绝不做「自律差/习惯不好」等评判；打卡中断不批评，仅观察趋势。

export interface HabitRecord {
  id: string
  date: string // YYYY-MM-DD
  habit?: string // 习惯名（如 晨读/运动/错题复盘）
  completed?: number // 是否完成（1/0）
  durationMin?: number // 时长（分钟）
  note?: string
}

interface HabitState {
  records: HabitRecord[]
  addRecord: (r: Omit<HabitRecord, 'id'> & { id?: string }) => void
  deleteRecord: (id: string) => void
  clearRecords: () => void
  syncFromCloud: () => Promise<{ ok: boolean; count?: number; error?: string }>
}

function uid() {
  return 'hb_' + Math.random().toString(36).slice(2, 9)
}

export const useHabitStore = create<HabitState>()(
  persist(
    (set) => ({
      records: [
        // 示例数据（可删除）
        { id: uid(), date: '2026-05-01', habit: '晨读', completed: 1, durationMin: 15, note: '' },
        { id: uid(), date: '2026-05-02', habit: '错题复盘', completed: 0, durationMin: 0, note: '作业多跳了' },
      ],
      addRecord: (r) => set((s) => ({ records: [...s.records, { ...r, id: (r as any).id || uid() }] })),
      deleteRecord: (id) => set((s) => ({ records: s.records.filter((x) => x.id !== id) })),
      clearRecords: () => set({ records: [] }),
      syncFromCloud: async () => {
        if (!getCloudSync() || !getFcUrl()) return { ok: false, error: '未开启云同步或未配置地址' }
        try {
          const list = (await feishuSync.pullHabit()) as unknown as HabitRecord[]
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
    { name: 'growth-workbench-habit' }
  )
)
