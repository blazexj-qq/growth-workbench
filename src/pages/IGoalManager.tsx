import { useMemo, useState, useEffect } from 'react'
import dayjs from 'dayjs'
import {
  Card, Tabs, Form, Input, InputNumber, DatePicker, Button, Table, Tag,
  Empty, Row, Col, Space, App, Divider, Switch, Alert, Progress, Select,
  Popover, Tooltip
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SettingOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import echarts from '../lib/echarts'
import {
  useGoalStore, GOAL_CATS, GOAL_STATUS,
  type GoalRecord
} from '../store/useGoalStore'
import { feishuSync, useCloudOn } from '../store/feishuSync'
import { axisBase, splitLineBase, darkTooltip, LABEL_COLOR, SUB_COLOR } from '../utils/chartStyle'
import { useWindowWidth, isMobileWidth } from '../hooks/useWindowWidth'

const { TextArea } = Input

// 颜色分档阈值（仅是经验值，可自定义；本工具不做好坏评判）
const TH_KEY = 'goal-progress-thresholds-v1'
type Thresholds = { low: number; high: number } // <low=橙，>=high=绿，介于=紫蓝
function loadTh(): Thresholds {
  try {
    const raw = localStorage.getItem(TH_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (typeof p.low === 'number' && typeof p.high === 'number' && p.low < p.high) return p
    }
  } catch {}
  return { low: 40, high: 80 }
}
function saveTh(t: Thresholds) {
  try { localStorage.setItem(TH_KEY, JSON.stringify(t)) } catch {}
}

function newId() {
  return 'go_' + Math.random().toString(36).slice(2, 9)
}

function todayStr() {
  const d = new Date()
  const p = (n: number) => (n < 10 ? '0' + n : '' + n)
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// 状态色彩
function statusColor(s?: string): string {
  if (s === '已完成') return '#0EA5A4'
  if (s === '已暂停') return '#F59E0B'
  if (s === '已放弃') return '#94A3B8'
  return '#6366F1' // 进行中
}
// 进度色彩（越高越绿）— 阈值由用户在 ⚙ 调整，详见 Popover
function makeProgressColor(th: Thresholds) {
  return (v?: number): string => {
    if (v == null) return '#94A3B8'
    if (v >= th.high) return '#0EA5A4'
    if (v >= th.low) return '#6366F1'
    return '#F59E0B'
  }
}

export default function IGoalManager() {
  const { records, addRecord, deleteRecord, updateRecord, clearRecords, syncFromCloud } = useGoalStore()
  const { message: msg } = App.useApp()

  // 云同步：全站共享配置，hook 响应式获取
  const cloudOn = useCloudOn()
  useEffect(() => { if (cloudOn) syncFromCloud() /* eslint-disable-next-line */ }, [cloudOn])
  const [form] = Form.useForm()
  const [editingId, setEditingId] = useState<string | null>(null)
  const isEditing = editingId !== null
  const resetForm = () => { setEditingId(null); form.resetFields() }

  // 颜色分档阈值（仅经验参考，可在「进度看板」右上 ⚙ 调整）
  const [th, setTh] = useState<Thresholds>(loadTh)
  const updateTh = (low: number, high: number) => {
    const safe = Math.max(0, Math.min(99, Math.min(low, high)))
    const safeHigh = Math.max(safe + 1, Math.min(100, high))
    const next = { low: safe, high: safeHigh }
    setTh(next); saveTh(next)
  }
  const progressColor = useMemo(() => makeProgressColor(th), [th])

  // 状态分布
  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {}
    GOAL_STATUS.forEach((s) => (m[s] = 0))
    records.forEach((r) => { if (r.status && m[r.status] != null) m[r.status]++ })
    return m
  }, [records])

  // 进度条形图（按目标）
  // 标签超长用省略号，避免被截掉字看不到全名；移动端加大字号和 bar 高度
  const truncateLabel = (val: string, max = 14) => (val && val.length > max ? val.slice(0, max - 1) + '…' : val)
  const winW = useWindowWidth()
  const mobile = isMobileWidth(winW)
  const barOption = useMemo(() => ({
    grid: { left: mobile ? 12 : 150, right: mobile ? 60 : 28, top: 28, bottom: 28, containLabel: true },
    tooltip: { ...darkTooltip(), trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: any) => (v == null ? '-' : v + '%') },
    xAxis: { ...axisBase(), type: 'value', max: 100, name: '进度%', nameTextStyle: { color: SUB_COLOR, fontSize: 11 }, splitLine: splitLineBase },
    yAxis: {
      ...axisBase(),
      type: 'category',
      inverse: true,
      data: records.map((r) => truncateLabel(r.content || r.id)),
      axisLabel: { fontSize: mobile ? 15 : 12, color: LABEL_COLOR, fontWeight: mobile ? 500 : 400 },
    },
    series: [{
      type: 'bar',
      data: records.map((r) => ({ value: r.progress ?? 0, itemStyle: { color: progressColor(r.progress), borderRadius: [0, 4, 4, 0] } })),
      label: { show: true, position: 'right', formatter: '{c}%', fontSize: mobile ? 15 : 12, color: LABEL_COLOR, fontWeight: mobile ? 600 : 400 },
      barWidth: mobile ? 26 : 18,
      barCategoryGap: mobile ? '40%' : '20%',
    }],
  }), [records, progressColor, mobile])

  // 状态分布饼图
  const pieOption = useMemo(() => ({
    tooltip: { ...darkTooltip(), trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: LABEL_COLOR, fontSize: 12 } },
    series: [{
      type: 'pie',
      radius: ['40%', '66%'],
      center: ['50%', '45%'],
      data: GOAL_STATUS.map((s) => ({ name: s, value: statusCounts[s], itemStyle: { color: statusColor(s) } })),
      label: { fontSize: 12, formatter: '{b}: {c}' },
    }],
  }), [statusCounts])

  // 概览指标
  const ongoing = statusCounts['进行中']
  const done = statusCounts['已完成']
  const avgProgress = records.length ? Math.round(records.reduce((a, r) => a + (r.progress || 0), 0) / records.length) : undefined
  const nearDue = records.filter((r) => r.status === '进行中' && r.dueDate && r.dueDate >= todayStr() && r.dueDate <= addDays(todayStr(), 14)).length

  function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T00:00:00')
    d.setDate(d.getDate() + days)
    const p = (n: number) => (n < 10 ? '0' + n : '' + n)
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  }

  // 防焦虑 / 非诊断提示（家长端）
  const alerts: string[] = []
  if (records.some((r) => r.status === '进行中' && (r.progress || 0) < 20)) {
    alerts.push('部分目标进度偏低（<20%），这很正常——目标可以拆得更小、更具体，先完成「最小一步」比追求完美更重要，本工具不做任何「目标不切实际」的评判。')
  }

  const onAdd = (values: any) => {
    const rec: GoalRecord = {
      id: newId(),
      createdAt: values.createdAt ? values.createdAt.format('YYYY-MM-DD') : todayStr(),
      category: values.category || '学业',
      content: values.content || '',
      dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : undefined,
      status: values.status || '进行中',
      progress: values.progress != null && values.progress !== '' ? Number(values.progress) : 0,
      review: values.review || '',
      note: values.note || '',
    }
    addRecord(rec)
    form.resetFields()
    msg.success('已保存目标')
    if (cloudOn) feishuSync.pushGoal([rec as any]).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
  }
  const onDelete = (r: GoalRecord) => {
    deleteRecord(r.id)
    if (cloudOn) feishuSync.deleteGoal([r.id]).catch((e) => msg.warning('飞书删除失败：' + e.message))
  }
  const onEdit = (r: GoalRecord) => {
    form.setFieldsValue({
      createdAt: r.createdAt ? dayjs(r.createdAt) : undefined,
      category: r.category || '学业',
      content: r.content || '',
      dueDate: r.dueDate ? dayjs(r.dueDate) : undefined,
      status: r.status || '进行中',
      progress: r.progress ?? 0,
      review: r.review || '',
      note: r.note || '',
    })
    setEditingId(r.id)
  }
  const onUpdate = (values: any) => {
    if (!editingId) return
    const patch = {
      createdAt: values.createdAt ? values.createdAt.format('YYYY-MM-DD') : todayStr(),
      category: values.category || '学业',
      content: values.content || '',
      dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : undefined,
      status: values.status || '进行中',
      progress: values.progress != null && values.progress !== '' ? Number(values.progress) : 0,
      review: values.review || '',
      note: values.note || '',
    }
    updateRecord(editingId, patch)
    const updated = { id: editingId, ...patch }
    msg.success('已更新目标')
    if (cloudOn) feishuSync.pushGoal([updated as any]).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
    resetForm()
  }

  const columns: ColumnsType<GoalRecord> = [
    { title: '创建日期', dataIndex: 'createdAt', width: 100 },
    { title: '类别', dataIndex: 'category', width: 72, render: (v: string) => <Tag color="cyan">{v || '-'}</Tag> },
    { title: '目标内容', dataIndex: 'content', ellipsis: true, render: (v: string) => v || '-' },
    { title: '截止', dataIndex: 'dueDate', width: 100, render: (v: string) => v || '-' },
    { title: '状态', dataIndex: 'status', width: 76, render: (v: string) => <Tag color={statusColor(v)}>{v || '进行中'}</Tag> },
    {
      title: '进度', width: 140,
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Progress percent={r.progress || 0} size="small" strokeColor={progressColor(r.progress)} style={{ width: 90, margin: 0 }} />
          <span style={{ fontSize: 12, color: progressColor(r.progress) }}>{r.progress || 0}%</span>
        </div>
      ),
    },
    { title: '操作', width: 120, render: (_, r) => (
      <Space size={0}>
        <Button type="link" size="small" disabled={isEditing && editingId !== r.id} onClick={() => onEdit(r)}>编辑</Button>
        <Button type="link" danger size="small" onClick={() => onDelete(r)}>删除</Button>
      </Space>
    ) },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>目标管理 / 愿景板</h2>
        <div style={{ color: '#64748B', fontSize: 13 }}>
          把学年/学期目标拆成可执行阶梯，看进度与状态分布。仅作自我管理可视化，绝不做「目标不切实际」等评判。
        </div>
      </div>

      <Tabs
        items={[
          {
            key: 'input',
            label: '录入与记录',
            children: (
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Card size="small" title={isEditing ? '编辑该目标' : '录入一个目标'} extra={isEditing ? <Button size="small" onClick={resetForm}>取消编辑</Button> : null} style={isEditing ? { borderColor: '#0EA5A4' } : undefined}>
                    <Form form={form} layout="vertical" onFinish={isEditing ? onUpdate : onAdd} initialValues={{ createdAt: undefined, category: '学业', status: '进行中', progress: 0 }}>
                      <Form.Item name="createdAt" label="创建日期"><DatePicker style={{ width: '100%' }} placeholder="默认今天" /></Form.Item>
                      <Form.Item name="category" label="目标类别"><Select options={GOAL_CATS.map((c) => ({ label: c, value: c }))} /></Form.Item>
                      <Form.Item name="content" label="目标内容" rules={[{ required: true }]}><TextArea rows={2} placeholder="如 本学期数学建模题不丢分" /></Form.Item>
                      <Form.Item name="dueDate" label="截止日期"><DatePicker style={{ width: '100%' }} /></Form.Item>
                      <Form.Item name="status" label="状态"><Select options={GOAL_STATUS.map((s) => ({ label: s, value: s }))} /></Form.Item>
                      <Form.Item name="progress" label="进度（0-100）"><InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="0" /></Form.Item>
                      <Form.Item name="review" label="复盘（可选）"><TextArea rows={2} placeholder="已完成部分/卡点/下一步" /></Form.Item>
                      <Form.Item name="note" label="备注（可选）"><Input placeholder="其他说明" /></Form.Item>
                      <Button type="primary" htmlType="submit" block>{isEditing ? '更新记录' : '保存'}</Button>
                    </Form>
                  </Card>
                </Col>
                <Col xs={24} md={16}>
                  <Card size="small" title={`已录目标（${records.length} 条）`}
                    extra={records.length ? <Button size="small" danger onClick={() => { clearRecords(); msg.success('已清空') }}>清空</Button> : null}
                  >
                    {records.length ? (
                      <Table rowKey="id" size="small" columns={columns} dataSource={records.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))} pagination={false} scroll={{ x: 'max-content', y: 320 }} rowClassName={(r) => (r.id === editingId ? 'row-editing' : '')} />
                    ) : <Empty description="还没有目标，先在左侧录入" />}
                  </Card>
                </Col>
              </Row>
            )
          },
          {
            key: 'board',
            label: '进度看板',
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                <Alert
                  type="info"
                  showIcon
                  message={
                    <span>
                      本模块仅记录目标拆解与进度，用于自我管理可视化；绝不做「目标不切实际/必然失败」等评判，进度仅为参考。
                      <Tooltip title="进度色彩的分档阈值（默认 < 40 橙 / 40–80 紫蓝 / ≥ 80 绿）只是经验参考，可在下方 ⚙ 调整，不存在任何客观标准。">
                        <QuestionCircleOutlined style={{ marginLeft: 6, color: '#94A3B8' }} />
                      </Tooltip>
                    </span>
                  }
                />
                {records.length ? (
                  <>
                    <Card
                      size="small"
                      title="各目标进度"
                      extra={
                        <Popover
                          trigger="click"
                          title="调整进度颜色分档"
                          content={
                            <Space direction="vertical" size={8} style={{ width: 220 }}>
                              <div style={{ fontSize: 12, color: '#64748B' }}>
                                低于「低阈值」= 橙；介于「低/高」之间 = 紫蓝；≥「高阈值」= 绿。调高/调低后立即生效。
                              </div>
                              <div>
                                <div style={{ fontSize: 12, marginBottom: 2 }}>低阈值 (%)</div>
                                <InputNumber min={0} max={99} value={th.low} onChange={(v) => updateTh(Number(v ?? 0), th.high)} style={{ width: '100%' }} />
                              </div>
                              <div>
                                <div style={{ fontSize: 12, marginBottom: 2 }}>高阈值 (%)</div>
                                <InputNumber min={1} max={100} value={th.high} onChange={(v) => updateTh(th.low, Number(v ?? 100))} style={{ width: '100%' }} />
                              </div>
                              <Button size="small" onClick={() => updateTh(40, 80)}>恢复默认 (40 / 80)</Button>
                              <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.4 }}>
                                说明：这只是「颜色怎么分」的偏好，没有任何研究/标准认为 80% 就是「好」——你随时可改。
                              </div>
                            </Space>
                          }
                        >
                          <Button size="small" icon={<SettingOutlined />}>
                            阈值 {th.low}/{th.high}
                          </Button>
                        </Popover>
                      }
                    >
                      <ReactEChartsCore echarts={echarts} option={barOption} style={{ height: Math.max(mobile ? 280 : 220, records.length * (mobile ? 56 : 40)) }} notMerge lazyUpdate />
                    </Card>
                    <Card size="small" title="状态分布">
                      <ReactEChartsCore echarts={echarts} option={pieOption} style={{ height: 260 }} notMerge lazyUpdate />
                    </Card>
                  </>
                ) : <Empty description="暂无数据" />}
              </Space>
            )
          },
          {
            key: 'overview',
            label: '概览',
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                <Row gutter={12}>
                  <Col xs={12} sm={8} md={6} lg={4}><Card size="small">
                    <div style={{ color: '#64748B', fontSize: 12 }}>进行中</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: statusColor('进行中') }}>{ongoing}</div>
                  </Card></Col>
                  <Col xs={12} sm={8} md={6} lg={4}><Card size="small">
                    <div style={{ color: '#64748B', fontSize: 12 }}>已完成</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: statusColor('已完成') }}>{done}</div>
                  </Card></Col>
                  <Col xs={12} sm={8} md={6} lg={4}><Card size="small">
                    <div style={{ color: '#64748B', fontSize: 12 }}>平均进度</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: progressColor(avgProgress) }}>{avgProgress != null ? `${avgProgress}%` : '-'}</div>
                  </Card></Col>
                  <Col xs={24} sm={8} md={12} lg={12}><Card size="small" title="两周内到期（进行中）">
                    <div style={{ fontSize: 22, fontWeight: 600, color: nearDue ? '#F59E0B' : '#0F766E' }}>{nearDue}</div>
                    <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>临近截止、仍在推进的目标数量，可优先安排</div>
                  </Card></Col>
                </Row>

                {alerts.length > 0 ? (
                  <Alert type="warning" showIcon message="观察提示" description={<ul style={{ margin: 0, paddingLeft: 18 }}>{alerts.map((a, i) => <li key={i}>{a}</li>)}</ul>} />
                ) : (
                  <Alert type="success" showIcon message="当前记录未见明显异常参考项" />
                )}
                <Divider />
                <div style={{ color: '#94A3B8', fontSize: 12 }}>
                  注：本模块只做目标拆解与进度管理可视化，不评价目标好坏、不预测成败；进度低≠不行，拆小步、常复盘即可。
                </div>
              </Space>
            )
          }
        ]}
      />
    </div>
  )
}
