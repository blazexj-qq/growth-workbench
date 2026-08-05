import { useMemo, useState, useEffect } from 'react'
import {
  Card, Tabs, Form, Input, DatePicker, Button, Table, Tag, Tooltip,
  Empty, Row, Col, Space, App, Divider, Switch, Alert, Progress, Select
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import ReactECharts from 'echarts-for-react'
import {
  useComprehensiveStore, WUYU_CATS, WUYU_STATUS, SUBJECTS,
  type ComprehensiveRecord
} from '../store/useComprehensiveStore'
import { feishuSync, useCloudOn } from '../store/feishuSync'

const { TextArea } = Input

function newId() {
  return 'wy_' + Math.random().toString(36).slice(2, 9)
}

export default function KComprehensiveManager() {
  const { records, addRecord, deleteRecord, clearRecords, syncFromCloud } = useComprehensiveStore()
  const { message: msg } = App.useApp()

  // 云同步：全站共享配置，hook 响应式获取
  const cloudOn = useCloudOn()
  useEffect(() => { if (cloudOn) syncFromCloud() /* eslint-disable-next-line */ }, [cloudOn])
  const [form] = Form.useForm()

  // 各类别计数
  const catCounts = useMemo(() => {
    const m: Record<string, number> = {}
    WUYU_CATS.forEach((c) => (m[c] = 0))
    records.forEach((r) => { if (r.category && m[r.category] != null) m[r.category]++ })
    return m
  }, [records])

  // 各学科计数（按 9 门 + 其他）
  const subjectCounts = useMemo(() => {
    const m: Record<string, number> = {}
    SUBJECTS.forEach((s) => (m[s] = 0))
    records.forEach((r) => { if (r.subject && m[r.subject] != null) m[r.subject]++ })
    return m
  }, [records])

  // 大厂审美：细柱 + 顶部圆角 + 字号 12 + 浅灰虚线网格 + 数据标签 + 远距 tooltip
  const catOption = useMemo(() => ({
    grid: { left: 48, right: 24, top: 36, bottom: 36, containLabel: true },
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(15,23,42,0.92)', borderWidth: 0,
      textStyle: { color: '#fff', fontSize: 12 },
      extraCssText: 'box-shadow: 0 6px 18px rgba(0,0,0,0.18); border-radius: 6px;',
      formatter: (params: any[]) => {
        const p = params[0]
        return `<div style="padding:2px 4px"><div style="font-size:11px;opacity:.7;margin-bottom:2px">${p.name}育</div><div style="font-size:13px;font-weight:600">${p.seriesName} ${p.value ?? 0}</div></div>`
      },
    },
    xAxis: {
      type: 'category', data: WUYU_CATS,
      axisLine: { lineStyle: { color: '#CBD5E1' } },
      axisTick: { show: false },
      axisLabel: { fontSize: 13, color: '#475569', fontWeight: 500 },
    },
    yAxis: {
      type: 'value', name: '材料数', minInterval: 1, nameTextStyle: { fontSize: 12, color: '#64748B' },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 12, color: '#475569' },
      splitLine: { lineStyle: { color: '#E2E8F0', type: 'dashed' } },
    },
    series: [{
      name: '材料数', type: 'bar',
      data: WUYU_CATS.map((c) => catCounts[c]),
      barWidth: 22, barGap: '60%',
      itemStyle: { color: '#0EA5A4', borderRadius: [6, 6, 0, 0] },
      label: { show: true, position: 'top', fontSize: 12, color: '#0F766E', fontWeight: 600 },
    }],
  }), [catCounts])

  const subjectOption = useMemo(() => ({
    grid: { left: 56, right: 24, top: 36, bottom: 48, containLabel: true },
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(15,23,42,0.92)', borderWidth: 0,
      textStyle: { color: '#fff', fontSize: 12 },
      extraCssText: 'box-shadow: 0 6px 18px rgba(0,0,0,0.18); border-radius: 6px;',
      formatter: (params: any[]) => {
        const p = params[0]
        return `<div style="padding:2px 4px"><div style="font-size:11px;opacity:.7;margin-bottom:2px">${p.name}</div><div style="font-size:13px;font-weight:600">${p.seriesName} ${p.value ?? 0}</div></div>`
      },
    },
    xAxis: {
      type: 'category', data: SUBJECTS,
      axisLine: { lineStyle: { color: '#CBD5E1' } },
      axisTick: { show: false },
      axisLabel: { fontSize: 12, color: '#475569', rotate: 30 },
    },
    yAxis: {
      type: 'value', name: '材料数', minInterval: 1, nameTextStyle: { fontSize: 12, color: '#64748B' },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 12, color: '#475569' },
      splitLine: { lineStyle: { color: '#E2E8F0', type: 'dashed' } },
    },
    series: [{
      name: '材料数', type: 'bar',
      data: SUBJECTS.map((s) => subjectCounts[s]),
      barWidth: 20, barGap: '50%',
      itemStyle: { color: '#6366F1', borderRadius: [6, 6, 0, 0] },
      label: { show: true, position: 'top', fontSize: 12, color: '#4338CA', fontWeight: 600 },
    }],
  }), [subjectCounts])

  const onAdd = (values: any) => {
    const rec: ComprehensiveRecord = {
      id: newId(),
      date: values.date.format('YYYY-MM-DD'),
      category: values.category || '智',
      subject: values.subject || '其他',
      item: values.item || '',
      evidence: values.evidence || '',
      status: values.status || '进行中',
      note: values.note || '',
    }
    addRecord(rec)
    form.resetFields()
    msg.success('已保存综评材料')
    if (cloudOn) feishuSync.pushComprehensive([rec as any]).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
  }
  const onDelete = (r: ComprehensiveRecord) => {
    deleteRecord(r.id)
    if (cloudOn) feishuSync.deleteComprehensive([r.id]).catch((e) => msg.warning('飞书删除失败：' + e.message))
  }

  const longTextCell = (v?: string, maxW = 360) => v ? (
    <Tooltip placement="topLeft" title={v} overlayInnerStyle={{ maxWidth: maxW }}>
      <span style={{ display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'bottom' }}>{v}</span>
    </Tooltip>
  ) : <span style={{ color: '#94A3B8' }}>-</span>

  const columns: ColumnsType<ComprehensiveRecord> = [
    { title: '日期', dataIndex: 'date', width: 104 },
    { title: '类别', dataIndex: 'category', width: 68, render: (v: string) => <Tag color="blue">{v || '-'}</Tag> },
    { title: '学科', dataIndex: 'subject', width: 96, render: (v: string) => v && v !== '其他' ? <Tag color="geekblue">{v}</Tag> : <span style={{ color: '#94A3B8' }}>通用</span> },
    { title: '项目', dataIndex: 'item', width: 200, render: (v?: string) => longTextCell(v) },
    { title: '佐证材料', dataIndex: 'evidence', width: 220, render: (v?: string) => longTextCell(v) },
    { title: '状态', dataIndex: 'status', width: 88, render: (v: string) => <Tag>{v || '-'}</Tag> },
    { title: '备注', dataIndex: 'note', width: 160, render: (v?: string) => longTextCell(v, 320) },
    { title: '操作', width: 72, render: (_, r) => <Button type="link" danger size="small" onClick={() => onDelete(r)}>删除</Button> },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>五育综评对齐</h2>
        <div style={{ color: '#64748B', fontSize: 13 }}>
          归集德/智/体/美/劳活动与佐证材料，对照综评口径查缺补漏。本地优先存储，开启云同步后写入飞书。
        </div>
      </div>

            <Tabs items={[
        {
          key: 'input', label: '录入与记录',
          children: (
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Card size="small" title="录入一条五育材料">
                  <Form form={form} layout="vertical" onFinish={onAdd}>
                    <Form.Item name="date" label="日期" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="category" label="类别（五育）" initialValue="智"><Select options={WUYU_CATS.map((c) => ({ label: `${c}育`, value: c }))} /></Form.Item>
                    <Form.Item name="subject" label="学科（如适用）" initialValue="其他"
                      extra={<span style={{ fontSize: 12, color: '#64748B' }}>小初高全学科：语数外 / 科学·道德与法治 / 物化生·史地政 / 体音美·信息技术·劳动</span>}>
                      <Select options={SUBJECTS.map((s) => ({ label: s, value: s }))} />
                    </Form.Item>
                    <Form.Item name="item" label="项目名"><Input placeholder="如 校运动会 800m / 数学建模小组第 3 次活动" /></Form.Item>
                    <Form.Item name="evidence" label="佐证材料"><TextArea rows={2} placeholder="如 完赛证书照片 / 社团签到" /></Form.Item>
                    <Form.Item name="status" label="状态" initialValue="进行中"><Select options={WUYU_STATUS.map((s) => ({ label: s, value: s }))} /></Form.Item>
                    <Form.Item name="note" label="备注（可选）"><Input placeholder="如 待补照片" /></Form.Item>
                    <Button type="primary" htmlType="submit" block>保存</Button>
                  </Form>
                </Card>
              </Col>
              <Col xs={24} md={16}>
                <Card size="small" title={`已录材料（${records.length} 条）`}
                  extra={records.length ? <Button size="small" danger onClick={() => { clearRecords(); msg.success('已清空') }}>清空</Button> : null}>
                  {records.length ? (
                    <Table rowKey="id" size="small" columns={columns} dataSource={records.slice().sort((a, b) => b.date.localeCompare(a.date))} pagination={false} scroll={{ x: 1080, y: 320 }} />
                  ) : <Empty description="还没有记录，先在左侧录入" />}
                </Card>
              </Col>
            </Row>
          )
        },
        {
          key: 'trend', label: '类别分布',
          children: (
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <Alert type="info" showIcon message="本模块仅归集五育活动与材料用于查缺补漏，不做「综合素质差/某项不达标」等结论；材料靠拢综评口径即可。" />
              {records.length ? (
                <>
                  <Card size="small" title="五育材料数量分布"><ReactECharts option={catOption} style={{ height: 280 }} notMerge lazyUpdate /></Card>
                  <Card size="small" title="高考 9 学科材料分布（江苏“3+1+2”）">
                    <ReactECharts option={subjectOption} style={{ height: 280 }} notMerge lazyUpdate />
                  </Card>
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
                {WUYU_CATS.map((c, i) => (
                  <Col xs={8} sm={8} md={4} lg={4} key={c}>
                    <Card size="small">
                      <div style={{ color: '#64748B', fontSize: 12 }}>{c}育</div>
                      <div style={{ fontSize: 22, fontWeight: 600, color: ['#0EA5A4', '#6366F1', '#F59E0B', '#EC4899', '#10B981'][i] }}>{catCounts[c]}</div>
                    </Card>
                  </Col>
                ))}
                <Col xs={24} sm={24} md={24} lg={24}>
                  <Card size="small" title="累计材料数"><div style={{ fontSize: 22, fontWeight: 600, color: '#0F766E' }}>{records.length}</div>
                    <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>五育尽量均衡归集，缺哪类就多留意补材料；高考 9 科分布可看图中第二张。</div></Card>
                </Col>
              </Row>
              <Divider />
              <div style={{ color: '#94A3B8', fontSize: 12 }}>注：本模块只做材料归集与五育分布观察，不评判"素质高低"；综评导出与缺口提示为后续规划。</div>
            </Space>
          )
        }
      ]} />
    </div>
  )
}
