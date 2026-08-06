import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { feishuSync, getCloudSync, getFcUrl } from './feishuSync'

// 中高考升学助手 F 模块数据层（本地优先，M1 版）
// 说明：M1 先落地「模考记录 + 位次估算 + 目标学校」的本地数据层（与飞书表明细对齐）。
// 多 Agent 编排（估分→位次→院校概率→五维报告→顾问建议）属 M1+ 规划，本模块预留接入点，不在 M1 实现联网分析。
//
// 合规约束：
//   - 位次为家庭自估算的参考值，非官方排名；绝不做「考不上/必须冲某校」等绝对化结论。
//   - 不诊断：本模块仅记录模考客观分数与目标意向，用于看分数与位次趋势。

export interface AdmissionRecord {
  id: string
  date: string // YYYY-MM-DD
  examName?: string // 考试名（一模/二模/中考模拟/期末）
  totalScore?: number // 总分
  fullScore?: number // 满分
  rank?: number // 估算位次（全市/全区，家庭自估）
  targetSchool?: string // 目标学校
  note?: string
}

interface AdmissionState {
  records: AdmissionRecord[]
  addRecord: (r: Omit<AdmissionRecord, 'id'> & { id?: string }) => void
  deleteRecord: (id: string) => void
  updateRecord: (id: string, patch: Partial<AdmissionRecord>) => void
  clearRecords: () => void
  syncFromCloud: () => Promise<{ ok: boolean; count?: number; error?: string }>
}

function uid() {
  return 'ad_' + Math.random().toString(36).slice(2, 9)
}

export const useAdmissionStore = create<AdmissionState>()(
  persist(
    (set) => ({
      records: [
        // 示例数据（可删除）：方便首次打开即见趋势
        {
          id: uid(), date: '2026-05-12',
          examName: '七年级下期中', totalScore: 412, fullScore: 500, rank: 86,
          targetSchool: '一中思益（对口）', note: '数学建模题仍丢分',
        },
      ],
      addRecord: (r) => set((s) => ({ records: [...s.records, { ...r, id: (r as any).id || uid() }] })),
      deleteRecord: (id) => set((s) => ({ records: s.records.filter((x) => x.id !== id) })),
      updateRecord: (id, patch) => set((s) => ({ records: s.records.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      clearRecords: () => set({ records: [] }),
      syncFromCloud: async () => {
        if (!getCloudSync() || !getFcUrl()) return { ok: false, error: '未开启云同步或未配置地址' }
        try {
          const list = (await feishuSync.pullAdmission()) as unknown as AdmissionRecord[]
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
    { name: 'growth-workbench-admission' }
  )
)
