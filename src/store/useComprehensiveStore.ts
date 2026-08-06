import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { feishuSync, getCloudSync, getFcUrl } from './feishuSync'

// 五育综评对齐 K 模块数据层（本地优先）
// 字段设计与「飞书多维表格·综评对齐表」一一对应，见《数据层规范·飞书字段映射》。
// 当前用 localStorage 持久化（persist）；飞书重连后整体导出 JSON 导入，零损耗迁移。
//
// 合规约束：
//   - 本模块仅归集五育（德/智/体/美/劳）活动与佐证材料，用于对照综评口径查缺补漏；
//   - 不诊断：绝不做「综合素质差/某项不达标」等结论，材料仅靠拢、不做评判。

// 五育类别（下拉用，与飞书表文本字段一致）
export const WUYU_CATS = ['德', '智', '体', '美', '劳']
export const WUYU_STATUS = ['进行中', '已完成', '已归档']

// 学科下拉与成绩模块统一口径（小初高全学科），见 src/store/subjects.ts
import { SUBJECTS } from './subjects'
export { SUBJECTS }

export interface ComprehensiveRecord {
  id: string
  date: string // YYYY-MM-DD
  category?: string // 类别（德/智/体/美/劳）
  subject?: string // 学科（高考 9 门 + 其他；如 智育的"数学建模兴趣小组"对应"数学"）
  item?: string // 项目名
  evidence?: string // 佐证材料
  status?: string // 状态（进行中/已完成/已归档）
  note?: string
}

interface ComprehensiveState {
  records: ComprehensiveRecord[]
  addRecord: (r: Omit<ComprehensiveRecord, 'id'> & { id?: string }) => void
  deleteRecord: (id: string) => void
  updateRecord: (id: string, patch: Partial<ComprehensiveRecord>) => void
  clearRecords: () => void
  syncFromCloud: () => Promise<{ ok: boolean; count?: number; error?: string }>
}

function uid() {
  return 'wy_' + Math.random().toString(36).slice(2, 9)
}

export const useComprehensiveStore = create<ComprehensiveState>()(
  persist(
    (set) => ({
      records: [
        // 示例数据（可删除）
        { id: uid(), date: '2026-04-02', category: '体', subject: '其他', item: '校运动会 800m', evidence: '完赛证书照片', status: '已完成', note: '' },
        { id: uid(), date: '2026-05-10', category: '智', subject: '数学', item: '数学建模兴趣小组', evidence: '社团签到记录', status: '进行中', note: '' },
      ],
      addRecord: (r) => set((s) => ({ records: [...s.records, { ...r, id: (r as any).id || uid() }] })),
      deleteRecord: (id) => set((s) => ({ records: s.records.filter((x) => x.id !== id) })),
      updateRecord: (id, patch) => set((s) => ({ records: s.records.map((x) => x.id === id ? { ...x, ...patch } : x) })),
      clearRecords: () => set({ records: [] }),
      syncFromCloud: async () => {
        if (!getCloudSync() || !getFcUrl()) return { ok: false, error: '未开启云同步或未配置地址' }
        try {
          const list = (await feishuSync.pullComprehensive()) as unknown as ComprehensiveRecord[]
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
    { name: 'growth-workbench-comprehensive' }
  )
)
