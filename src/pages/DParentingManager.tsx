import { useMemo, useState, useEffect } from 'react'
import {
  Card, Tabs, Form, Input, InputNumber, DatePicker, Button, Table, Tag, Tooltip,
  Empty, Row, Col, Space, App, Divider, Switch, Alert, Progress, Select
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import ReactECharts from 'echarts-for-react'
import {
  useParentingStore, PARENTING_TYPES,
  type ParentingRecord
} from '../store/useParentingStore'
import { feishuSync, useCloudOn } from '../store/feishuSync'
import { axisBase } from '../utils/chartStyle'

const { TextArea } = Input

function newId() {
  return 'pa_' + Math.random().toString(36).slice(2, 9)
}

// 情绪分值色彩（1 低落 → 5 愉悦）
function moodColor(v?: number): string {
  if (v == null) return '#94A3B8'
  if (v <= 2) return '#EF4444'
  if (v === 3) return '#F59E0B'
  return '#0EA5A4'
}

export default function DParentingManager() {
  const { records, addRecord, updateRecord, deleteRecord, clearRecords, syncFromCloud } = useParentingStore()
  const { message: msg } = App.useApp()

  // 云同步：全站共享配置，hook 响应式获取
  const cloudOn = useCloudOn()
  useEffect(() => { if (cloudOn) syncFromCloud() /* eslint-disable-next-line */ }, [cloudOn])
  const [form] = Form.useForm()

  // 编辑状态：null = 新增；string = 正在编辑的记录 id
  const [editingId, setEditingId] = useState<string | null>(null)
  const isEditing = !!editingId
  const resetForm = () => { form.resetFields(); setEditingId(null) }

  // 按日期升序
  const sorted = useMemo(() => [...records].sort((a, b) => a.date.localeCompare(b.date)), [records])
  const dates = useMemo(() => sorted.map((r) => r.date), [sorted])
  const durSeries = useMemo(() => sorted.map((r) => (r.durationMin != null ? r.durationMin : null)), [sorted])
  const childSeries = useMemo(() => sorted.map((r) => (r.childMood != null ? r.childMood : null)), [sorted])
  const parentSeries = useMemo(() => sorted.map((r) => (r.parentMood != null ? r.parentMood : null)), [sorted])
  const last = sorted[sorted.length - 1]

  // 统一图表审美（大厂风格，见 src/utils/chartStyle）
  const baseAxis = axisBase()

  const durOption = useMemo(() => ({
    grid: { left: 48, right: 24, top: 36, bottom: 36, containLabel: true },
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(15,23,42,0.92)', borderWidth: 0,
      textStyle: { color: '#fff', fontSize: 12 },
      extraCssText: 'box-shadow: 0 6px 18px rgba(0,0,0,0.18); border-radius: 6px;',
      formatter: (params: any[]) => {
        const p = params[0]
        return `<div style="padding:2px 4px"><div style="font-size:11px;opacity:.7;margin-bottom:2px">${p.axisValueLabel}</div><div style="font-size:13px;font-weight:600">${p.seriesName} ${p.value} 分钟</div></div>`
      },
    },
    legend: { top: 0, textStyle: { fontSize: 12, color: '#475569' } },
    xAxis: { ...baseAxis, type: 'category', data: dates },
    yAxis: { ...baseAxis, type: 'value', name: '分钟', nameTextStyle: { fontSize: 12, color: '#64748B', padding: [0, 0, 0, 0] }, splitLine: { lineStyle: { color: '#E2E8F0', type: 'dashed' } } },
    series: [
      {
        name: '陪伴时长', type: 'bar', data: durSeries, connectNulls: true,
        barWidth: 18, barGap: '60%',
        itemStyle: { color: '#0EA5A4', borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top', fontSize: 12, color: '#0F766E', formatter: '{c}′' },
      },
    ],
  }), [dates, durSeries])

  const moodOption = useMemo(() => ({
    grid: { left: 48, right: 24, top: 36, bottom: 36, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'line' } },
    legend: { top: 0, textStyle: { fontSize: 12, color: '#475569' } },
    xAxis: { ...baseAxis, type: 'category', data: dates },
    yAxis: { ...baseAxis, type: 'value', name: '情绪(1-5)', min: 0, max: 5, splitLine: { lineStyle: { color: '#E2E8F0', type: 'dashed' } } },
    series: [
      { name: '孩子情绪', type: 'line', data: childSeries, connectNulls: true, smooth: true, symbolSize: 6, lineStyle: { width: 2.5, color: '#6366F1' }, itemStyle: { color: '#6366F1' } },
      { name: '家长情绪', type: 'line', data: parentSeries, connectNulls: true, smooth: true, symbolSize: 6, lineStyle: { width: 2.5, color: '#F59E0B' }, itemStyle: { color: '#F59E0B' } },
    ],
  }), [dates, childSeries, parentSeries])

  // 近 7 天均值 & 累计互动次数
  const recent7 = sorted.slice(-7)
  const avgDur = recent7.length ? Math.round(recent7.reduce((a, r) => a + (r.durationMin || 0), 0) / recent7.length) : undefined
  const avgChild = recent7.length ? Number((recent7.reduce((a, r) => a + (r.childMood || 0), 0) / recent7.length).toFixed(1)) : undefined
  const avgParent = recent7.length ? Number((recent7.reduce((a, r) => a + (r.parentMood || 0), 0) / recent7.length).toFixed(1)) : undefined

  // 防焦虑 / 非诊断提示（仅家长端）
  const alerts: string[] = []
  if (recent7.length && recent7.every((r) => (r.durationMin || 0) <= 15)) {
    alerts.push('近期陪伴时长偏短（多日 ≤15 分钟）。记录仅作观察，忙周属正常；若长期明显偏低，可试着每天固定 15 分钟"专属亲子时间"，不必自责。')
  }
  if (avgChild != null && avgChild <= 2) {
    alerts.push(`近 7 天孩子情绪均值约 ${avgChild}/5，偏低。这只是记录参考，可留意近期是否有压力源（学业/同伴）；持续低落建议与学校心理老师聊聊，本工具不做任何心理诊断。`)
  }

  const onAdd = (values: any) => {
    const rec: ParentingRecord = {
      id: newId(),
      date: values.date.format('YYYY-MM-DD'),
      type: values.type || '其他',
      durationMin: values.durationMin != null && values.durationMin !== '' ? Number(values.durationMin) : undefined,
      childMood: values.childMood != null && values.childMood !== '' ? Number(values.childMood) : undefined,
      parentMood: values.parentMood != null && values.parentMood !== '' ? Number(values.parentMood) : undefined,
      keyPoint: values.keyPoint || '',
      note: values.note || '',
    }
    addRecord(rec)
    form.resetFields()
    msg.success('已保存亲子记录')
    if (cloudOn) feishuSync.pushParenting([rec as any]).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
  }
  const onUpdate = (values: any) => {
    if (!editingId) return
    const patch: Partial<ParentingRecord> = {
      date: values.date.format('YYYY-MM-DD'),
      type: values.type || '其他',
      durationMin: values.durationMin != null && values.durationMin !== '' ? Number(values.durationMin) : undefined,
      childMood: values.childMood != null && values.childMood !== '' ? Number(values.childMood) : undefined,
      parentMood: values.parentMood != null && values.parentMood !== '' ? Number(values.parentMood) : undefined,
      keyPoint: values.keyPoint || '',
      note: values.note || '',
    }
    updateRecord(editingId, patch)
    msg.success('已更新亲子记录')
    setEditingId(null)
    form.resetFields()
    if (cloudOn) {
      const full = useParentingStore.getState().records.find((r) => r.id === editingId)
      if (full) feishuSync.pushParenting([full as any]).catch(() => {})
    }
  }
  const onDelete = (r: ParentingRecord) => {
    if (editingId === r.id) resetForm()
    deleteRecord(r.id)
    if (cloudOn) feishuSync.deleteParenting([r.id]).catch((e) => msg.warning('飞书删除失败：' + e.message))
  }
  const onEdit = (r: ParentingRecord) => {
    setEditingId(r.id)
    form.setFieldsValue({
      date: (window as any).dayjs ? (window as any).dayjs(r.date) : r.date,
      type: r.type,
      durationMin: r.durationMin,
      childMood: r.childMood,
      parentMood: r.parentMood,
      keyPoint: r.keyPoint,
      note: r.note,
    })
    msg.info('已载入该记录，修改后点「更新」即可')
  }

  const columns: ColumnsType<ParentingRecord> = [
    { title: '日期', dataIndex: 'date', width: 100 },
    { title: '类型', dataIndex: 'type', width: 96, render: (v: string) => <Tag color="cyan">{v || '其他'}</Tag> },
    { title: '时长', width: 72, render: (_, r) => (r.durationMin != null ? `${r.durationMin}′` : '-') },
    { title: '孩子情绪', width: 96, render: (_, r) => (r.childMood != null ? <Tag color={moodColor(r.childMood)}>{r.childMood}</Tag> : '-') },
    { title: '家长情绪', width: 96, render: (_, r) => (r.parentMood != null ? <Tag color={moodColor(r.parentMood)}>{r.parentMood}</Tag> : '-') },
    {
      title: '沟通要点', dataIndex: 'keyPoint', width: 220,
      render: (v: string) => v ? (
        <Tooltip placement="topLeft" title={v} overlayInnerStyle={{ maxWidth: 360 }}>
          <span style={{ display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'bottom' }}>{v}</span>
        </Tooltip>
      ) : '-',
    },
    {
      title: '备注', dataIndex: 'note', width: 180,
      render: (v: string) => v ? (
        <Tooltip placement="topLeft" title={v} overlayInnerStyle={{ maxWidth: 320 }}>
          <span style={{ display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'bottom' }}>{v}</span>
        </Tooltip>
      ) : '-',
    },
    { title: '操作', width: 120, fixed: 'right' as const, render: (_, r) => (
      <Space size={4}>
        <Button type="link" size="small" disabled={isEditing && editingId !== r.id} onClick={() => onEdit(r)}>编辑</Button>
        <Button type="link" danger size="small" onClick={() => onDelete(r)}>删除</Button>
      </Space>
    ) },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>亲子关系管理</h2>
        <div style={{ color: '#64748B', fontSize: 13 }}>
          记录亲子互动类型、时长与双方情绪，看陪伴质量与情绪走向。本地优先存储，开启云同步后写入飞书。
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
                  <Card
                    size="small"
                    title={isEditing ? '编辑该亲子互动' : '录入一次亲子互动'}
                    extra={isEditing ? <Button size="small" onClick={resetForm}>取消编辑</Button> : null}
                    style={isEditing ? { borderColor: '#0EA5A4' } : undefined}
                  >
                    <Form form={form} layout="vertical" onFinish={isEditing ? onUpdate : onAdd}>
                      <Form.Item name="date" label="日期" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item name="type" label="活动类型" initialValue="深度谈话">
                        <Select options={PARENTING_TYPES.map((m) => ({ label: m, value: m }))} />
                      </Form.Item>
                      <Form.Item name="durationMin" label="时长（分钟）">
                        <InputNumber min={0} max={600} style={{ width: '100%' }} placeholder="如 30" />
                      </Form.Item>
                      <Form.Item name="childMood" label="孩子情绪（1-5，1 低落 → 5 愉悦）">
                        <InputNumber min={1} max={5} style={{ width: '100%' }} placeholder="孩子当时心情" />
                      </Form.Item>
                      <Form.Item name="parentMood" label="家长情绪（1-5，1 低落 → 5 愉悦）">
                        <InputNumber min={1} max={5} style={{ width: '100%' }} placeholder="您当时心情" />
                      </Form.Item>
                      <Form.Item name="keyPoint" label="沟通要点">
                        <TextArea rows={2} placeholder="如 聊了学校趣事 / 一起定了周末计划" />
                      </Form.Item>
                      <Form.Item name="note" label="备注（可选）">
                        <Input placeholder="如 下次可改进的沟通方式" />
                      </Form.Item>
                      <Button type="primary" htmlType="submit" block>{isEditing ? '更新记录' : '保存'}</Button>
                    </Form>
                  </Card>
                </Col>
                <Col xs={24} md={16}>
                  <Card size="small" title={`已录记录（${records.length} 条）`}
                    extra={records.length ? <Button size="small" danger onClick={() => { clearRecords(); msg.success('已清空') }}>清空</Button> : null}
                  >
                    {records.length ? (
                      <Table rowKey="id" size="small" columns={columns} dataSource={records.slice().sort((a, b) => b.date.localeCompare(a.date))} pagination={false} scroll={{ x: 'max-content', y: 320 }} rowClassName={(r) => (r.id === editingId ? 'row-editing' : '')} />
                    ) : <Empty description="还没有记录，先在左侧录入" />}
                  </Card>
                </Col>
              </Row>
            )
          },
          {
            key: 'trend',
            label: '趋势分析',
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                <Alert
                  type="info"
                  showIcon
                  message="本模块仅记录亲子互动客观情况与双方情绪评分趋势，不构成任何家庭关系或心理诊断；若长期情绪低落或冲突频繁，建议与学校心理老师沟通或寻求专业评估。"
                />
                {sorted.length ? (
                  <>
                    <Card size="small" title="陪伴时长趋势（分钟）">
                      <ReactECharts option={durOption} style={{ height: 260 }} notMerge lazyUpdate />
                    </Card>
                    <Card size="small" title="孩子情绪 vs 家长情绪（1-5，越高越愉悦）">
                      <ReactECharts option={moodOption} style={{ height: 260 }} notMerge lazyUpdate />
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
                  <Col xs={12} sm={12} md={12} lg={6}>
                    <Card size="small">
                      <div style={{ color: '#64748B', fontSize: 12 }}>近7天均时长</div>
                      <div style={{ fontSize: 22, fontWeight: 600, color: '#0EA5A4' }}>{avgDur != null ? `${avgDur}′` : '-'}</div>
                    </Card>
                  </Col>
                  <Col xs={12} sm={12} md={12} lg={6}>
                    <Card size="small">
                      <div style={{ color: '#64748B', fontSize: 12 }}>近7天孩子情绪</div>
                      <div style={{ fontSize: 22, fontWeight: 600, color: moodColor(avgChild) }}>{avgChild != null ? `${avgChild}/5` : '-'}</div>
                    </Card>
                  </Col>
                  <Col xs={12} sm={12} md={12} lg={6}>
                    <Card size="small">
                      <div style={{ color: '#64748B', fontSize: 12 }}>近7天家长情绪</div>
                      <div style={{ fontSize: 22, fontWeight: 600, color: moodColor(avgParent) }}>{avgParent != null ? `${avgParent}/5` : '-'}</div>
                    </Card>
                  </Col>
                  <Col xs={12} sm={12} md={12} lg={6}>
                    <Card size="small">
                      <div style={{ color: '#64748B', fontSize: 12 }}>累计互动次数</div>
                      <div style={{ fontSize: 22, fontWeight: 600, color: '#0F766E' }}>{records.length}<span style={{ fontSize: 13, color: '#94A3B8', marginLeft: 4 }}>次</span></div>
                      <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>每周 3–5 次即不错</div>
                    </Card>
                  </Col>
                </Row>

                {last ? (
                  <Card size="small" title={`最新记录（${last.date}）`}>
                    <DespList rec={last} />
                  </Card>
                ) : <Empty description="暂无记录" />}

                {alerts.length > 0 ? (
                  <Alert type="warning" showIcon message="观察提示" description={<ul style={{ margin: 0, paddingLeft: 18 }}>{alerts.map((a, i) => <li key={i}>{a}</li>)}</ul>} />
                ) : (
                  <Alert type="success" showIcon message="当前记录未见明显异常参考项" />
                )}
                <Divider />
                <div style={{ color: '#94A3B8', fontSize: 12 }}>
                  注：本模块只做亲子互动记录与情绪趋势观察，不评价"关系好不好/脾气差不差"，更不做任何家庭关系或心理诊断；情绪评分均仅供家长参考、非硬性标准。
                </div>
              </Space>
            )
          }
        ]}
      />
      {/* 编辑中行高亮 */}
      <style>{`.row-editing td { background: #F0FDFA !important; }`}</style>
    </div>
  )
}

function DespList({ rec }: { rec: ParentingRecord }) {
  const items: [string, string?][] = [
    ['类型', rec.type],
    ['时长', rec.durationMin != null ? `${rec.durationMin}分钟` : undefined],
    ['孩子情绪', rec.childMood != null ? `${rec.childMood}/5` : undefined],
    ['家长情绪', rec.parentMood != null ? `${rec.parentMood}/5` : undefined],
    ['沟通要点', rec.keyPoint],
    ['备注', rec.note],
  ]
  return (
    <Row gutter={[12, 8]}>
      {items.map(([k, v]) => (
        <Col xs={24} sm={12} md={8} key={k}>
          <div style={{ fontSize: 13 }}>
            <span style={{ color: '#64748B' }}>{k}：</span>
            <span>{v || '-'}</span>
          </div>
        </Col>
      ))}
    </Row>
  )
}
