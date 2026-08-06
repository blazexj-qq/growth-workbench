import { useMemo, useState } from 'react'
import {
  Card, Segmented, Row, Col, Statistic, List, Tag, Typography, Space, Button, Empty,
  message, Alert, App
} from 'antd'
import { PrinterOutlined, CopyOutlined, WarningOutlined, TrophyOutlined } from '@ant-design/icons'
import { modules, getModule, groups } from '../data/modules'
import { useScoreStore } from '../store/useScoreStore'
import { useHealthStore } from '../store/useHealthStore'
import { useNutritionStore } from '../store/useNutritionStore'
import { useInterestStore } from '../store/useInterestStore'
import { useParentingStore } from '../store/useParentingStore'
import { useDecisionStore } from '../store/useDecisionStore'
import { useAdmissionStore } from '../store/useAdmissionStore'
import { useComprehensiveStore } from '../store/useComprehensiveStore'
import { useHomeSchoolStore } from '../store/useHomeSchoolStore'
import { useGoalStore } from '../store/useGoalStore'
import { useHabitStore } from '../store/useHabitStore'
import { useCareerStore } from '../store/useCareerStore'
import { useExperienceStore } from '../store/useExperienceStore'
import { useResourceStore } from '../store/useResourceStore'
import { useArchiveStore } from '../store/useArchiveStore'
import { useAbilityStore } from '../store/useAbilityStore'
import { useAlertStore } from '../store/useAlertStore'

const { Title, Paragraph, Text } = Typography

interface AggItem {
  moduleId: string
  date: string
  summary: string
}

type Mode = 'week' | 'month' | 'all'

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function fmt(dt: Date) {
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

function getRange(mode: Mode, now: Date) {
  if (mode === 'week') {
    const day = now.getDay() // 0=周日
    const diffToMon = day === 0 ? 6 : day - 1
    const start = new Date(now)
    start.setDate(now.getDate() - diffToMon)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return { start: fmt(start), end: fmt(end), label: `本周（${fmt(start)} ~ ${fmt(end)}）` }
  }
  if (mode === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start: fmt(start), end: fmt(end), label: `本月（${fmt(start)} ~ ${fmt(end)}）` }
  }
  return { start: '0000-01-01', end: '9999-12-31', label: '全部周期（自首次记录至今）' }
}

// 不聚合的模块：W 是汇总本身；N 是隐私合规（不该汇总）；L 预警单独处理
const SKIP_IDS = new Set(['W', 'N', 'L'])
const statModules = modules.filter((m) => !SKIP_IDS.has(m.id))

export default function ReportManager() {
  const { message: msg } = App.useApp()
  const [mode, setMode] = useState<Mode>('week')

  // ---- 全部数据源（响应式订阅） ----
  const exams = useScoreStore((s) => s.exams)
  const weakPoints = useScoreStore((s) => s.weakPoints)
  const health = useHealthStore((s) => s.records)
  const nutrition = useNutritionStore((s) => s.records)
  const interest = useInterestStore((s) => s.records)
  const parenting = useParentingStore((s) => s.records)
  const cards = useDecisionStore((s) => s.cards)
  const admission = useAdmissionStore((s) => s.records)
  const comprehensive = useComprehensiveStore((s) => s.records)
  const homeSchool = useHomeSchoolStore((s) => s.records)
  const goals = useGoalStore((s) => s.records)
  const habits = useHabitStore((s) => s.records)
  const careers = useCareerStore((s) => s.records)
  const experiences = useExperienceStore((s) => s.records)
  const resources = useResourceStore((s) => s.records)
  const archives = useArchiveStore((s) => s.records)
  const ability = useAbilityStore((s) => s.records)
  const alerts = useAlertStore((s) => s.records)

  const report = useMemo(() => {
    const now = new Date()
    const { start, end, label } = getRange(mode, now)
    const inP = (d: string) => !!d && d >= start && d <= end

    const items: AggItem[] = []
    exams.forEach((e: any) =>
      items.push({
        moduleId: 'A',
        date: e.date,
        summary: `${e.subject}·${e.examName} ${e.score}/${e.fullScore}${e.classRank ? ' 班排' + e.classRank : ''}`,
      })
    )
    weakPoints.forEach((w: any) =>
      items.push({ moduleId: 'A', date: w.date, summary: `未过关知识点：${w.knowledge}（${w.status}）` })
    )
    health.forEach((r: any) =>
      items.push({
        moduleId: 'B',
        date: r.date,
        summary: `身高${r.height ?? '-'} 体重${r.weight ?? '-'} 睡${r.sleepHours ?? '-'}h 动${r.exerciseMin ?? '-'}m 视力${r.visionLeft ?? '-'}/${r.visionRight ?? '-'}`,
      })
    )
    nutrition.forEach((r: any) =>
      items.push({
        moduleId: 'O',
        date: r.date,
        summary: `早:${r.breakfast ?? '-'} 午:${r.lunch ?? '-'} 晚:${r.dinner ?? '-'} 水:${r.waterMl ?? '-'}ml`,
      })
    )
    interest.forEach((r: any) =>
      items.push({
        moduleId: 'C',
        date: r.date,
        summary: `${r.activity || r.book || '兴趣/阅读记录'}${r.category ? '（' + r.category + '）' : ''}`,
      })
    )
    parenting.forEach((r: any) =>
      items.push({
        moduleId: 'D',
        date: r.date,
        summary: `${r.type ?? '亲子'}${r.durationMin ? ' ' + r.durationMin + '分钟' : ''} 孩子情绪${r.childMood ?? '-'}`,
      })
    )
    cards.forEach((c: any) =>
      items.push({ moduleId: 'E', date: c.dateDecided || '', summary: `决策：${c.title}（${c.status}）` })
    )
    admission.forEach((r: any) =>
      items.push({
        moduleId: 'F',
        date: r.date,
        summary: `${r.examName ?? '模考'}${r.totalScore != null ? ' 总分' + r.totalScore + '/' + r.fullScore : ''}`,
      })
    )
    comprehensive.forEach((r: any) =>
      items.push({
        moduleId: 'K',
        date: r.date,
        summary: `${r.category ?? ''}${r.subject ? '·' + r.subject : ''}${r.item ? '·' + r.item : ''}`,
      })
    )
    homeSchool.forEach((r: any) =>
      items.push({ moduleId: 'T', date: r.date, summary: `${r.type ?? '家校'}${r.content ? '：' + r.content : ''}` })
    )
    goals.forEach((r: any) =>
      items.push({
        moduleId: 'I',
        date: r.createdAt || '',
        summary: `${r.content ?? '目标'}${r.status ? '（' + r.status + ' ' + (r.progress ?? 0) + '%）' : ''}`,
      })
    )
    habits.forEach((r: any) =>
      items.push({ moduleId: 'H', date: r.date, summary: `${r.habit ?? '习惯'}${r.completed ? ' ✓' : ' ○'}` })
    )
    careers.forEach((r: any) =>
      items.push({ moduleId: 'J', date: r.date, summary: `${r.title ?? '职业好奇'}${r.domain ? '（' + r.domain + '）' : ''}` })
    )
    experiences.forEach((r: any) =>
      items.push({ moduleId: 'R', date: r.date, summary: `${r.career || r.form || '体验'}${r.rating ? ' 自评' + r.rating : ''}` })
    )
    resources.forEach((r: any) =>
      items.push({ moduleId: 'M', date: r.date, summary: `${r.name ?? '资源'}${r.category ? '（' + r.category + '）' : ''}` })
    )
    archives.forEach((r: any) =>
      items.push({ moduleId: 'G', date: r.date, summary: `${r.title ?? '档案'}${r.category ? '（' + r.category + '）' : ''}` })
    )
    ability.forEach((r: any) =>
      items.push({
        moduleId: 'P',
        date: r.date,
        summary: `学习能力评估（${r.note ? r.note : Object.keys(r.scores || {}).length + ' 维'}）`,
      })
    )

    const byModule: Record<string, AggItem[]> = {}
    items.filter((i) => inP(i.date)).forEach((i) => {
      ;(byModule[i.moduleId] ||= []).push(i)
    })
    Object.values(byModule).forEach((arr) => arr.sort((a, b) => b.date.localeCompare(a.date)))

    const periodAlerts = alerts.filter((a) => inP(a.date) && a.handled !== 1)
    const total = items.filter((i) => inP(i.date)).length
    const covered = Object.keys(byModule).length
    const milestones = (byModule['G'] || []).filter((i) => /里程碑|奖项|荣誉/.test(i.summary))

    return { start, end, label, byModule, periodAlerts, total, covered, milestones }
  }, [
    mode, exams, weakPoints, health, nutrition, interest, parenting, cards, admission,
    comprehensive, homeSchool, goals, habits, careers, experiences, resources, archives, ability, alerts,
  ])

  const summaryText = useMemo(() => {
    const lines: string[] = []
    lines.push(`${report.label}成长记录小结`)
    lines.push('')
    if (report.total === 0) {
      lines.push('本期暂未记录任何数据。打开对应模块录入后，这里会自动汇总出一份成长小结。')
    } else {
      lines.push(
        `本期在 ${report.covered} 个成长维度共记录 ${report.total} 条，覆盖学业、身心、兴趣、升学、规划等多个方面。`
      )
      if (report.milestones.length) {
        lines.push(
          `本期新增 ${report.milestones.length} 个成长里程碑/亮点，最新一条：「${report.milestones[0].summary}」。`
        )
      }
      if (report.periodAlerts.length) {
        const urgent = report.periodAlerts.filter((a) => a.level === '紧急').length
        const important = report.periodAlerts.filter((a) => a.level === '重点').length
        lines.push(
          `本期有 ${report.periodAlerts.length} 条提醒待处理（紧急 ${urgent}、重点 ${important}），建议优先关注对应维度。`
        )
      } else {
        lines.push('本期没有新增待处理提醒，整体平稳。')
      }
    }
    lines.push('')
    lines.push('说明：以上为各模块记录的客观汇总，用于家庭回顾与陪伴参考，非医学/心理诊断，不构成任何定性结论。')
    return lines.join('\n')
  }, [report])

  const onCopy = () => {
    navigator.clipboard
      ?.writeText(summaryText)
      .then(() => msg.success('已复制文字小结，可粘贴到微信/飞书'))
      .catch(() => msg.warning('复制失败，请手动选择文字'))
  }

  const onPrint = () => window.print()

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0 }}>
            成长周报 · 月报
          </Title>
          <Text type="secondary">{report.label}</Text>
        </div>
        <Space wrap>
          <Segmented
            value={mode}
            onChange={(v) => setMode(v as Mode)}
            options={[
              { label: '本周', value: 'week' },
              { label: '本月', value: 'month' },
              { label: '全部', value: 'all' },
            ]}
          />
          <Button icon={<PrinterOutlined />} onClick={onPrint}>
            打印
          </Button>
          <Button icon={<CopyOutlined />} onClick={onCopy}>
            复制小结
          </Button>
        </Space>
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={8}>
          <Card size="small">
            <Statistic title="本期记录" value={report.total} suffix="条" />
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small">
            <Statistic title="覆盖维度" value={report.covered} suffix="个" />
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small">
            <Statistic
              title="待处理提醒"
              value={report.periodAlerts.length}
              valueStyle={{ color: report.periodAlerts.length ? '#F59E0B' : '#0EA5A4' }}
            />
          </Card>
        </Col>
      </Row>

      <Alert
        type="info"
        showIcon
        banner
        style={{ marginBottom: 12 }}
        message="本页为各模块记录的本地自动汇总，仅用于家庭回顾与陪伴参考，非诊断结论；措辞正向、防焦虑。"
      />

      {report.total === 0 ? (
        <Card>
          <Empty description="本期暂无记录。打开对应模块录入数据后，这里会自动生成成长小结。" />
        </Card>
      ) : (
        <>
          {/* 按分组展示各模块本期记录 */}
          {groups
            .filter((g) => g.key !== 'overview')
            .map((g) => {
              const mods = g.modules.filter((id) => !SKIP_IDS.has(id))
              if (!mods.length) return null
              return (
                <Card key={g.key} size="small" title={g.label} style={{ marginBottom: 12 }}>
                  <List
                    dataSource={mods}
                    renderItem={(id) => {
                      const m = getModule(id)!
                      const recs = report.byModule[id] || []
                      const cnt = recs.length
                      return (
                        <List.Item>
                          <div style={{ width: '100%' }}>
                            <Space style={{ marginBottom: 4 }}>
                              <Text strong>{m.name}</Text>
                              <Tag color={cnt ? 'cyan' : 'default'}>{cnt} 条</Tag>
                            </Space>
                            {cnt === 0 ? (
                              <div>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  本期未记录
                                </Text>
                              </div>
                            ) : (
                              <List
                                size="small"
                                dataSource={recs.slice(0, 5)}
                                renderItem={(it) => (
                                  <List.Item style={{ padding: '2px 0', border: 'none' }}>
                                    <Text style={{ fontSize: 12 }}>
                                      <Text type="secondary">{it.date}　</Text>
                                      {it.summary}
                                    </Text>
                                  </List.Item>
                                )}
                              />
                            )}
                          </div>
                        </List.Item>
                      )
                    }}
                  />
                </Card>
              )
            })}

          {/* 成长里程碑聚焦 */}
          {report.milestones.length > 0 && (
            <Card
              size="small"
              title={
                <Space>
                  <TrophyOutlined style={{ color: '#F59E0B' }} />
                  本期成长里程碑 / 亮点
                </Space>
              }
              style={{ marginBottom: 12 }}
            >
              <List
                dataSource={report.milestones}
                renderItem={(it) => (
                  <List.Item>
                    <Text>
                      <Text type="secondary">{it.date}　</Text>
                      {it.summary}
                    </Text>
                  </List.Item>
                )}
              />
            </Card>
          )}

          {/* 待处理预警 */}
          {report.periodAlerts.length > 0 && (
            <Card
              size="small"
              title={
                <Space>
                  <WarningOutlined style={{ color: '#F59E0B' }} />
                  本期待处理提醒（{report.periodAlerts.length}）
                </Space>
              }
              style={{ marginBottom: 12 }}
            >
              <List
                dataSource={report.periodAlerts}
                renderItem={(a: any) => (
                  <List.Item>
                    <Space>
                      <Tag color={a.level === '紧急' ? 'red' : a.level === '重点' ? 'orange' : 'default'}>
                        {a.level || '一般'}
                      </Tag>
                      <Text type="secondary">{a.date}　</Text>
                      <Text>
                        {a.dimension ? '【' + a.dimension + '】' : ''}
                        {a.content}
                      </Text>
                    </Space>
                  </List.Item>
                )}
              />
            </Card>
          )}
        </>
      )}

      {/* 文字小结 */}
      <Card size="small" title="文字小结（本地模板生成，可复制分享）" style={{ marginTop: 4 }}>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            margin: 0,
            fontFamily: 'inherit',
            fontSize: 13,
            lineHeight: 1.7,
          }}
        >
          {summaryText}
        </pre>
      </Card>
    </div>
  )
}
