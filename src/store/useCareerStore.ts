import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { feishuSync, getCloudSync, getFcUrl } from './feishuSync'

// 生涯启蒙与职业探索 J 模块数据层（本地优先）
// 字段设计与「飞书多维表格·生涯探索表」一一对应，见《数据层规范·飞书字段映射》。
// 当前用 localStorage 持久化（persist）；飞书重连后整体导出 JSON 导入，零损耗迁移。
//
// 合规约束（重要）：
//   - 本模块只记录孩子的兴趣萌芽与职业好奇，是「种下方向感」的轻量留痕；
//   - 绝不据此做职业适配/能力定论；规划只到高考为止，就业重活延后；
//   - 任何汇总都标注"兴趣记录、非结论"，防焦虑。

export const CAREER_DOMAINS = ['自然科学', '工程技术', '医学健康', '人文社科', '艺术体育', '商业', '其他']
export const CAREER_SOURCES = ['阅读', '视频', '家庭讨论', '学校活动', '亲身体验', '其他']
export const CAREER_STATUS = ['萌芽', '感兴趣', '持续关注', '暂放']

export interface CareerRecord {
  id: string
  date: string // YYYY-MM-DD
  title?: string // 主题/方向（如"想当医生"）
  domain?: string // 方向领域
  source?: string // 触发来源
  thought?: string // 想法/描述
  status?: string // 状态（萌芽/感兴趣/持续关注/暂放）
  note?: string
}

interface CareerState {
  records: CareerRecord[]
  addRecord: (r: Omit<CareerRecord, 'id'> & { id?: string }) => void
  deleteRecord: (id: string) => void
  clearRecords: () => void
  syncFromCloud: () => Promise<{ ok: boolean; count?: number; error?: string }>
}

function uid() {
  return 'ca_' + Math.random().toString(36).slice(2, 9)
}

export const useCareerStore = create<CareerState>()(
  persist(
    (set) => ({
      records: [
        // 示例数据（可删除）
        { id: uid(), date: '2026-06-10', title: '想当儿科医生', domain: '医学健康', source: '家庭讨论', thought: '说喜欢照顾小动物，觉得医生很厉害', status: '感兴趣', note: '' },
        { id: uid(), date: '2026-07-02', title: '对桥梁建筑好奇', domain: '工程技术', source: '亲身体验', thought: '参观桥梁后一直问桥怎么造的', status: '萌芽', note: '' },
      ],
      addRecord: (r) => set((s) => ({ records: [...s.records, { ...r, id: (r as any).id || uid() }] })),
      deleteRecord: (id) => set((s) => ({ records: s.records.filter((x) => x.id !== id) })),
      clearRecords: () => set({ records: [] }),
      syncFromCloud: async () => {
        if (!getCloudSync() || !getFcUrl()) return { ok: false, error: '未开启云同步或未配置地址' }
        try {
          const list = (await feishuSync.pullCareer()) as unknown as CareerRecord[]
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
    { name: 'growth-workbench-career' }
  )
)
