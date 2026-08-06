import { useMemo, useState, useEffect } from 'react'
import {
  Card, Tabs, Form, Input, InputNumber, DatePicker, Button, Table, Tag,
  Empty, Statistic, Row, Col, Space, App, Divider, Switch, Alert, Select
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import echarts from '../lib/echarts'
import dayjs from 'dayjs'
import {
  useHealthStore, calcBmi, bmiCategory, VISION_WATCH,
  type HealthRecord, type Mood
} from '../store/useHealthStore'
import { feishuSync, useCloudOn } from '../store/feishuSync'

const { TextArea } = Input
const MOODS: Mood[] = ['好', '中', '差']
const MOOD_COLOR: Record<string, string> = { 好: '#0EA5A4', 中: '#F59E0B', 差: '#EF4444' }

function newId() {
  return 'h_' + Math.random().toString(36).slice(2, 9)
}

export default function HealthManager() {
  const { records, addRecord, deleteRecord, updateRecord, clearRecords, syncFromCloud } = useHealthStore()
  const { message: msg } = App.useApp()

  // 云同步：全站共享配置，hook 响应式获取
  const cloudOn = useCloudOn()
  useEffect(() => { if (cloudOn) syncFromCloud() /* eslint-disable-next-line */ }, [cloudOn])
  const [form] = Form.useForm()
  // 编辑状态
  const [editingId, setEditingId] = useState<string | null>(null)
  const isEditing = !!editingId
  const resetForm = () => { form.resetFields(); setEditingId(null) }

  // 按日期升序（趋势用）
  const sorted = useMemo(() => [...records].sort((a, b) => a.date.localeCompare(b.date)), [records])
  const dates = useMemo(() => sorted.map((r) => r.date), [sorted])

  const bmiSeries = useMemo(
    () => sorted.map((r) => calcBmi(r) ?? null),
    [sorted]
  )
  const heightSeries = useMemo(() => sorted.map((r) => r.height ?? null), [sorted])
  const weightSeries = useMemo(() => sorted.map((r) => r.weight ?? null), [sorted])
  const visionL = useMemo(() => sorted.map((r) => r.visionLeft ?? null), [sorted])
  const visionR = useMemo(() => sorted.map((r) => r.visionRight ?? null), [sorted])
  const sleepSeries = useMemo(() => sorted.map((r) => r.sleepHours ?? null), [sorted])
  const exerciseSeries = useMemo(() => sorted.map((r) => r.exerciseMin ?? null), [sorted])

  const growthOption = useMemo(() => ({
    grid: { left: 44, right: 44, top: 36, bottom: 28 },
    tooltip: { trigger: 'axis' },
    legend: { top: 0, textStyle: { fontSize: 11 } },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10 } },
    yAxis: [
      { type: 'value', name: '身高cm', min: 0, axisLabel: { fontSize: 10 } },
      { type: 'value', name: '体重kg/BMI', min: 0, axisLabel: { fontSize: 10 } }
    ],
    series: [
      { name: '身高(cm)', type: 'line', smooth: true, yAxisIndex: 0, data: heightSeries, itemStyle: { color: '#0EA5A4' }, connectNulls: true },
      { name: '体重(kg)', type: 'line', smooth: true, yAxisIndex: 1, data: weightSeries, itemStyle: { color: '#F59E0B' }, connectNulls: true },
      { name: 'BMI', type: 'line', smooth: true, yAxisIndex: 1, data: bmiSeries, itemStyle: { color: '#6366F1' }, connectNulls: true }
    ]
  }), [dates, heightSeries, weightSeries, bmiSeries])

  const visionOption = useMemo(() => ({
    grid: { left: 40, right: 16, top: 36, bottom: 28 },
    tooltip: { trigger: 'axis', valueFormatter: (v: any) => (v == null ? '-' : v) },
    legend: { top: 0, textStyle: { fontSize: 11 } },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', min: 3.5, max: 5.3, name: '对数视力', axisLabel: { fontSize: 10 } },
    series: [
      { name: '视力左', type: 'line', smooth: true, data: visionL, itemStyle: { color: '#10B981' }, connectNulls: true },
      { name: '视力右', type: 'line', smooth: true, data: visionR, itemStyle: { color: '#EF4444' }, connectNulls: true,
        markLine: { silent: true, symbol: 'none', data: [{ yAxis: VISION_WATCH }], label: { formatter: '关注线 4.8', fontSize: 10 }, lineStyle: { color: '#EF4444', type: 'dashed' } } }
    ]
  }), [dates, visionL, visionR])

  const habitOption = useMemo(() => ({
    grid: { left: 40, right: 44, top: 36, bottom: 28 },
    tooltip: { trigger: 'axis' },
    legend: { top: 0, textStyle: { fontSize: 11 } },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10 } },
    yAxis: [
      { type: 'value', name: '睡眠h', min: 0, axisLabel: { fontSize: 10 } },
      { type: 'value', name: '运动min', min: 0, axisLabel: { fontSize: 10 } }
    ],
    series: [
      { name: '睡眠(小时)', type: 'bar', yAxisIndex: 0, data: sleepSeries, itemStyle: { color: '#0EA5A4' } },
      { name: '运动(分钟)', type: 'bar', yAxisIndex: 1, data: exerciseSeries, itemStyle: { color: '#F97316' } }
    ]
  }), [dates, sleepSeries, exerciseSeries])

  // 最新一条（按日期）
  const latest = useMemo(() => (records.length ? [...records].sort((a, b) => b.date.localeCompare(a.date))[0] : undefined), [records])
  const latestBmi = latest ? calcBmi(latest) : undefined
  const latestBmiCat = latestBmi != null ? bmiCategory(latestBmi) : undefined

  // 关注项汇总（非诊断提示）
  const alerts = useMemo(() => {
    const list: string[] = []
    if (latestBmiCat?.warn) list.push(`BMI ${latestBmi}（${latestBmiCat.label}），建议留意饮食与运动，必要时咨询儿科/保健科`)
    if (latest && (latest.visionLeft != null && latest.visionLeft < VISION_WATCH)) list.push(`左眼视力 ${latest.visionLeft} < 4.8，建议复查眼科`)
    if (latest && (latest.visionRight != null && latest.visionRight < VISION_WATCH)) list.push(`右眼视力 ${latest.visionRight} < 4.8，建议复查眼科`)
    if (latest && (latest.sleepHours != null && latest.sleepHours < 8)) list.push(`睡眠仅 ${latest.sleepHours} 小时，小学生建议 9–11 小时`)
    return list
  }, [latest, latestBmi, latestBmiCat])

  const onAdd = (values: any) => {
    const rec: HealthRecord = {
      id: newId(),
      date: values.date.format('YYYY-MM-DD'),
      height: values.height || undefined,
      weight: values.weight || undefined,
      visionLeft: values.visionLeft || undefined,
      visionRight: values.visionRight || undefined,
      sleepHours: values.sleepHours || undefined,
      exerciseMin: values.exerciseMin || undefined,
      mood: values.mood || undefined,
      note: values.note || '',
    }
    addRecord(rec)
    form.resetFields()
    msg.success('已保存身心记录')
    if (cloudOn) feishuSync.pushHealth([rec as any]).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
  }
  const onDelete = (r: HealthRecord) => {
    deleteRecord(r.id)
    if (cloudOn) feishuSync.deleteHealth([r.id]).catch((e) => msg.warning('飞书删除失败：' + e.message))
  }
  const onEdit = (r: HealthRecord) => {
    setEditingId(r.id)
    form.setFieldsValue({
      date: dayjs(r.date),
      height: r.height,
      weight: r.weight,
      visionLeft: r.visionLeft,
      visionRight: r.visionRight,
      sleepHours: r.sleepHours,
      exerciseMin: r.exerciseMin,
      mood: r.mood,
      note: r.note,
    })
    msg.info('已载入该记录，修改后点「更新」即可')
  }
  const onUpdate = (values: any) => {
    if (!editingId) return
    const patch = {
      date: values.date.format('YYYY-MM-DD'),
      height: values.height || undefined,
      weight: values.weight || undefined,
      visionLeft: values.visionLeft || undefined,
      visionRight: values.visionRight || undefined,
      sleepHours: values.sleepHours || undefined,
      exerciseMin: values.exerciseMin || undefined,
      mood: values.mood || undefined,
      note: values.note || '',
    }
    updateRecord(editingId, patch)
    msg.success('已更新身心记录')
    setEditingId(null)
    form.resetFields()
    if (cloudOn) {
      const full = useHealthStore.getState().records.find((r) => r.id === editingId)
      if (full) feishuSync.pushHealth([full as any]).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
    }
  }

  const columns: ColumnsType<HealthRecord> = [
    { title: '日期', dataIndex: 'date', width: 110 },
    { title: '身高cm', dataIndex: 'height', render: (v) => v ?? '-' },
    { title: '体重kg', dataIndex: 'weight', render: (v) => v ?? '-' },
    { title: 'BMI', render: (_, r) => { const b = calcBmi(r); return b != null ? <Tag color={bmiCategory(b).color}>{b} {bmiCategory(b).label}</Tag> : '-' } },
    { title: '视力', render: (_, r) => `${r.visionLeft ?? '-'}/${r.visionRight ?? '-'}` },
    { title: '睡眠h', dataIndex: 'sleepHours', render: (v) => v ?? '-' },
    { title: '运动min', dataIndex: 'exerciseMin', render: (v) => v ?? '-' },
    { title: '情绪', dataIndex: 'mood', width: 70, render: (v) => v ? <Tag color={MOOD_COLOR[v]}>{v}</Tag> : '-' },
    { title: '备注', dataIndex: 'note', ellipsis: true },
    { title: '操作', width: 120, render: (_, r) => (
      <Space size={4}>
        <Button type="link" size="small" disabled={isEditing && editingId !== r.id} onClick={() => onEdit(r)}>编辑</Button>
        <Button type="link" danger size="small" onClick={() => onDelete(r)}>删除</Button>
      </Space>
    ) }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>身心健康与身体发育监测</h2>
        <div style={{ color: '#64748B', fontSize: 13 }}>
          本地优先存储（刷新不丢）；开启云同步后写入飞书多维表格（境内）。身高/体重一学期测 1–2 次即可，睡眠/运动可更勤。
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
                  <Card size="small" title={isEditing ? '编辑该记录' : '录入一次测量/打卡'} extra={isEditing ? <Button size="small" onClick={resetForm}>取消编辑</Button> : null} style={isEditing ? { borderColor: '#0EA5A4' } : undefined}>
                    <Form form={form} layout="vertical" onFinish={isEditing ? onUpdate : onAdd}>
                      <Form.Item name="date" label="日期" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item name="height" label="身高 (cm)">
                        <InputNumber min={50} max={220} style={{ width: '100%' }} placeholder="如 140" />
                      </Form.Item>
                      <Form.Item name="weight" label="体重 (kg)">
                        <InputNumber min={10} max={150} style={{ width: '100%' }} placeholder="如 34" />
                      </Form.Item>
                      <Form.Item name="visionLeft" label="视力左 (对数，如 5.0)">
                        <InputNumber min={3} max={5.5} step={0.1} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item name="visionRight" label="视力右 (对数，如 5.0)">
                        <InputNumber min={3} max={5.5} step={0.1} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item name="sleepHours" label="睡眠 (小时)">
                        <InputNumber min={0} max={16} step={0.5} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item name="exerciseMin" label="运动 (分钟)">
                        <InputNumber min={0} max={600} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item name="mood" label="情绪（可选）">
                        <Select allowClear placeholder="选一项" options={MOODS.map((m) => ({ value: m, label: m }))} />
                      </Form.Item>
                      <Form.Item name="note" label="备注（可选）">
                        <Input placeholder="如 感冒/换季/比赛后" />
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
                  message="数据仅供家长观察趋势，分级/关注线由代码按通用标准判定，非医学诊断；如有持续异常请以儿科/眼科/保健科专业意见为准。"
                />
                {sorted.length ? (
                  <>
                    <Card size="small" title="生长曲线（身高 / 体重 / BMI）">
                      <ReactEChartsCore echarts={echarts} option={growthOption} style={{ height: 300 }} notMerge lazyUpdate />
                    </Card>
                    <Card size="small" title="视力趋势（对数视力，虚线为 4.8 关注线）">
                      <ReactEChartsCore echarts={echarts} option={visionOption} style={{ height: 280 }} notMerge lazyUpdate />
                    </Card>
                    <Card size="small" title="睡眠与运动打卡">
                      <ReactEChartsCore echarts={echarts} option={habitOption} style={{ height: 280 }} notMerge lazyUpdate />
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
                {latest ? (
                  <Row gutter={12}>
                    <Col xs={12} sm={8} md={6} lg={4}><Card size="small"><Statistic title="最新身高" value={latest.height ?? '-'} suffix="cm" valueStyle={{ fontSize: 20 }} /></Card></Col>
                    <Col xs={12} sm={8} md={6} lg={4}><Card size="small"><Statistic title="最新体重" value={latest.weight ?? '-'} suffix="kg" valueStyle={{ fontSize: 20 }} /></Card></Col>
                    <Col xs={12} sm={8} md={6} lg={4}><Card size="small"><Statistic title="BMI" value={latestBmi ?? '-'} valueStyle={{ color: latestBmiCat?.warn ? latestBmiCat.color : '#0EA5A4', fontSize: 20 }} /></Card></Col>
                    <Col xs={12} sm={8} md={6} lg={4}><Card size="small"><Statistic title="视力(左/右)" value={`${latest.visionLeft ?? '-'}/${latest.visionRight ?? '-'}`} valueStyle={{ fontSize: 18 }} /></Card></Col>
                    <Col xs={12} sm={8} md={6} lg={4}><Card size="small"><Statistic title="睡眠" value={latest.sleepHours ?? '-'} suffix="h" valueStyle={{ fontSize: 20 }} /></Card></Col>
                    <Col xs={12} sm={8} md={6} lg={4}><Card size="small"><Statistic title="运动" value={latest.exerciseMin ?? '-'} suffix="min" valueStyle={{ fontSize: 20 }} /></Card></Col>
                  </Row>
                ) : <Empty description="暂无记录" />}
                {latestBmiCat && (
                  <div><Tag color={latestBmiCat.color}>BMI 分级：{latestBmiCat.label}</Tag></div>
                )}
                {alerts.length > 0 ? (
                  <Alert type="warning" showIcon message="关注项" description={<ul style={{ margin: 0, paddingLeft: 18 }}>{alerts.map((a, i) => <li key={i}>{a}</li>)}</ul>} />
                ) : (
                  <Alert type="success" showIcon message="当前指标在参考范围内，继续保持" />
                )}
                <Divider />
                <div style={{ color: '#94A3B8', fontSize: 12 }}>
                  注：体重/克数等仅家长端可见（本工作台无孩子端视图）；BMI 用通用成人标准粗略分级，儿童发育请以保健科曲线为准。
                </div>
              </Space>
            )
          }
        ]}
      />
    </div>
  )
}
