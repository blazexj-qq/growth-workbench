import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { feishuSync, getCloudSync, getFcUrl } from './feishuSync'

// 成绩管理 A 模块数据层（本地优先）
// 字段设计与未来「飞书多维表格·成绩表」一一对应，见《数据层规范·飞书字段映射》
// 当前用 localStorage 持久化（persist），飞书重连后可整体导出 JSON 导入，零损耗迁移。

// 全学段学科列表（小学 + 初中 + 高中，含素质类），统一见 src/store/subjects.ts
import { SUBJECT_GROUPS, SUBJECTS, SUBJECT_REFERENCE, type Subject } from './subjects'
export { SUBJECT_GROUPS, SUBJECTS, SUBJECT_REFERENCE }
export type { Subject }

export interface ExamRecord {
  id: string
  subject: Subject
  examName: string // 单元测试 / 期中 / 期末 / 月考 ...
  date: string // YYYY-MM-DD
  score: number
  fullScore: number // 默认 100
  classRank?: number
  gradeRank?: number
  note?: string
}

export type WeakStatus = '未过关' | '复盘中' | '已掌握'

export interface WeakPoint {
  id: string
  subject: Subject
  knowledge: string // 知识点
  reason: string // 错因
  date: string
  status: WeakStatus
  source: string // 来源，如「错题管家」
}

interface ScoreState {
  exams: ExamRecord[]
  weakPoints: WeakPoint[]
  addExam: (e: Omit<ExamRecord, 'id'> & { id?: string }) => void
  deleteExam: (id: string) => void
  updateExam: (id: string, patch: Partial<ExamRecord>) => void
  importWeakPoints: (rows: Omit<WeakPoint, 'id'>[]) => { inserted: number; duplicate: number }
  updateWeakStatus: (id: string, status: WeakStatus) => void
  clearWeakPoints: () => void
  pushWeakAll: () => Promise<{ ok: boolean; count?: number; error?: string }>
  pushExamAll: () => Promise<{ ok: boolean; count?: number; error?: string }>
  syncFromCloud: () => Promise<{ ok: boolean; examCount?: number; weakCount?: number; error?: string }>
}

function uid() {
  return 's_' + Math.random().toString(36).slice(2, 9)
}

export const useScoreStore = create<ScoreState>()(
  persist(
    (set) => ({
      exams: [
        // 示例数据（可删除）：方便首次打开即见趋势图效果
        { id: uid(), subject: '数学' as Subject, examName: '三年级下·期末', date: '2026-06-20', score: 92, fullScore: 100, classRank: 8, note: '应用题丢分' },
        { id: uid(), subject: '语文' as Subject, examName: '三年级下·期末', date: '2026-06-20', score: 88, fullScore: 100, classRank: 12 },
        { id: uid(), subject: '英语' as Subject, examName: '三年级下·期末', date: '2026-06-20', score: 95, fullScore: 100, classRank: 5 },
        { id: uid(), subject: '数学' as Subject, examName: '四年级上·单元一', date: '2026-09-15', score: 85, fullScore: 100, classRank: 15, note: '计算粗心' },
        { id: uid(), subject: '语文' as Subject, examName: '四年级上·单元一', date: '2026-09-15', score: 90, fullScore: 100, classRank: 10 }
      ],
      weakPoints: [
        { id: uid(), subject: '数学' as Subject, knowledge: '小数乘除', reason: '进位漏写', date: '2026-09-16', status: '未过关' as WeakStatus, source: '错题管家' },
        { id: uid(), subject: '语文' as Subject, knowledge: '阅读理解·推断', reason: '信息提取不全', date: '2026-09-16', status: '复盘中' as WeakStatus, source: '错题管家' }
      ],
      addExam: (e) => set((s) => ({ exams: [...s.exams, { ...e, id: (e as any).id || uid() }] })),
      deleteExam: (id) => set((s) => ({ exams: s.exams.filter((x) => x.id !== id) })),
      updateExam: (id, patch) => set((s) => ({ exams: s.exams.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      importWeakPoints: (rows) => {
        // 去重指纹：(科目, 知识点, 错因) 三元组，去掉首尾空格
        const fp = (r: Pick<WeakPoint, 'subject' | 'knowledge' | 'reason'>) =>
          `${r.subject.trim()}|${r.knowledge.trim()}|${r.reason.trim()}`
        let inserted = 0
        let duplicate = 0
        set((s) => {
          const exist = new Set(s.weakPoints.map(fp))
          const adds: WeakPoint[] = []
          rows.forEach((r) => {
            const k = fp(r)
            if (exist.has(k)) { duplicate++; return }
            exist.add(k)
            adds.push({ ...r, id: uid() })
            inserted++
          })
          return { weakPoints: [...s.weakPoints, ...adds] }
        })
        return { inserted, duplicate }
      },
      updateWeakStatus: (id, status) =>
        set((s) => ({ weakPoints: s.weakPoints.map((w) => (w.id === id ? { ...w, status } : w)) })),
      clearWeakPoints: () => set({ weakPoints: [] }),
      pushExamAll: async () => {
        if (!getCloudSync() || !getFcUrl()) return { ok: false, error: '未开启云同步或未配置地址' }
        try {
          const state = useScoreStore.getState()
          await feishuSync.pushExam(state.exams as any)
          return { ok: true, count: state.exams.length }
        } catch (e: any) {
          return { ok: false, error: e?.message || '同步出错' }
        }
      },
      pushWeakAll: async () => {
        if (!getCloudSync() || !getFcUrl()) return { ok: false, error: '未开启云同步或未配置地址' }
        try {
          const state = useScoreStore.getState()
          await feishuSync.pushWeak(state.weakPoints as any)
          return { ok: true, count: state.weakPoints.length }
        } catch (e: any) {
          return { ok: false, error: e?.message || '同步出错' }
        }
      },
      syncFromCloud: async () => {
        if (!getCloudSync() || !getFcUrl()) return { ok: false, error: '未开启云同步或未配置地址' }
        try {
          const [examLite, weakLite] = await Promise.all([feishuSync.pullExam(), feishuSync.pullWeak()])
          const exams = examLite as unknown as ExamRecord[]
          const weak = weakLite as unknown as WeakPoint[]
          set((s) => {
            const examMap = new Map(exams.map((e) => [e.id, e]))
            const mergedExams = s.exams.map((e) => examMap.get(e.id) || e)
            const cloudExamIds = new Set(exams.map((e) => e.id))
            const localOnlyExams = s.exams.filter((e) => !cloudExamIds.has(e.id))
            const weakMap = new Map(weak.map((w) => [w.id, w]))
            const mergedWeak = s.weakPoints.map((w) => weakMap.get(w.id) || w)
            const cloudWeakIds = new Set(weak.map((w) => w.id))
            const localOnlyWeak = s.weakPoints.filter((w) => !cloudWeakIds.has(w.id))
            return { exams: [...mergedExams, ...localOnlyExams], weakPoints: [...mergedWeak, ...localOnlyWeak] }
          })
          return { ok: true, examCount: exams.length, weakCount: weak.length }
        } catch (e: any) {
          return { ok: false, error: e?.message || '同步出错' }
        }
      },
    }),
    { name: 'growth-workbench-score' }
  )
)
