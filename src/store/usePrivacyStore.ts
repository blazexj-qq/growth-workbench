import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { feishuSync, getCloudSync, getFcUrl } from './feishuSync'

// 隐私与合规 N 模块数据层（本地优先）
// 字段设计与「飞书多维表格·隐私合规表」一一对应，见《数据层规范·飞书字段映射》。
//
// 本模块落实 V2 方案「N 补三项」：
//   1) 监护人单独同意（guardianConsent）
//   2) 数据勘误申诉（records 中 type=数据勘误申诉）
//   3) 孩子可暂停记录（childPause 全局开关，AppLayout 据此显示横幅）
// 并含孩子端可见性规则说明（原 S 模块并入）。

export const PRIVACY_TYPES = ['监护人同意', '数据勘误申诉', '孩子暂停记录', '孩子恢复记录', '其他']
export const PRIVACY_STATUS = ['待处理', '已处理', '已驳回']

export interface PrivacyRecord {
  id: string
  date: string // YYYY-MM-DD
  type?: string // 类型
  content?: string // 内容
  status?: string // 状态
  note?: string
}

export interface GuardianConsent {
  agreed: boolean
  date?: string
}

interface PrivacyState {
  guardianConsent: GuardianConsent
  childPause: boolean
  records: PrivacyRecord[]
  setConsent: (agreed: boolean, date?: string) => void
  setPause: (paused: boolean) => void
  addRecord: (r: Omit<PrivacyRecord, 'id'> & { id?: string }) => void
  deleteRecord: (id: string) => void
  clearRecords: () => void
  syncFromCloud: () => Promise<{ ok: boolean; count?: number; error?: string }>
}

function uid() {
  return 'pv_' + Math.random().toString(36).slice(2, 9)
}

export const usePrivacyStore = create<PrivacyState>()(
  persist(
    (set) => ({
      guardianConsent: { agreed: false },
      childPause: false,
      records: [],
      setConsent: (agreed, date) => set((s) => ({ guardianConsent: { agreed, date: date || s.guardianConsent.date } })),
      setPause: (paused) => set({ childPause: paused }),
      addRecord: (r) => set((s) => ({ records: [...s.records, { ...r, id: (r as any).id || uid() }] })),
      deleteRecord: (id) => set((s) => ({ records: s.records.filter((x) => x.id !== id) })),
      clearRecords: () => set({ records: [] }),
      syncFromCloud: async () => {
        if (!getCloudSync() || !getFcUrl()) return { ok: false, error: '未开启云同步或未配置地址' }
        try {
          const list = (await feishuSync.pullPrivacy()) as unknown as PrivacyRecord[]
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
    { name: 'growth-workbench-privacy' }
  )
)
