import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { feishuSync, getCloudSync, getFcUrl } from './feishuSync'

// 多维预警中心 L 模块数据层（本地优先）
// 字段设计与「飞书多维表格·预警记录表」一一对应，见《数据层规范·飞书字段映射》。
//
// 合规约束（重要）：本模块是「温和提醒 + 处理闭环」，绝不是诊断机：
//   - 自动提醒只统计「多久没记录」（数据缺口），不评判孩子好坏、不预测人生；
//   - 分级（一般/重点/紧急）仅用于排序轻重，措辞正向、防焦虑；
//   - 任何结论都标注「观察、非诊断」。

export const ALERT_LEVELS = ['一般', '重点', '紧急']
export const ALERT_DIMS = ['成绩', '身心', '营养', '亲子', '升学', '习惯', '其他']

export interface AlertRecord {
  id: string
  date: string // YYYY-MM-DD
  level?: string // 一般/重点/紧急
  dimension?: string // 维度
  content?: string // 内容
  handled?: number // 0/1 是否已处理
  note?: string
}

interface AlertState {
  records: AlertRecord[]
  addRecord: (r: Omit<AlertRecord, 'id'> & { id?: string }) => void
  deleteRecord: (id: string) => void
  clearRecords: () => void
  setHandled: (id: string, handled: number) => void
  syncFromCloud: () => Promise<{ ok: boolean; count?: number; error?: string }>
}

function uid() {
  return 'al_' + Math.random().toString(36).slice(2, 9)
}

export const useAlertStore = create<AlertState>()(
  persist(
    (set) => ({
      records: [],
      addRecord: (r) => set((s) => ({ records: [...s.records, { ...r, id: (r as any).id || uid() }] })),
      deleteRecord: (id) => set((s) => ({ records: s.records.filter((x) => x.id !== id) })),
      clearRecords: () => set({ records: [] }),
      setHandled: (id, handled) => set((s) => ({ records: s.records.map((x) => (x.id === id ? { ...x, handled } : x)) })),
      syncFromCloud: async () => {
        if (!getCloudSync() || !getFcUrl()) return { ok: false, error: '未开启云同步或未配置地址' }
        try {
          const list = (await feishuSync.pullAlert()) as unknown as AlertRecord[]
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
    { name: 'growth-workbench-alert' }
  )
)
