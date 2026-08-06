import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { feishuSync, getCloudSync, getFcUrl } from './feishuSync'

// 成长档案管理 G 模块数据层（本地优先）
// 字段设计与「飞书多维表格·成长档案表」一一对应，见《数据层规范·飞书字段映射》。
// 当前用 localStorage 持久化（persist）；飞书重连后整体导出 JSON 导入，零损耗迁移。

export const ARCHIVE_CATS = ['里程碑', '奖项荣誉', '重要决定', '作品', '体检/发育', '其他']

export interface ArchiveRecord {
  id: string
  date: string // YYYY-MM-DD
  title?: string // 标题
  category?: string // 类别
  description?: string // 描述
  evidence?: string // 佐证材料（链接/说明）
  note?: string
}

interface ArchiveState {
  records: ArchiveRecord[]
  addRecord: (r: Omit<ArchiveRecord, 'id'> & { id?: string }) => void
  deleteRecord: (id: string) => void
  updateRecord: (id: string, patch: Partial<ArchiveRecord>) => void
  clearRecords: () => void
  syncFromCloud: () => Promise<{ ok: boolean; count?: number; error?: string }>
}

function uid() {
  return 'ga_' + Math.random().toString(36).slice(2, 9)
}

export const useArchiveStore = create<ArchiveState>()(
  persist(
    (set) => ({
      records: [
        { id: uid(), date: '2026-06-30', title: '独立读完第一本 chapter book', category: '里程碑', description: '自主阅读跨越式进步', evidence: '', note: '' },
        { id: uid(), date: '2026-07-15', title: '校科技节三等奖', category: '奖项荣誉', description: '小制作《太阳能小车》', evidence: '', note: '' },
      ],
      addRecord: (r) => set((s) => ({ records: [...s.records, { ...r, id: (r as any).id || uid() }] })),
      deleteRecord: (id) => set((s) => ({ records: s.records.filter((x) => x.id !== id) })),
      updateRecord: (id, patch) => set((s) => ({ records: s.records.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      clearRecords: () => set({ records: [] }),
      syncFromCloud: async () => {
        if (!getCloudSync() || !getFcUrl()) return { ok: false, error: '未开启云同步或未配置地址' }
        try {
          const list = (await feishuSync.pullArchive()) as unknown as ArchiveRecord[]
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
    { name: 'growth-workbench-archive' }
  )
)
