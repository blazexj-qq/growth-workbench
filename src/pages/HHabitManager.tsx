import { useMemo, useState, useEffect } from 'react'
import dayjs from 'dayjs'
import {
  Card, Tabs, Form, Input, InputNumber, DatePicker, Button, Table, Tag,
  Empty, Row, Col, Space, App, Divider, Switch, Alert, Select, Progress
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import echarts from '../lib/echarts'
import {
  useHabitStore,
  type HabitRecord
} from '../store/useHabitStore'
import { feishuSync, useCloudOn } from '../store/feishuSync'
import { axisBase, splitLineBase, darkTooltip, LABEL_COLOR, SUB_COLOR } from '../utils/chartStyle'

const { TextArea } = Input

function newId() {
  return 'hb_' + Math.random().toString(36).slice(2, 9)
}

// 完成状态色彩
function doneColor(v?: number): string {
  if (v === 1) return '#0EA5A4'
  if (v === 0) return '#F59E0B'
  return '#94A3B8'
}

export default function HHabitManager() {
  const { records, addRecord, deleteRecord, updateRecord, clearRecords, syncFromCloud } = useHabitStore()
  const { message: msg } = App.useApp()

  // 云同步：全站共享配置，hook 响应式获取
  const cloudOn = useCloudOn()
  useEffect(() => { if (cloudOn) syncFromCloud() /* eslint-disable-next-line */ }, [cloudOn])
  const [form] = Form.useForm()
  const [editingId, setEditingId] = useState<string | null>(null)
  const isEditing = editingId !== null
  const resetForm = () => { setEditingId(null); form.resetFields() }

  const sorted = useMemo(() => [...records].sort((a, b) => a.date.localeCompare(b.date)), [records])
  const dates = useMemo(() => sorted.map((r) => r.date), [sorted])
  // 每日完成率（已完成数 / 当天记录数）
  const completionSeries = useMemo(() => {
    const byDate: Record<string, { done: number; total: number }> = {}
    sorted.forEach((r) => {
      if (!byDate[r.date]) byDate[r.date] = { done: 0, total: 0 }
      byDate[r.date].total++
      if (r.completed === 1) byDate[r.date].done++
    })
    return dates.map((d) => (byDate[d].total ? Math.round((byDate[d].done / byDate[d].total) * 100) : null))
  }, [sorted, dates])

  const completionOption = useMemo(() => ({
    grid: { left: 48, right: 24, top: 40, bottom: 36, containLabel: true },
    tooltip: { ...darkTooltip(), trigger: 'axis', valueFormatter: (v: any) => (v == null ? '-' : v + '%') },
    legend: { top: 0, textStyle: { color: LABEL_COLOR, fontSize: 12 } },
    xAxis: { ...axisBase(), type: 'category', data: dates, boundaryGap: false },
    yAxis: { ...axisBase(), type: 'value', name: '完成率%', min: 0, max: 100, nameTextStyle: { color: SUB_COLOR, fontSize: 11 }, splitLine: splitLineBase },
    series: [{ name: '当日完成率', type: 'line', data: completionSeries, smooth: true, symbolSize: 7, lineStyle: { width: 2.5 }, itemStyle: { color: '#0EA5A4' }, areaStyle: { opacity: 0.12 }, connectNulls: true }],
  }), [dates, completionSeries])

  // 各习惯坚持度（累计完成 / 总记录）
  const habitStats = useMemo(() => {
    const m: Record<string, { done: number; total: number; lastDate: string }> = {}
    records.forEach((r) => {
      const name = r.habit || '未命名'
      if (!m[name]) m[name] = { done: 0, total: 0, lastDate: '' }
      m[name].total++
      if (r.completed === 1) m[name].done++
      if (r.date > m[name].lastDate) m[name].lastDate = r.date
    })
    return Object.entries(m).map(([name, s]) => ({
      name,
      rate: Math.round((s.done / s.total) * 100),
      done: s.done,
      total: s.total,
      lastDate: s.lastDate,
    }))
  }, [records])

  const habitBarOption = useMemo(() => ({
    grid: { left: 100, right: 28, top: 24, bottom: 24, containLabel: true },
    tooltip: { ...darkTooltip(), trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: any) => (v == null ? '-' : v + '%') },
    xAxis: { ...axisBase(), type: 'value', max: 100, name: '坚持率%', nameTextStyle: { color: SUB_COLOR, fontSize: 11 }, splitLine: splitLineBase },
    yAxis: { ...axisBase(), type: 'category', inverse: true, data: habitStats.map((h) => h.name.slice(0, 12)), axisLabel: { fontSize: 12, color: LABEL_COLOR } },
    series: [{
      type: 'bar',
      data: habitStats.map((h) => ({ value: h.rate, itemStyle: { color: h.rate >= 70 ? '#0EA5A4' : h.rate >= 40 ? '#6366F1' : '#F59E0B', borderRadius: [0, 4, 4, 0] } })),
      label: { show: true, position: 'right', formatter: '{c}%', fontSize: 12, color: LABEL_COLOR },
      barWidth: 18,
    }],
  }), [habitStats])

  // 概览指标
  const total = records.length
  const doneCount = records.filter((r) => r.completed === 1).length
  const rate = total ? Math.round((doneCount / total) * 100) : undefined
  const habitNames = new Set(records.map((r) => r.habit).filter(Boolean))
  const recent7 = sorted.slice(-7)
  // 最近连续天数（从最后一条往前数完成=1的最长连续）
  let streak = 0
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].completed === 1) streak++
    else break
  }

  // 防焦虑 / 非诊断提示（家长端）
  const alerts: string[] = []
  if (total && rate != null && rate < 50) {
    alerts.push(`整体打卡完成率约 ${rate}%，偏低。记录仅作观察——中断很正常，不必自责；可从「最小习惯」(如每天 1 件)重新开始，本工具不做任何「自律差」的评判。`)
  }

  const onAdd = (values: any) => {
    const rec: HabitRecord = {
      id: newId(),
      date: values.date.format('YYYY-MM-DD'),
      habit: values.habit || '',
      completed: values.completed === 1 || values.completed === true ? 1 : 0,
      durationMin: values.durationMin != null && values.durationMin !== '' ? Number(values.durationMin) : undefined,
      note: values.note || '',
    }
    addRecord(rec)
    form.resetFields()
    msg.success('已保存打卡')
    if (cloudOn) feishuSync.pushHabit([rec as any]).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
  }
  const onDelete = (r: HabitRecord) => {
    deleteRecord(r.id)
    if (cloudOn) feishuSync.deleteHabit([r.id]).catch((e) => msg.warning('飞书删除失败：' + e.message))
  }
  const onEdit = (r: HabitRecord) => {
    form.setFieldsValue({
      date: dayjs(r.date),
      habit: r.habit || '',
      completed: r.completed ?? 1,
      durationMin: r.durationMin != null ? r.durationMin : undefined,
      note: r.note || '',
    })
    setEditingId(r.id)
  }
  const onUpdate = (values: any) => {
    if (!editingId) return
    const patch = {
      date: values.date.format('YYYY-MM-DD'),
      habit: values.habit || '',
      completed: values.completed === 1 || values.completed === true ? 1 : 0,
      durationMin: values.durationMin != null && values.durationMin !== '' ? Number(values.durationMin) : undefined,
      note: values.note || '',
    }
    updateRecord(editingId, patch)
    const updated = { id: editingId, ...patch }
    msg.success('已更新打卡')
    if (cloudOn) feishuSync.pushHabit([updated as any]).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
    resetForm()
  }

  const columns: ColumnsType<HabitRecord> = [
    { title: '日期', dataIndex: 'date', width: 100 },
    { title: '习惯', dataIndex: 'habit', width: 110, ellipsis: true, render: (v: string) => <Tag color="cyan">{v || '未命名'}</Tag> },
    { title: '是否完成', width: 88, render: (_, r) => <Tag color={doneColor(r.completed)}>{r.completed === 1 ? '完成' : r.completed === 0 ? '未完成' : '-'}</Tag> },
    { title: '时长', width: 72, render: (_, r) => (r.durationMin != null ? `${r.durationMin}′` : '-') },
    { title: '备注', dataIndex: 'note', ellipsis: true, render: (v: string) => v || '-' },
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
        <h2 style={{ margin: 0 }}>时间管理与习惯养成</h2>
        <div style={{ color: '#64748B', fontSize: 13 }}>
          记录每日习惯打卡（是否完成/时长），看坚持度与节律。仅观察趋势，绝不做「自律差/习惯不好」等评判。
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
                  <Card size="small" title={isEditing ? '编辑该打卡' : '打卡一条习惯'} extra={isEditing ? <Button size="small" onClick={resetForm}>取消编辑</Button> : null} style={isEditing ? { borderColor: '#0EA5A4' } : undefined}>
                    <Form form={form} layout="vertical" onFinish={isEditing ? onUpdate : onAdd} initialValues={{ completed: 1 }}>
                      <Form.Item name="date" label="日期" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
                      <Form.Item name="habit" label="习惯名" rules={[{ required: true }]}><Input placeholder="如 晨读 / 运动 / 错题复盘" /></Form.Item>
                      <Form.Item name="completed" label="是否完成"><Select options={[{ label: '完成', value: 1 }, { label: '未完成', value: 0 }]} /></Form.Item>
                      <Form.Item name="durationMin" label="时长（分钟）"><InputNumber min={0} max={600} style={{ width: '100%' }} placeholder="如 15" /></Form.Item>
                      <Form.Item name="note" label="备注（可选）"><Input placeholder="如 作业多跳了" /></Form.Item>
                      <Button type="primary" htmlType="submit" block>{isEditing ? '更新记录' : '保存'}</Button>
                    </Form>
                  </Card>
                </Col>
                <Col xs={24} md={16}>
                  <Card size="small" title={`已录打卡（${records.length} 条）`}
                    extra={records.length ? <Button size="small" danger onClick={() => { clearRecords(); msg.success('已清空') }}>清空</Button> : null}
                  >
                    {records.length ? (
                      <Table rowKey="id" size="small" columns={columns} dataSource={records.slice().sort((a, b) => b.date.localeCompare(a.date))} pagination={false} scroll={{ x: 'max-content', y: 320 }} rowClassName={(r) => (r.id === editingId ? 'row-editing' : '')} />
                    ) : <Empty description="还没有打卡，先在左侧录入" />}
                  </Card>
                </Col>
              </Row>
            )
          },
          {
            key: 'trend',
            label: '坚持趋势',
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                <Alert type="info" showIcon message="本模块仅记录每日习惯打卡（是否完成/时长），用于看坚持度与节律；打卡中断不批评，仅观察趋势，绝不做任何「自律差/习惯不好」的评判。" />
                {sorted.length ? (
                  <>
                    <Card size="small" title="每日完成率趋势（%）">
                      <ReactEChartsCore echarts={echarts} option={completionOption} style={{ height: 260 }} notMerge lazyUpdate />
                    </Card>
                    <Card size="small" title="各习惯坚持率（累计完成 / 总记录）">
                      <ReactEChartsCore echarts={echarts} option={habitBarOption} style={{ height: Math.max(200, habitStats.length * 36) }} notMerge lazyUpdate />
                    </Card>
                    <Card size="small" title="习惯坚持度明细">
                      <Row gutter={[12, 12]}>
                        {habitStats.map((h) => (
                          <Col xs={24} sm={12} md={8} key={h.name}>
                            <Card size="small">
                              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{h.name}</div>
                              <Progress percent={h.rate} size="small" strokeColor={h.rate >= 70 ? '#0EA5A4' : h.rate >= 40 ? '#6366F1' : '#F59E0B'} />
                              <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>完成 {h.done}/{h.total} · 最近 {h.lastDate || '-'}</div>
                            </Card>
                          </Col>
                        ))}
                      </Row>
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
                    <div style={{ color: '#64748B', fontSize: 12 }}>累计打卡</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: '#0F766E' }}>{total}</div>
                  </Card></Col>
                  <Col xs={12} sm={8} md={6} lg={4}><Card size="small">
                    <div style={{ color: '#64748B', fontSize: 12 }}>完成率</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: doneColor(rate && rate >= 70 ? 1 : rate && rate >= 40 ? undefined : 0) }}>{rate != null ? `${rate}%` : '-'}</div>
                  </Card></Col>
                  <Col xs={12} sm={8} md={6} lg={4}><Card size="small">
                    <div style={{ color: '#64748B', fontSize: 12 }}>习惯数</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: '#6366F1' }}>{habitNames.size}</div>
                  </Card></Col>
                  <Col xs={24} sm={8} md={12} lg={12}><Card size="small" title="最近连续打卡天数">
                    <div style={{ fontSize: 22, fontWeight: 600, color: streak ? '#0EA5A4' : '#94A3B8' }}>{streak}</div>
                    <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>从最近一条往前数（完成=1）；中断即归零，属正常观察</div>
                  </Card></Col>
                </Row>

                {alerts.length > 0 ? (
                  <Alert type="warning" showIcon message="观察提示" description={<ul style={{ margin: 0, paddingLeft: 18 }}>{alerts.map((a, i) => <li key={i}>{a}</li>)}</ul>} />
                ) : (
                  <Alert type="success" showIcon message="当前记录未见明显异常参考项" />
                )}
                <Divider />
                <div style={{ color: '#94A3B8', fontSize: 12 }}>
                  注：本模块只做习惯打卡记录与坚持度观察，不评价「自律/习惯好坏」，更不做任何诊断；中断很常见，从最小一步重新开始即可。
                </div>
              </Space>
            )
          }
        ]}
      />
    </div>
  )
}
