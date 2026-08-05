import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { feishuSync, getCloudSync, getFcUrl } from './feishuSync'

// 家庭资源与人脉图谱 M 模块数据层（本地优先）
// 字段设计与「飞书多维表格·家庭资源表」一一对应，见《数据层规范·飞书字段映射》。
// 当前用 localStorage 持久化（persist）；飞书重连后整体导出 JSON 导入，零损耗迁移。

export const RESOURCE_CATS = ['书籍资料', '课程/网课', 'APP/工具', '人脉/榜样', '场地/机构', '其他']
export const RESOURCE_STATUS = ['在用', '闲置', '待启用', '已转赠']

export interface ResourceRecord {
  id: string
  date: string // YYYY-MM-DD
  name?: string // 资源名称
  category?: string // 类别
  source?: string // 来源/获取渠道
  status?: string // 状态（在用/闲置/待启用/已转赠）
  note?: string
}

interface ResourceState {
  records: ResourceRecord[]
  addRecord: (r: Omit<ResourceRecord, 'id'> & { id?: string }) => void
  deleteRecord: (id: string) => void
  clearRecords: () => void
  syncFromCloud: () => Promise<{ ok: boolean; count?: number; error?: string }>
}

function uid() {
  return 'rs_' + Math.random().toString(36).slice(2, 9)
}

export const useResourceStore = create<ResourceState>()(
  persist(
    (set) => ({
      records: [
        { id: uid(), date: '2026-07-10', name: '小学数学思维训练（书）', category: '书籍资料', source: '网购', status: '在用', note: '' },
        { id: uid(), date: '2026-07-20', name: '表姐（985在读，可请教）', category: '人脉/榜样', source: '家庭', status: '在用', note: '孩子崇拜的榜样' },
      ],
      addRecord: (r) => set((s) => ({ records: [...s.records, { ...r, id: (r as any).id || uid() }] })),
      deleteRecord: (id) => set((s) => ({ records: s.records.filter((x) => x.id !== id) })),
      clearRecords: () => set({ records: [] }),
      syncFromCloud: async () => {
        if (!getCloudSync() || !getFcUrl()) return { ok: false, error: '未开启云同步或未配置地址' }
        try {
          const list = (await feishuSync.pullResource()) as unknown as ResourceRecord[]
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
    { name: 'growth-workbench-resource' }
  )
)
