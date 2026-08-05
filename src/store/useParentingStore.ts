import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { feishuSync, getCloudSync, getFcUrl } from './feishuSync'

// 亲子关系管理 D 模块数据层（本地优先）
// 字段设计与「飞书多维表格·亲子互动表」一一对应（表已建：tblYUQ8K9WcYDUfP），见《数据层规范·飞书字段映射》
// 当前用 localStorage 持久化（persist）；飞书重连后整体导出 JSON 导入，零损耗迁移。
//
// 合规约束（见集成优化 V2）：
//   - 不诊断：本模块仅记录亲子互动客观情况与双方情绪评分趋势，用于看陪伴质量与情绪走向；
//     绝不做「家庭关系紧张/依恋问题」等心理诊断结论，持续异常仅提示咨询专业机构或学校心理老师。
//   - 防焦虑：情绪评分只做趋势观察，不给孩子或家长贴"脾气差/关系不好"等标签；评分仅家长端可见。

// 亲子活动类型（下拉用，与飞书表文本字段一致）
export const PARENTING_TYPES = ['深度谈话', '游戏', '运动', '陪伴作业', '共同出游', '共读', '其他']

export interface ParentingRecord {
  id: string
  date: string // YYYY-MM-DD
  type?: string // 活动类型
  durationMin?: number // 时长（分钟）
  childMood?: number // 孩子情绪（1-5，1 低落 → 5 愉悦）
  parentMood?: number // 家长情绪（1-5，1 低落 → 5 愉悦）
  keyPoint?: string // 沟通要点
  note?: string // 备注
}

interface ParentingState {
  records: ParentingRecord[]
  addRecord: (r: Omit<ParentingRecord, 'id'> & { id?: string }) => void
  deleteRecord: (id: string) => void
  clearRecords: () => void
  syncFromCloud: () => Promise<{ ok: boolean; count?: number; error?: string }>
}

function uid() {
  return 'pa_' + Math.random().toString(36).slice(2, 9)
}

export const useParentingStore = create<ParentingState>()(
  persist(
    (set) => ({
      records: [
        // 示例数据（可删除）：方便首次打开即见趋势
        {
          id: uid(), date: '2026-03-14',
          type: '共同出游', durationMin: 120, childMood: 5, parentMood: 5,
          keyPoint: '去玄武湖骑行，聊学校趣事', note: '',
        },
        {
          id: uid(), date: '2026-03-24',
          type: '陪伴作业', durationMin: 35, childMood: 3, parentMood: 3,
          keyPoint: '数学建模题卡壳，有点急', note: '下次先缓情绪再讲题',
        },
      ],
      addRecord: (r) => set((s) => ({ records: [...s.records, { ...r, id: (r as any).id || uid() }] })),
      deleteRecord: (id) => set((s) => ({ records: s.records.filter((x) => x.id !== id) })),
      clearRecords: () => set({ records: [] }),
      syncFromCloud: async () => {
        if (!getCloudSync() || !getFcUrl()) return { ok: false, error: '未开启云同步或未配置地址' }
        try {
          const list = (await feishuSync.pullParenting()) as unknown as ParentingRecord[]
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
    { name: 'growth-workbench-parenting' }
  )
)
