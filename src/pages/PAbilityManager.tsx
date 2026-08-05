import { useMemo, useState, useEffect } from 'react'
import {
  Card, Tabs, Form, Input, InputNumber, DatePicker, Button, Table, Tag,
  Empty, Row, Col, Space, App, Divider, Switch, Alert, Popover, Tooltip
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SettingOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import {
  useAbilityStore, abilityAvg, ABILITY_DIMS,
  type AbilityRecord
} from '../store/useAbilityStore'
import { feishuSync, useCloudOn } from '../store/feishuSync'

const { TextArea } = Input

// 颜色分档阈值（仅经验参考，可在概览的 ⚙ 调整；不存在客观标准）
const TH_KEY = 'ability-color-thresholds-v1'
type AbThresholds = { low: number; high: number } // <low=红 / >=high=绿 / 介于=橙
function loadAbTh(): AbThresholds {
  try {
    const raw = localStorage.getItem(TH_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (typeof p.low === 'number' && typeof p.high === 'number' && p.low < p.high && p.low >= 1 && p.high <= 5) return p
    }
  } catch {}
  return { low: 3, high: 4 } // 默认：<3 红 / 3-3.9 橙 / ≥4 绿
}
function saveAbTh(t: AbThresholds) {
  try { localStorage.setItem(TH_KEY, JSON.stringify(t)) } catch {}
}

function newId() {
  return 'ab_' + Math.random().toString(36).slice(2, 9)
}

export default function PAbilityManager() {
  const { records, addRecord, deleteRecord, clearRecords, syncFromCloud } = useAbilityStore()
  const { message: msg } = App.useApp()

  // 云同步：全站共享配置，hook 响应式获取
  const cloudOn = useCloudOn()
  useEffect(() => { if (cloudOn) syncFromCloud() /* eslint-disable-next-line */ }, [cloudOn])
  const [form] = Form.useForm()

  // 颜色分档阈值（可在概览的 ⚙ 调整）
  const [abTh, setAbTh] = useState<AbThresholds>(loadAbTh)
  const updateAbTh = (low: number, high: number) => {
    const safeLow = Math.max(1, Math.min(4.9, Math.min(low, high)))
    const safeHigh = Math.max(safeLow + 0.1, Math.min(5, high))
    const next = { low: Number(safeLow.toFixed(1)), high: Number(safeHigh.toFixed(1)) }
    setAbTh(next); saveAbTh(next)
  }
  const abilityColor = (v?: number) => {
    if (v == null) return '#94A3B8'
    if (v >= abTh.high) return '#0EA5A4'
    if (v < abTh.low) return '#EF4444'
    return '#F59E0B'
  }

  // 按日期升序
  const sorted = useMemo(() => [...records].sort((a, b) => a.date.localeCompare(b.date)), [records])
  const dates = useMemo(() => sorted.map((r) => r.date), [sorted])
  const avgSeries = useMemo(() => sorted.map((r) => abilityAvg(r) ?? null), [sorted])
  const first = sorted[0]
  const last = sorted[sorted.length - 1]

  // 雷达：首次 vs 最新
  const radarOption = useMemo(() => {
    const mk = (r?: AbilityRecord) => ABILITY_DIMS.map((d) => (r?.scores[d] != null ? Number(r.scores[d]) : 0))
    return {
      tooltip: {},
      legend: { top: 0, textStyle: { fontSize: 11 } },
      radar: { indicator: ABILITY_DIMS.map((d) => ({ name: d, max: 5 })), radius: '62%' },
      series: [{
        type: 'radar',
        data: [
          { value: mk(first), name: '首次 ' + (first?.date || '') },
          { value: mk(last), name: '最新 ' + (last?.date || '') },
        ],
        color: ['#94A3B8', '#0EA5A4'],
      }],
    }
  }, [first, last])

  const trendOption = useMemo(() => ({
    grid: { left: 40, right: 16, top: 36, bottom: 28 },
    tooltip: { trigger: 'axis' },
    legend: { top: 0, textStyle: { fontSize: 11 } },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', name: '综合分(1-5)', min: 0, max: 5, axisLabel: { fontSize: 10 } },
    series: [
      { name: '综合分', type: 'line', smooth: true, data: avgSeries, itemStyle: { color: '#0EA5A4' }, connectNulls: true },
    ],
  }), [dates, avgSeries])

  // 最新各维度
  const latestScores = last?.scores || {}
  const latestAvg = last ? abilityAvg(last) : undefined

  // 非诊断提示（仅家长端）
  const lowDims = useMemo(
    () => ABILITY_DIMS.filter((d) => typeof latestScores[d] === 'number' && (latestScores[d] as number) < 3),
    [latestScores]
  )
  const alerts = lowDims.length
    ? [`维度偏低：${lowDims.join('、')}（观察分 < 3）。这仅是家庭观察参考，若持续偏低建议咨询学校心理老师或专业机构评估，不做任何诊断结论。`]
    : []

  const onAdd = (values: any) => {
    const scores: any = {}
    ABILITY_DIMS.forEach((d) => { if (values[d] != null && values[d] !== '') scores[d] = Number(values[d]) })
    const rec: AbilityRecord = {
      id: newId(),
      date: values.date.format('YYYY-MM-DD'),
      scores,
      note: values.note || '',
    }
    addRecord(rec)
    form.resetFields()
    msg.success('已保存能力评估')
    if (cloudOn) feishuSync.pushAbility([rec as any]).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
  }
  const onDelete = (r: AbilityRecord) => {
    deleteRecord(r.id)
    if (cloudOn) feishuSync.deleteAbility([r.id]).catch((e) => msg.warning('飞书删除失败：' + e.message))
  }

  const columns: ColumnsType<AbilityRecord> = [
    { title: '日期', dataIndex: 'date', width: 110 },
    ...ABILITY_DIMS.map((d) => ({
      title: d,
      dataIndex: ['scores', d],
      width: 80,
      render: (v: number) => (v != null ? v : '-'),
    })),
    {
      title: '综合', width: 70,
      render: (_, r) => { const a = abilityAvg(r); return a != null ? <Tag color="#0EA5A4">{a}</Tag> : '-' },
    },
    { title: '备注', dataIndex: 'note', ellipsis: true },
    { title: '操作', width: 70, render: (_, r) => <Button type="link" danger size="small" onClick={() => onDelete(r)}>删除</Button> },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>学习能力画像</h2>
        <div style={{ color: '#64748B', fontSize: 13 }}>
          家长/老师日常观察评分（1-5 分，5 最好），看注意力、记忆、思维等变化趋势。本地优先存储，开启云同步后写入飞书。
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
                  <Card size="small" title="录入一次评估">
                    <Form form={form} layout="vertical" onFinish={onAdd}>
                      <Form.Item name="date" label="日期" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                      {ABILITY_DIMS.map((d) => (
                        <Form.Item
                          key={d}
                          name={d}
                          label={
                            <span>
                              {d} <span style={{ color: '#94A3B8', fontWeight: 400 }}>(1-5)</span>
                            </span>
                          }
                          extra={<span style={{ color: '#94A3B8', fontSize: 12 }}>1 = 弱&nbsp;&nbsp;3 = 一般&nbsp;&nbsp;5 = 强（家庭/老师日常观察，不是诊断）</span>}
                        >
                          <InputNumber min={1} max={5} step={0.5} style={{ width: '100%' }} placeholder="例如 3（可填 1.5 / 2.5）" />
                        </Form.Item>
                      ))}
                      <Form.Item name="note" label="备注（可选）">
                        <Input placeholder="如 期中后/假期训练后" />
                      </Form.Item>
                      <Button type="primary" htmlType="submit" block>保存</Button>
                    </Form>
                  </Card>
                </Col>
                <Col xs={24} md={16}>
                  <Card size="small" title={`已录评估（${records.length} 条）`}
                    extra={records.length ? <Button size="small" danger onClick={() => { clearRecords(); msg.success('已清空') }}>清空</Button> : null}
                  >
                    {records.length ? (
                      <Table rowKey="id" size="small" columns={columns} dataSource={records.slice().sort((a, b) => b.date.localeCompare(a.date))} pagination={false} scroll={{ x: 'max-content', y: 320 }} />
                    ) : <Empty description="还没有评估，先在左侧录入" />}
                  </Card>
                </Col>
              </Row>
            )
          },
          {
            key: 'trend',
            label: '画像与趋势',
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                <Alert
                  type="info"
                  showIcon
                  message="本模块仅记录日常观察评分用于看趋势，不构成任何医学或心理诊断；若某维度持续偏低，建议寻求学校心理老师或专业机构评估。"
                />
                {sorted.length ? (
                  <>
                    <Card size="small" title="能力雷达（首次 vs 最新）">
                      <ReactECharts option={radarOption} style={{ height: 360 }} notMerge lazyUpdate />
                    </Card>
                    <Card size="small" title="综合分趋势（各维度平均，1-5）">
                      <ReactECharts option={trendOption} style={{ height: 280 }} notMerge lazyUpdate />
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
                <Alert
                  type="info"
                  showIcon
                  message={
                    <span>
                      评分是家庭/老师的日常观察粗略参考，用于发现趋势；分数不标签孩子、不诊断。如某维度持续偏低，建议咨询学校心理老师或专业机构。
                      <Tooltip title="色彩分档（默认 ≥4 绿 / 3-3.9 橙 / <3 红）是经验参考，可在「概览」右上 ⚙ 调整；不存在任何研究的客观阈值。">
                        <QuestionCircleOutlined style={{ marginLeft: 6, color: '#94A3B8' }} />
                      </Tooltip>
                    </span>
                  }
                />
                {last ? (
                  <Row gutter={12}>
                    {ABILITY_DIMS.map((d) => (
                      <Col xs={12} sm={8} md={6} lg={4} key={d}>
                        <Card size="small">
                          <div style={{ color: '#64748B', fontSize: 12 }}>{d}</div>
                          <div style={{ fontSize: 22, fontWeight: 600, color: abilityColor(latestScores[d] as number) }}>
                            {latestScores[d] ?? '-'}
                            <span style={{ fontSize: 12, color: '#94A3B8' }}> /5</span>
                          </div>
                        </Card>
                      </Col>
                    ))}
                    <Col xs={12} sm={8} md={6} lg={4}>
                      <Card size="small" title={
                        <span>
                          综合分
                          <Popover
                            trigger="click"
                            title="调整能力颜色分档"
                            content={
                              <Space direction="vertical" size={8} style={{ width: 220 }}>
                                <div style={{ fontSize: 12, color: '#64748B' }}>
                                  低于「低阈值」= 红；介于两者之间 = 橙；≥「高阈值」= 绿（1-5 分制）
                                </div>
                                <div>
                                  <div style={{ fontSize: 12, marginBottom: 2 }}>低阈值</div>
                                  <InputNumber min={1} max={4.9} step={0.1} value={abTh.low} onChange={(v) => updateAbTh(Number(v ?? 1), abTh.high)} style={{ width: '100%' }} />
                                </div>
                                <div>
                                  <div style={{ fontSize: 12, marginBottom: 2 }}>高阈值</div>
                                  <InputNumber min={1.1} max={5} step={0.1} value={abTh.high} onChange={(v) => updateAbTh(abTh.low, Number(v ?? 5))} style={{ width: '100%' }} />
                                </div>
                                <Button size="small" onClick={() => updateAbTh(3, 4)}>恢复默认 (3 / 4)</Button>
                                <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.4 }}>
                                  说明：这只是「颜色怎么分」的偏好，没有任何研究/标准认为「&lt;3 = 低」——你随时可改，或改为全部同色。
                                </div>
                              </Space>
                            }
                          >
                            <Button size="small" type="text" icon={<SettingOutlined />} style={{ marginLeft: 4 }} />
                          </Popover>
                        </span>
                      }>
                        <div style={{ fontSize: 22, fontWeight: 600, color: abilityColor(latestAvg) }}>{latestAvg ?? '-'}</div>
                        <div style={{ color: '#94A3B8', fontSize: 12 }}>当前阈值：&lt;{abTh.low} 红 / {abTh.low}–{abTh.high - 0.1} 橙 / ≥{abTh.high} 绿</div>
                      </Card>
                    </Col>
                  </Row>
                ) : <Empty description="暂无评估" />}
                {alerts.length > 0 ? (
                  <Alert type="warning" showIcon message="观察提示" description={<ul style={{ margin: 0, paddingLeft: 18 }}>{alerts.map((a, i) => <li key={i}>{a}</li>)}</ul>} />
                ) : (
                  <Alert type="success" showIcon message="当前观察维度均在参考范围（无 < 3 项）" />
                )}
                <Divider />
                <div style={{ color: '#94A3B8', fontSize: 12 }}>
                  注：评分是家庭/学校观察的粗略参考，用于发现趋势；分数不标签孩子，也不作为任何诊断依据。
                </div>
              </Space>
            )
          }
        ]}
      />
    </div>
  )
}
