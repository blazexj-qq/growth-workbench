import { useMemo, useState, useEffect } from 'react'
import {
  Card, Tabs, Form, Input, InputNumber, DatePicker, Button, Table, Tag,
  Empty, Row, Col, Space, App, Divider, Switch, Alert, Progress
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import echarts from '../lib/echarts'
import {
  useAdmissionStore,
  type AdmissionRecord
} from '../store/useAdmissionStore'
import { feishuSync, useCloudOn } from '../store/feishuSync'
import dayjs from 'dayjs'

const { TextArea } = Input

function newId() {
  return 'ad_' + Math.random().toString(36).slice(2, 9)
}

export default function FAdmissionManager() {
  const { records, addRecord, deleteRecord, updateRecord, clearRecords, syncFromCloud } = useAdmissionStore()
  const { message: msg } = App.useApp()

  // 云同步：全站共享配置，hook 响应式获取
  const cloudOn = useCloudOn()
  useEffect(() => { if (cloudOn) syncFromCloud() /* eslint-disable-next-line */ }, [cloudOn])
  const [form] = Form.useForm()
  // 编辑状态
  const [editingId, setEditingId] = useState<string | null>(null)
  const isEditing = !!editingId
  const resetForm = () => { form.resetFields(); setEditingId(null) }

  const sorted = useMemo(() => [...records].sort((a, b) => a.date.localeCompare(b.date)), [records])
  const dates = useMemo(() => sorted.map((r) => r.date), [sorted])
  const scoreSeries = useMemo(() => sorted.map((r) => (r.totalScore != null ? r.totalScore : null)), [sorted])
  const rankSeries = useMemo(() => sorted.map((r) => (r.rank != null ? r.rank : null)), [sorted])
  const last = sorted[sorted.length - 1]
  const scoreRate = last && last.fullScore ? Math.round(((last.totalScore || 0) / (last.fullScore || 1)) * 100) : undefined

  const scoreOption = useMemo(() => ({
    grid: { left: 44, right: 16, top: 36, bottom: 28 },
    tooltip: { trigger: 'axis' },
    legend: { top: 0, textStyle: { fontSize: 11 } },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', name: '总分', axisLabel: { fontSize: 10 } },
    series: [{ name: '总分', type: 'line', data: scoreSeries, itemStyle: { color: '#0EA5A4' }, connectNulls: true }],
  }), [dates, scoreSeries])

  const rankOption = useMemo(() => ({
    grid: { left: 52, right: 16, top: 36, bottom: 28 },
    tooltip: { trigger: 'axis' },
    legend: { top: 0, textStyle: { fontSize: 11 } },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', name: '估算位次', axisLabel: { fontSize: 10 } },
    series: [{ name: '估算位次', type: 'line', data: rankSeries, itemStyle: { color: '#F59E0B' }, connectNulls: true }],
  }), [dates, rankSeries])

  const onAdd = (values: any) => {
    const rec: AdmissionRecord = {
      id: newId(),
      date: values.date.format('YYYY-MM-DD'),
      examName: values.examName || '',
      totalScore: values.totalScore != null && values.totalScore !== '' ? Number(values.totalScore) : undefined,
      fullScore: values.fullScore != null && values.fullScore !== '' ? Number(values.fullScore) : undefined,
      rank: values.rank != null && values.rank !== '' ? Number(values.rank) : undefined,
      targetSchool: values.targetSchool || '',
      note: values.note || '',
    }
    addRecord(rec)
    form.resetFields()
    msg.success('已保存模考记录')
    if (cloudOn) feishuSync.pushAdmission([rec as any]).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
  }
  const onDelete = (r: AdmissionRecord) => {
    deleteRecord(r.id)
    if (cloudOn) feishuSync.deleteAdmission([r.id]).catch((e) => msg.warning('飞书删除失败：' + e.message))
  }
  const onEdit = (r: AdmissionRecord) => {
    setEditingId(r.id)
    form.setFieldsValue({
      date: dayjs(r.date),
      examName: r.examName,
      totalScore: r.totalScore,
      fullScore: r.fullScore,
      rank: r.rank,
      targetSchool: r.targetSchool,
      note: r.note,
    })
    msg.info('已载入该记录，修改后点「更新」即可')
  }
  const onUpdate = (values: any) => {
    if (!editingId) return
    const patch = {
      date: values.date.format('YYYY-MM-DD'),
      examName: values.examName || '',
      totalScore: values.totalScore != null && values.totalScore !== '' ? Number(values.totalScore) : undefined,
      fullScore: values.fullScore != null && values.fullScore !== '' ? Number(values.fullScore) : undefined,
      rank: values.rank != null && values.rank !== '' ? Number(values.rank) : undefined,
      targetSchool: values.targetSchool || '',
      note: values.note || '',
    }
    updateRecord(editingId, patch)
    msg.success('已更新模考记录')
    setEditingId(null)
    form.resetFields()
    if (cloudOn) {
      const full = useAdmissionStore.getState().records.find((r) => r.id === editingId)
      if (full) feishuSync.pushAdmission([full as any]).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
    }
  }

  const columns: ColumnsType<AdmissionRecord> = [
    { title: '日期', dataIndex: 'date', width: 100 },
    { title: '考试', dataIndex: 'examName', ellipsis: true, render: (v: string) => v || '-' },
    { title: '总分', width: 76, render: (_, r) => (r.totalScore != null ? `${r.totalScore}` : '-') },
    { title: '满分', width: 64, render: (_, r) => (r.fullScore != null ? `${r.fullScore}` : '-') },
    { title: '位次', width: 72, render: (_, r) => (r.rank != null ? `${r.rank}` : '-') },
    { title: '目标学校', dataIndex: 'targetSchool', ellipsis: true, render: (v: string) => v || '-' },
    { title: '备注', dataIndex: 'note', ellipsis: true, render: (v: string) => v || '-' },
    { title: '操作', width: 120, render: (_, r) => (
      <Space size={4}>
        <Button type="link" size="small" disabled={isEditing && editingId !== r.id} onClick={() => onEdit(r)}>编辑</Button>
        <Button type="link" danger size="small" onClick={() => onDelete(r)}>删除</Button>
      </Space>
    ) },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>中高考升学助手（模考记录）</h2>
        <div style={{ color: '#64748B', fontSize: 13 }}>
          记录模考分数、估算位次与目标学校，看分数与位次趋势。M1 先落地本地数据层；多 Agent 估分/概率分析为后续规划。
        </div>
      </div>

            <Tabs items={[
        {
          key: 'input', label: '录入与记录',
          children: (
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Card size="small" title={isEditing ? '编辑该模考' : '录入一次模考'} extra={isEditing ? <Button size="small" onClick={resetForm}>取消编辑</Button> : null} style={isEditing ? { borderColor: '#0EA5A4' } : undefined}>
                  <Form form={form} layout="vertical" onFinish={isEditing ? onUpdate : onAdd}>
                    <Form.Item name="date" label="日期" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="examName" label="考试名"><Input placeholder="一模/二模/期末" /></Form.Item>
                    <Form.Item name="totalScore" label="总分"><InputNumber min={0} max={1500} style={{ width: '100%' }} placeholder="如 412" /></Form.Item>
                    <Form.Item name="fullScore" label="满分"><InputNumber min={0} max={1500} style={{ width: '100%' }} placeholder="如 500" /></Form.Item>
                    <Form.Item name="rank" label="估算位次"><InputNumber min={0} max={99999} style={{ width: '100%' }} placeholder="全区/全市自估" /></Form.Item>
                    <Form.Item name="targetSchool" label="目标学校"><Input placeholder="如 一中思益" /></Form.Item>
                    <Form.Item name="note" label="备注（可选）"><Input placeholder="如 数学建模仍丢分" /></Form.Item>
                    <Button type="primary" htmlType="submit" block>{isEditing ? '更新记录' : '保存'}</Button>
                  </Form>
                </Card>
              </Col>
              <Col xs={24} md={16}>
                <Card size="small" title={`已录记录（${records.length} 条）`}
                  extra={records.length ? <Button size="small" danger onClick={() => { clearRecords(); msg.success('已清空') }}>清空</Button> : null}>
                  {records.length ? (
                    <Table rowKey="id" size="small" columns={columns} dataSource={records.slice().sort((a, b) => b.date.localeCompare(a.date))} pagination={false} scroll={{ x: 'max-content', y: 320 }} rowClassName={(r) => (r.id === editingId ? 'row-editing' : '')} />
                  ) : <Empty description="还没有记录，先在左侧录入" />}
                </Card>
              </Col>
            </Row>
          )
        },
        {
          key: 'trend', label: '趋势分析',
          children: (
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <Alert type="info" showIcon message="位次为家庭自估算的参考值，非官方排名；本模块仅记录客观分数与目标意向，绝不做「考不上/必须冲某校」等绝对化结论。" />
              {sorted.length ? (
                <>
                  <Card size="small" title="总分趋势"><ReactEChartsCore echarts={echarts} option={scoreOption} style={{ height: 260 }} notMerge lazyUpdate /></Card>
                  <Card size="small" title="估算位次趋势（越低越好）"><ReactEChartsCore echarts={echarts} option={rankOption} style={{ height: 260 }} notMerge lazyUpdate /></Card>
                </>
              ) : <Empty description="暂无数据" />}
            </Space>
          )
        },
        {
          key: 'overview', label: '概览',
          children: (
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <Row gutter={12}>
                <Col xs={12} sm={8} md={6} lg={4}><Card size="small">
                  <div style={{ color: '#64748B', fontSize: 12 }}>最近总分</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: '#0EA5A4' }}>{last?.totalScore != null ? `${last.totalScore}` : '-'}</div>
                </Card></Col>
                <Col xs={12} sm={8} md={6} lg={4}><Card size="small">
                  <div style={{ color: '#64748B', fontSize: 12 }}>满分</div>
                  <div style={{ fontSize: 22, fontWeight: 600 }}>{last?.fullScore != null ? `${last.fullScore}` : '-'}</div>
                </Card></Col>
                <Col xs={12} sm={8} md={6} lg={4}><Card size="small">
                  <div style={{ color: '#64748B', fontSize: 12 }}>估算位次</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: '#F59E0B' }}>{last?.rank != null ? `${last.rank}` : '-'}</div>
                </Card></Col>
                <Col xs={24} sm={8} md={12} lg={12}><Card size="small" title="最近得分率">
                  <Progress percent={scoreRate != null ? scoreRate : 0} status={scoreRate != null ? 'normal' : 'success'} format={() => `${last?.totalScore ?? 0}/${last?.fullScore ?? 0}`} />
                  <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>得分率仅参考，非硬性标准。</div>
                </Card></Col>
              </Row>
              {last ? (<Card size="small" title={`最新记录（${last.date}）`}>
                <DespList rec={last} />
              </Card>) : <Empty description="暂无记录" />}
              <Divider />
              <div style={{ color: '#94A3B8', fontSize: 12 }}>注：本模块只做模考记录与位次/目标趋势观察，不评价「考得好不好/学校行不行」；多 Agent 估分概率分析为后续规划，预留接入点。</div>
            </Space>
          )
        }
      ]} />
    </div>
  )
}

function DespList({ rec }: { rec: AdmissionRecord }) {
  const items: [string, string?][] = [
    ['考试', rec.examName], ['总分', rec.totalScore != null ? `${rec.totalScore}` : undefined],
    ['满分', rec.fullScore != null ? `${rec.fullScore}` : undefined], ['估算位次', rec.rank != null ? `${rec.rank}` : undefined],
    ['目标学校', rec.targetSchool], ['备注', rec.note],
  ]
  return (<Row gutter={[12, 8]}>{items.map(([k, v]) => (<Col xs={24} sm={12} md={8} key={k}><div style={{ fontSize: 13 }}><span style={{ color: '#64748B' }}>{k}：</span><span>{v || '-'}</span></div></Col>))}</Row>)
}
