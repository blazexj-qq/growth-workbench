import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { feishuSync, getCloudSync, getFcUrl } from './feishuSync'

// 家校沟通台账 T 模块数据层（本地优先）
// 字段设计与「飞书多维表格·家校台账表」一一对应，见《数据层规范·飞书字段映射》。
// 当前用 localStorage 持久化（persist）；飞书重连后整体导出 JSON 导入，零损耗迁移。
//
// 合规约束：
//   - 本模块仅记录老师原话/通知/作业量等家校信息，用于补全学校信息源、看沟通密度；
//   - 不评价老师或学校；AI 结构化摘要仅作便利性整理，非结论。

export const HS_CHANNELS = ['老师口头', '班级通知', '作业群', '家长会', '私信', '其他']
export const HS_TYPES = ['通知', '作业量', '表扬', '提醒', '问题', '其他']

export interface HomeSchoolRecord {
  id: string
  date: string // YYYY-MM-DD
  channel?: string // 渠道
  from?: string // 来源（老师姓名/学科）
  content?: string // 内容摘要
  type?: string // 类型（通知/作业量/表扬/提醒/问题）
  note?: string
}

interface HomeSchoolState {
  records: HomeSchoolRecord[]
  addRecord: (r: Omit<HomeSchoolRecord, 'id'> & { id?: string }) => void
  deleteRecord: (id: string) => void
  updateRecord: (id: string, patch: Partial<HomeSchoolRecord>) => void
  clearRecords: () => void
  syncFromCloud: () => Promise<{ ok: boolean; count?: number; error?: string }>
}

function uid() {
  return 'hs_' + Math.random().toString(36).slice(2, 9)
}

export const useHomeSchoolStore = create<HomeSchoolState>()(
  persist(
    (set) => ({
      records: [
        // 示例数据（可删除）
        { id: uid(), date: '2026-05-08', channel: '班级通知', from: '班主任', content: '下周三春游，需签署同意书', type: '通知', note: '' },
        { id: uid(), date: '2026-05-15', channel: '私信', from: '数学老师', content: '建模题建议加练，近期作业量略增', type: '作业量', note: '' },
      ],
      addRecord: (r) => set((s) => ({ records: [...s.records, { ...r, id: (r as any).id || uid() }] })),
      deleteRecord: (id) => set((s) => ({ records: s.records.filter((x) => x.id !== id) })),
      updateRecord: (id, patch) => set((s) => ({ records: s.records.map((x) => x.id === id ? { ...x, ...patch } : x) })),
      clearRecords: () => set({ records: [] }),
      syncFromCloud: async () => {
        if (!getCloudSync() || !getFcUrl()) return { ok: false, error: '未开启云同步或未配置地址' }
        try {
          const list = (await feishuSync.pullHomeSchool()) as unknown as HomeSchoolRecord[]
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
    { name: 'growth-workbench-homeSchool' }
  )
)
