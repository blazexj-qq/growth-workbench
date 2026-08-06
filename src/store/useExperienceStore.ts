import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { feishuSync, getCloudSync, getFcUrl } from './feishuSync'

// 职业体验库 R 模块数据层（本地优先）
// 字段设计与「飞书多维表格·职业体验表」一一对应，见《数据层规范·飞书字段映射》。
// 当前用 localStorage 持久化（persist）；飞书重连后整体导出 JSON 导入，零损耗迁移。
//
// 合规约束：
//   - 本模块是真实职业体验/访谈的轻量素材库，非就业对接；
//   - 不评判体验好坏，仅记录客观信息与孩子自评分，供日后回看。

export const EXP_FORMS = ['参观', '访谈', '角色扮演', '影子学习', '夏令营', '社会实践', '其他']

export interface ExperienceRecord {
  id: string
  date: string // YYYY-MM-DD
  career?: string // 体验职业/角色
  form?: string // 形式
  venue?: string // 地点/机构
  durationMin?: number // 时长分钟（可选）
  rating?: number // 兴趣评分 1-5（孩子自评）
  gain?: string // 收获/感想
  note?: string
}

interface ExperienceState {
  records: ExperienceRecord[]
  addRecord: (r: Omit<ExperienceRecord, 'id'> & { id?: string }) => void
  deleteRecord: (id: string) => void
  updateRecord: (id: string, patch: Partial<ExperienceRecord>) => void
  clearRecords: () => void
  syncFromCloud: () => Promise<{ ok: boolean; count?: number; error?: string }>
}

function uid() {
  return 'ex_' + Math.random().toString(36).slice(2, 9)
}

export const useExperienceStore = create<ExperienceState>()(
  persist(
    (set) => ({
      records: [
        // 示例数据（可删除）
        { id: uid(), date: '2026-05-20', career: '消防站开放日', form: '参观', venue: '区消防中队', durationMin: 120, rating: 5, gain: '第一次摸消防车，说长大想当消防员', note: '' },
        { id: uid(), date: '2026-06-28', career: '面包店学徒', form: '角色扮演', venue: '社区烘焙坊', durationMin: 90, rating: 4, gain: '自己烤了面包很开心，对"做东西"有兴趣', note: '' },
      ],
      addRecord: (r) => set((s) => ({ records: [...s.records, { ...r, id: (r as any).id || uid() }] })),
      deleteRecord: (id) => set((s) => ({ records: s.records.filter((x) => x.id !== id) })),
      updateRecord: (id, patch) => set((s) => ({ records: s.records.map((x) => x.id === id ? { ...x, ...patch } : x) })),
      clearRecords: () => set({ records: [] }),
      syncFromCloud: async () => {
        if (!getCloudSync() || !getFcUrl()) return { ok: false, error: '未开启云同步或未配置地址' }
        try {
          const list = (await feishuSync.pullExperience()) as unknown as ExperienceRecord[]
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
    { name: 'growth-workbench-experience' }
  )
)
