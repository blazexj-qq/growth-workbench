import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { feishuSync, getCloudSync, getFcUrl } from './feishuSync'

// 身心健康与身体发育监测 B 模块数据层（本地优先）
// 字段设计与未来「飞书多维表格·身心监测表」一一对应，见《数据层规范·飞书字段映射》
// 当前用 localStorage 持久化（persist）；飞书重连后可整体导出 JSON 导入，零损耗迁移。
//
// 合规约束（见集成优化 V2）：
//   - 不诊断：BMI/视力分级仅由代码按通用阈值判定并提示就医，绝不做医学诊断结论。
//   - 防焦虑：体重/克数等仅家长端可见（本工作台无孩子端视图）。
//   - 采集频率分层：身高/体重属年频（一学期 1–2 次即可），睡眠/运动可更勤。

export type Mood = '好' | '中' | '差'

export interface HealthRecord {
  id: string
  date: string // YYYY-MM-DD
  height?: number // cm
  weight?: number // kg
  visionLeft?: number // 如 5.0
  visionRight?: number // 如 4.8
  sleepHours?: number // 睡眠小时
  exerciseMin?: number // 运动分钟
  mood?: Mood
  note?: string
}

interface HealthState {
  records: HealthRecord[]
  addRecord: (r: Omit<HealthRecord, 'id'> & { id?: string }) => void
  deleteRecord: (id: string) => void
  updateRecord: (id: string, patch: Partial<HealthRecord>) => void
  clearRecords: () => void
  syncFromCloud: () => Promise<{ ok: boolean; count?: number; error?: string }>
}

function uid() {
  return 'h_' + Math.random().toString(36).slice(2, 9)
}

// BMI（kg/m^2）= 体重 / (身高/100)^2；身高缺失或 0 时返回 undefined
export function calcBmi(r: Pick<HealthRecord, 'height' | 'weight'>): number | undefined {
  if (!r.height || !r.weight) return undefined
  const m = r.height / 100
  if (m <= 0) return undefined
  return Number((r.weight / (m * m)).toFixed(1))
}

// BMI 粗略分级（通用成人标准，仅作参考，非医学诊断）。儿童建议以儿科/保健科为准。
export function bmiCategory(bmi: number): { label: string; color: string; warn: boolean } {
  if (bmi < 18.5) return { label: '偏瘦', color: '#F59E0B', warn: true }
  if (bmi < 24) return { label: '正常', color: '#0EA5A4', warn: false }
  if (bmi < 28) return { label: '超重', color: '#F97316', warn: true }
  return { label: '肥胖', color: '#EF4444', warn: true }
}

// 视力关注线：对数视力 < 4.8 建议复查（非诊断）
export const VISION_WATCH = 4.8

export const useHealthStore = create<HealthState>()(
  persist(
    (set) => ({
      records: [
        // 示例数据（可删除）：方便首次打开即见趋势
        { id: uid(), date: '2025-09-01', height: 135, weight: 30, visionLeft: 5.0, visionRight: 4.9, sleepHours: 9, exerciseMin: 40, mood: '好' },
        { id: uid(), date: '2026-03-01', height: 139, weight: 33, visionLeft: 5.0, visionRight: 4.8, sleepHours: 8.5, exerciseMin: 50, mood: '中' }
      ],
      addRecord: (r) => set((s) => ({ records: [...s.records, { ...r, id: (r as any).id || uid() }] })),
      deleteRecord: (id) => set((s) => ({ records: s.records.filter((x) => x.id !== id) })),
      updateRecord: (id, patch) => set((s) => ({ records: s.records.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      clearRecords: () => set({ records: [] }),
      syncFromCloud: async () => {
        if (!getCloudSync() || !getFcUrl()) return { ok: false, error: '未开启云同步或未配置地址' }
        try {
          const list = (await feishuSync.pullHealth()) as unknown as HealthRecord[]
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
    { name: 'growth-workbench-health' }
  )
)
