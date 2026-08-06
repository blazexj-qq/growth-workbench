import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import dayjs from 'dayjs'
import { PRIMARY } from '../theme'

export interface ChildProfile {
  id: string
  name: string
  birthday: string
  gender: '女' | '男'
  school: string
  grade: string
  avatarColor: string
}

export interface AlertItem {
  id: string
  level: 'urgent' | 'warning' | 'info'
  title: string
  desc: string
  /** 详情里的"处理建议"（可在点击弹窗时引导家长行动） */
  suggestion?: string
  date: string
  module: string // 对应模块 id，如 'B' 'E'
}

/**
 * 按生日推算年级（南京入学规则：8 月 31 日前满 6 周岁入学；学年以 9 月 1 日划分）。
 * 返回当前所处学年年级 + 下一学年（9 月起）年级，供设置页展示提示用。
 * 该函数只做推算展示，不强制覆盖用户手动填写的年级。
 */
export function calcGradeByBirthday(
  birthday: string,
  ref: Date = new Date()
): { current: string; next: string } | null {
  if (!birthday) return null
  const b = dayjs(birthday)
  if (!b.isValid()) return null
  // 入学年份：出生年 + 6；若生日在 9 月 1 日及以后（month >= 8），晚一年入学
  let enrollYear = b.year() + 6
  if (b.month() >= 8) enrollYear += 1
  // 当前所处学年的起始年份：ref 在 9 月之前，则学年起始年 = 去年
  const refD = dayjs(ref)
  const schoolYearStart = refD.month() >= 8 ? refD.year() : refD.year() - 1
  const gradeNo = schoolYearStart - enrollYear + 1
  const cn = (n: number): string => {
    if (n <= 0) return '学前'
    if (n <= 6) return ['', '一', '二', '三', '四', '五', '六'][n] + '年级'
    if (n <= 9) return ['', '初一', '初二', '初三'][n - 6]
    if (n <= 12) return ['', '高一', '高二', '高三'][n - 9]
    return '高中以上'
  }
  return { current: cn(gradeNo), next: cn(gradeNo + 1) }
}

interface AppState {
  dark: boolean
  collapsed: boolean
  child: ChildProfile
  /** 当前未读预警；已读即从此数组移除（用于统计铃铛角标） */
  alerts: AlertItem[]
  toggleDark: () => void
  toggleCollapsed: () => void
  setChild: (c: Partial<ChildProfile>) => void
  /** 标记已读：直接从列表移除 */
  markAlertRead: (id: string) => void
  /** 一键全部已读（用于清空铃铛） */
  markAllAlertsRead: () => void
}

// 本地存储（对应开发方案「数据底座层」阶段0-1：本地为主）
// persist 中间件把状态写入 localStorage，刷新/换设备（导出导入）可保留
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      dark: false,
      collapsed: false,
      child: {
        id: 'c1',
        name: '小宝',
        birthday: '2016-09-01',
        gender: '女',
        school: '南京市栖霞区某小学',
        grade: '四年级',
        avatarColor: PRIMARY
      },
      // 示例预警（多维预警中心 L，悬浮卡里也显示同一份）
      alerts: [
        { id: 'a1', level: 'warning', title: '视力预警', desc: '右眼视力较上学期下降 0.1，建议复查', suggestion: '建议尽快预约眼科复查。日常注意 20-20-20 法则：每看 20 分钟屏幕，抬头看 20 英尺（约 6 米）外的物体 20 秒。', date: '2026-08-01', module: 'B' },
        { id: 'a2', level: 'info', title: '新政策', desc: '南京 2026 中考指标生控制线已发布（593 分）', suggestion: '可在「升学助手（F 模块）/ 指标生」中查阅完整政策与影响评估，结合孩子目前校内排名判断是否需要调整学习节奏。', date: '2026-07-28', module: 'E' },
        { id: 'a3', level: 'warning', title: '运动不足', desc: '本周中高强度运动仅 2 天，低于 ≥5 天建议', suggestion: '建议周末安排 2 次户外活动（骑车/球类/散步均可）。家长陪同参与效果更好；同时留意孩子是否白天久坐、户外晒太阳时间不足。', date: '2026-08-03', module: 'B' }
      ],
      toggleDark: () => set((s) => ({ dark: !s.dark })),
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      setChild: (c) => set((s) => ({ child: { ...s.child, ...c } })),
      markAlertRead: (id) => set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),
      markAllAlertsRead: () => set({ alerts: [] })
    }),
    { name: 'growth-workbench-m0' }
  )
)
