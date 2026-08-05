import { useMemo, useState, useEffect } from 'react'
import {
  Card, Tabs, Form, Input, DatePicker, Button, Table, Tag,
  Empty, Row, Col, Space, App, Divider, Switch, Alert, Select, List
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  useAlertStore, ALERT_LEVELS, ALERT_DIMS,
  type AlertRecord
} from '../store/useAlertStore'
import { feishuSync, useCloudOn } from '../store/feishuSync'
import { useHealthStore } from '../store/useHealthStore'
import { useHabitStore } from '../store/useHabitStore'
import { useGoalStore } from '../store/useGoalStore'
import { useNutritionStore } from '../store/useNutritionStore'
import { useScoreStore } from '../store/useScoreStore'
import { useParentingStore } from '../store/useParentingStore'

const { TextArea } = Input

function newId() {
  return 'al_' + Math.random().toString(36).slice(2, 9)
}

// 自动提醒：仅统计「数据缺口」（多久没记录），不评判孩子，措辞正向、防焦虑
function daysSince(date?: string) {
  if (!date) return 9999
  return dayjs().startOf('day').diff(dayjs(date), 'day')
}

export default function LAlertManager() {
  const { records, addRecord, deleteRecord, clearRecords, setHandled, syncFromCloud } = useAlertStore()
  const { message: msg } = App.useApp()

  // 云同步：全站共享配置，hook 响应式获取
  const cloudOn = useCloudOn()
  useEffect(() => { if (cloudOn) syncFromCloud() /* eslint-disable-next-line */ }, [cloudOn])
  const [form] = Form.useForm()

  // 读取各模块本地数据（只读，用于生成温和提醒）
  const health = useHealthStore((s) => s.records)
  const habit = useHabitStore((s) => s.records)
  const goal = useGoalStore((s) => s.records)
  const nutrition = useNutritionStore((s) => s.records)
  const score = useScoreStore((s) => s.exams)
  const parenting = useParentingStore((s) => s.records)

  const autoReminders = useMemo(() => {
    const list: { dimension: string; level: string; content: string }[] = []
    const lastDate = (arr: any[]) => arr.length ? arr.map((r) => r.date).sort().slice(-1)[0] : undefined
    // 身心：7 天
    const dHealth = daysSince(lastDate(health as any[]))
    if (dHealth >= 7) list.push({ dimension: '身心', level: '一般', content: `已 ${dHealth} 天未记录睡眠/运动/情绪，有空补一条就好` })
    // 营养：7 天
    const dNutri = daysSince(lastDate(nutrition as any[]))
    if (dNutri >= 7) list.push({ dimension: '营养', level: '一般', content: `已 ${dNutri} 天未记录膳食，想看餐盘结构时补一条` })
    // 成绩：30 天
    const dScore = daysSince(lastDate(score as any[]))
    if (dScore >= 30) list.push({ dimension: '成绩', level: '一般', content: `已 ${dScore} 天无新成绩记录，有考试时记一笔` })
    // 亲子：14 天
    const dParent = daysSince(lastDate(parenting as any[]))
    if (dParent >= 14) list.push({ dimension: '亲子', level: '一般', content: `已 ${dParent} 天无亲子互动记录，周末安排个高质量陪伴？` })
    // 习惯：最近 3 条都未完成
    const recentHabit = (habit as any[]).slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
    if (recentHabit.length >= 3 && recentHabit.every((h) => h.completed === 0)) {
      list.push({ dimension: '习惯', level: '一般', content: '近期习惯打卡多未完成，留意是否安排过满，别批评孩子' })
    }
    // 目标：进行中且到期未更新
    const overdue = (goal as any[]).filter((g) => g.status === '进行中' && g.dueDate && dayjs(g.dueDate).isBefore(dayjs(), 'day'))
    overdue.forEach((g) => list.push({ dimension: '目标', level: '重点', content: `目标「${g.content || '未命名'}」已到期仍未标记完成，抽空复盘一下` }))
    return list
  }, [health, habit, goal, nutrition, score, parenting])

  const onAdd = (values: any) => {
    const rec: AlertRecord = {
      id: newId(),
      date: values.date.format('YYYY-MM-DD'),
      level: values.level || '一般',
      dimension: values.dimension || '其他',
      content: values.content || '',
      handled: 0,
      note: values.note || '',
    }
    addRecord(rec)
    form.resetFields()
    msg.success('已添加预警记录')
    if (cloudOn) feishuSync.pushAlert([rec as any]).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
  }
  const onDelete = (r: AlertRecord) => {
    deleteRecord(r.id)
    if (cloudOn) feishuSync.deleteAlert([r.id]).catch((e) => msg.warning('飞书删除失败：' + e.message))
  }
  const onHandled = (r: AlertRecord) => {
    setHandled(r.id, r.handled ? 0 : 1)
    if (cloudOn) feishuSync.pushAlert([{ ...r, handled: r.handled ? 0 : 1 } as any]).catch(() => {})
  }
  const toLog = (rm: { dimension: string; level: string; content: string }) => {
    const rec: AlertRecord = { id: newId(), date: dayjs().format('YYYY-MM-DD'), level: rm.level, dimension: rm.dimension, content: rm.content, handled: 0, note: '由自动提醒转入' }
    addRecord(rec)
    msg.success('已转入预警记录')
    if (cloudOn) feishuSync.pushAlert([rec as any]).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
  }

  const levelColor: Record<string, string> = { 一般: 'default', 重点: 'gold', 紧急: 'red' }
  const columns: ColumnsType<AlertRecord> = [
    { title: '日期', dataIndex: 'date', width: 100 },
    { title: '级别', dataIndex: 'level', width: 72, render: (v: string) => <Tag color={levelColor[v] || 'default'}>{v || '-'}</Tag> },
    { title: '维度', dataIndex: 'dimension', width: 80, render: (v: string) => <Tag color="cyan">{v || '-'}</Tag> },
    { title: '内容', dataIndex: 'content', ellipsis: true, render: (v: string) => v || '-' },
    { title: '状态', dataIndex: 'handled', width: 76, render: (v: number, r) => <Button type="link" size="small" onClick={() => onHandled(r)}>{v ? '已处理' : '标记处理'}</Button> },
    { title: '操作', width: 70, render: (_, r) => <Button type="link" danger size="small" onClick={() => onDelete(r)}>删除</Button> },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>多维预警中心</h2>
        <div style={{ color: '#64748B', fontSize: 13 }}>
          温和提醒你「哪里好久没记了」，并收纳需要跟进的事项。仅做观察与提醒，绝不做诊断、不预测结果、不制造焦虑。
        </div>
      </div>

            <Alert type="info" showIcon style={{ marginBottom: 16 }}
        message="本中心是「提醒与跟进」，不是体检报告。所有提示基于你录入的数据缺口，措辞正向；需要专业判断的事（如视力、心理）请交给医生，不要在这里自我诊断。" />

      <Tabs items={[
        {
          key: 'auto', label: `自动提醒（${autoReminders.length}）`,
          children: autoReminders.length ? (
            <List
              dataSource={autoReminders}
              renderItem={(item) => (
                <List.Item
                  actions={[<Button key="log" size="small" onClick={() => toLog(item)}>转入记录</Button>]}
                >
                  <List.Item.Meta
                    avatar={<Tag color={levelColor[item.level] || 'default'}>{item.level}</Tag>}
                    title={<span>[{item.dimension}] {item.content}</span>}
                    description="基于本地数据缺口的温和提醒"
                  />
                </List.Item>
              )}
            />
          ) : <Empty description="近期各模块都有记录，暂无提醒 👍" />
        },
        {
          key: 'input', label: '预警记录',
          children: (
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Card size="small" title="添加一条需跟进事项">
                  <Form form={form} layout="vertical" onFinish={onAdd}>
                    <Form.Item name="date" label="日期" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="level" label="级别" initialValue="一般"><Select options={ALERT_LEVELS.map((d) => ({ label: d, value: d }))} /></Form.Item>
                    <Form.Item name="dimension" label="维度" initialValue="其他"><Select options={ALERT_DIMS.map((d) => ({ label: d, value: d }))} /></Form.Item>
                    <Form.Item name="content" label="内容" rules={[{ required: true }]}><TextArea rows={2} placeholder="如 视力复查预约待办" /></Form.Item>
                    <Form.Item name="note" label="备注（可选）"><Input placeholder="处理进展" /></Form.Item>
                    <Button type="primary" htmlType="submit" block>保存</Button>
                  </Form>
                </Card>
              </Col>
              <Col xs={24} md={16}>
                <Card size="small" title={`预警记录（${records.length} 条）`}
                  extra={records.length ? <Button size="small" danger onClick={() => { clearRecords(); msg.success('已清空') }}>清空</Button> : null}>
                  {records.length ? (
                    <Table rowKey="id" size="small" columns={columns} dataSource={records.slice().sort((a, b) => b.date.localeCompare(a.date))} pagination={false} scroll={{ x: 'max-content', y: 320 }} />
                  ) : <Empty description="还没有需要跟进的事项" />}
                </Card>
              </Col>
            </Row>
          )
        },
        {
          key: 'overview', label: '概览',
          children: (
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <Row gutter={12}>
                <Col xs={12} sm={8} md={6} lg={4}><Card size="small">
                  <div style={{ color: '#64748B', fontSize: 12 }}>自动提醒</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: '#0F766E' }}>{autoReminders.length}</div>
                </Card></Col>
                <Col xs={12} sm={8} md={6} lg={4}><Card size="small">
                  <div style={{ color: '#64748B', fontSize: 12 }}>预警记录</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: '#0EA5A4' }}>{records.length}</div>
                </Card></Col>
                <Col xs={12} sm={8} md={6} lg={4}><Card size="small">
                  <div style={{ color: '#64748B', fontSize: 12 }}>待处理</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: '#6366F1' }}>{records.filter((r) => !r.handled).length}</div>
                </Card></Col>
                <Col xs={24} sm={8} md={12} lg={12}><Card size="small" title="说明">
                  <div style={{ color: '#94A3B8', fontSize: 12 }}>提醒是为了「别让记录断太久」，不是为了考核。断几天没关系，补一条就好，不批评、不焦虑。</div>
                </Card></Col>
              </Row>
              <Divider />
              <div style={{ color: '#94A3B8', fontSize: 12 }}>注：本模块所有提示均为观察与提醒，非医学/心理诊断结论。</div>
            </Space>
          )
        }
      ]} />
    </div>
  )
}
