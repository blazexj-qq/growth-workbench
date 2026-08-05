import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { feishuSync, getCloudSync, getFcUrl } from './feishuSync'

// 升学规划 E · 择校决策追踪卡（原 Q）数据层（本地优先）
// 字段设计与未来「飞书多维表格·择校决策表」一一对应，见《数据层规范·飞书字段映射》
// 当前用 localStorage 持久化（persist）；飞书重连后整体导出 JSON 导入，零损耗迁移。

export type DecisionStatus = '进行中' | '已决' | '搁置'

export interface DecisionOption {
  name: string
  pros?: string
  cons?: string
  weight?: number // 权重 0-100
}

export interface DecisionCard {
  id: string
  title: string
  context?: string
  options: DecisionOption[]
  decidedOption?: string
  status: DecisionStatus
  dateDecided?: string // YYYY-MM-DD
  note?: string
}

interface DecisionState {
  cards: DecisionCard[]
  addCard: (c: Omit<DecisionCard, 'id'> & { id?: string }) => void
  updateCard: (id: string, patch: Partial<DecisionCard>) => void
  deleteCard: (id: string) => void
  clearCards: () => void
  syncFromCloud: () => Promise<{ ok: boolean; count?: number; error?: string }>
}

function uid() {
  return 'd_' + Math.random().toString(36).slice(2, 9)
}

export const useDecisionStore = create<DecisionState>()(
  persist(
    (set) => ({
      cards: [
        // 示例：老徐正在纠结的真实决策（可删除）
        {
          id: uid(),
          title: '小升初路径：一中思益（对口公办） vs 冲民办/优录',
          context: '孩子在对口公办初中划片内，纠结要不要额外冲优录或民办。指标生鸡头策略是底线。',
          options: [
            { name: '一中思益（对口公办）', pros: '免择校、指标生资格稳、通勤近', cons: '头部资源一般', weight: 60 },
            { name: '冲优录/民办', pros: '可能更好师资', cons: '基本已死、概率低、风险大、可能失指标生资格', weight: 20 },
            { name: '先观望+强化数学建模', pros: '低成本提升校内排名', cons: '不直接解决择校', weight: 20 },
          ],
          decidedOption: '一中思益（对口公办）',
          status: '已决',
          dateDecided: '2026-07-23',
          note: '以指标生鸡头策略为底，不押宝优录/摇号',
        },
      ],
      addCard: (c) => set((s) => ({ cards: [...s.cards, { ...c, id: (c as any).id || uid() }] })),
      updateCard: (id, patch) => set((s) => ({ cards: s.cards.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteCard: (id) => set((s) => ({ cards: s.cards.filter((x) => x.id !== id) })),
      clearCards: () => set({ cards: [] }),
      syncFromCloud: async () => {
        if (!getCloudSync() || !getFcUrl()) return { ok: false, error: '未开启云同步或未配置地址' }
        try {
          const list = (await feishuSync.pullDecision()) as unknown as DecisionCard[]
          set((s) => {
            const cloudMap = new Map(list.map((r) => [r.id, r]))
            const merged = s.cards.map((r) => cloudMap.get(r.id) || r)
            const cloudIds = new Set(list.map((r) => r.id))
            const localOnly = s.cards.filter((r) => !cloudIds.has(r.id))
            return { cards: [...merged, ...localOnly] }
          })
          return { ok: true, count: list.length }
        } catch (e: any) {
          return { ok: false, error: e?.message || '同步出错' }
        }
      },
    }),
    { name: 'growth-workbench-decision' }
  )
)
