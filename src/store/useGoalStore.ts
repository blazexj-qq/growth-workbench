import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { feishuSync, getCloudSync, getFcUrl } from './feishuSync'

// 目标管理 / 愿景板 I 模块数据层（本地优先）
// 字段设计与「飞书多维表格·目标管理表」一一对应（表已建：tblEGX1cjut8Atn9），见《数据层规范·飞书字段映射》。
// 当前用 localStorage 持久化（persist）；飞书重连后整体导出 JSON 导入，零损耗迁移。
//
// 合规约束：
//   - 本模块仅记录目标拆解与进度，用于自我管理可视化；
//   - 不诊断：绝不做「目标不切实际/必然失败」等评判，进度仅为参考。

export const GOAL_CATS = ['学业', '身体', '兴趣', '习惯', '其他']
export const GOAL_STATUS = ['进行中', '已完成', '已暂停', '已放弃']

export interface GoalRecord {
  id: string
  createdAt: string // 创建日期 YYYY-MM-DD
  category?: string // 目标类别
  content?: string // 目标内容
  dueDate?: string // 截止日期 YYYY-MM-DD
  status?: string // 状态
  progress?: number // 进度 0-100
  review?: string // 复盘
  note?: string
}

interface GoalState {
  records: GoalRecord[]
  addRecord: (r: Omit<GoalRecord, 'id'> & { id?: string }) => void
  deleteRecord: (id: string) => void
  clearRecords: () => void
  syncFromCloud: () => Promise<{ ok: boolean; count?: number; error?: string }>
}

function uid() {
  return 'go_' + Math.random().toString(36).slice(2, 9)
}

export const useGoalStore = create<GoalState>()(
  persist(
    (set) => ({
      records: [
        // 示例数据（可删除）
        {
          id: uid(), createdAt: '2026-03-01',
          category: '学业', content: '本学期数学建模题不丢分', dueDate: '2026-07-01',
          status: '进行中', progress: 60, review: '已加练 10 套', note: '',
        },
        {
          id: uid(), createdAt: '2026-03-05',
          category: '习惯', content: '每天阅读 30 分钟', dueDate: '2026-12-31',
          status: '进行中', progress: 45, review: '多数日子达成', note: '',
        },
      ],
      addRecord: (r) => set((s) => ({ records: [...s.records, { ...r, id: (r as any).id || uid() }] })),
      deleteRecord: (id) => set((s) => ({ records: s.records.filter((x) => x.id !== id) })),
      clearRecords: () => set({ records: [] }),
      syncFromCloud: async () => {
        if (!getCloudSync() || !getFcUrl()) return { ok: false, error: '未开启云同步或未配置地址' }
        try {
          const list = (await feishuSync.pullGoal()) as unknown as GoalRecord[]
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
    { name: 'growth-workbench-goal' }
  )
)
