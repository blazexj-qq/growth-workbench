import { useMemo, useState, useEffect } from 'react'
import dayjs from 'dayjs'
import {
  Card, Tabs, Form, Input, DatePicker, Button, Table, Tag,
  Empty, Row, Col, Space, App, Divider, Switch, Alert, Select
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import echarts from '../lib/echarts'
import {
  useResourceStore, RESOURCE_CATS, RESOURCE_STATUS,
  type ResourceRecord
} from '../store/useResourceStore'
import { feishuSync, useCloudOn } from '../store/feishuSync'

const { TextArea } = Input

function newId() {
  return 'rs_' + Math.random().toString(36).slice(2, 9)
}

export default function MResourceManager() {
  const { records, addRecord, deleteRecord, updateRecord, clearRecords, syncFromCloud } = useResourceStore()
  const { message: msg } = App.useApp()

  // 云同步：全站共享配置，hook 响应式获取
  const cloudOn = useCloudOn()
  useEffect(() => { if (cloudOn) syncFromCloud() /* eslint-disable-next-line */ }, [cloudOn])
  const [form] = Form.useForm()
  const [editingId, setEditingId] = useState<string | null>(null)
  const isEditing = editingId !== null
  const resetForm = () => { setEditingId(null); form.resetFields() }

  const catCounts = useMemo(() => {
    const m: Record<string, number> = {}
    RESOURCE_CATS.forEach((d) => (m[d] = 0))
    records.forEach((r) => { if (r.category && m[r.category] != null) m[r.category]++ })
    return m
  }, [records])
  const catOption = useMemo(() => ({
    grid: { left: 40, right: 16, top: 36, bottom: 28 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: RESOURCE_CATS, axisLabel: { fontSize: 10, interval: 0, rotate: 20 } },
    yAxis: { type: 'value', name: '个', minInterval: 1, axisLabel: { fontSize: 10 } },
    series: [{ name: '个', type: 'bar', data: RESOURCE_CATS.map((d) => catCounts[d]), itemStyle: { color: '#0EA5A4' } }],
  }), [catCounts])

  const onAdd = (values: any) => {
    const rec: ResourceRecord = {
      id: newId(),
      date: values.date.format('YYYY-MM-DD'),
      name: values.name || '',
      category: values.category || '其他',
      source: values.source || '',
      status: values.status || '在用',
      note: values.note || '',
    }
    addRecord(rec)
    form.resetFields()
    msg.success('已保存家庭资源')
    if (cloudOn) feishuSync.pushResource([rec as any]).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
  }
  const onDelete = (r: ResourceRecord) => {
    deleteRecord(r.id)
    if (cloudOn) feishuSync.deleteResource([r.id]).catch((e) => msg.warning('飞书删除失败：' + e.message))
  }
  const onEdit = (r: ResourceRecord) => {
    form.setFieldsValue({
      date: dayjs(r.date),
      name: r.name || '',
      category: r.category || '其他',
      source: r.source || '',
      status: r.status || '在用',
      note: r.note || '',
    })
    setEditingId(r.id)
  }
  const onUpdate = (values: any) => {
    if (!editingId) return
    const patch = {
      date: values.date.format('YYYY-MM-DD'),
      name: values.name || '',
      category: values.category || '其他',
      source: values.source || '',
      status: values.status || '在用',
      note: values.note || '',
    }
    updateRecord(editingId, patch)
    const updated = { id: editingId, ...patch }
    msg.success('已更新资源')
    if (cloudOn) feishuSync.pushResource([updated as any]).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
    resetForm()
  }

  const columns: ColumnsType<ResourceRecord> = [
    { title: '日期', dataIndex: 'date', width: 100 },
    { title: '资源名称', dataIndex: 'name', width: 140, ellipsis: true, render: (v: string) => v || '-' },
    { title: '类别', dataIndex: 'category', width: 100, render: (v: string) => <Tag color="cyan">{v || '-'}</Tag> },
    { title: '来源', dataIndex: 'source', width: 100, render: (v: string) => v || '-' },
    { title: '状态', dataIndex: 'status', width: 84, render: (v: string) => <Tag color="gold">{v || '-'}</Tag> },
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
        <h2 style={{ margin: 0 }}>家庭资源与人脉图谱</h2>
        <div style={{ color: '#64748B', fontSize: 13 }}>
          把家里能调动的资源、榜样、人脉都记下来，支撑孩子的生涯与升学。本地优先存储，开启云同步后写入飞书。
        </div>
      </div>

            <Alert type="info" showIcon style={{ marginBottom: 16 }}
        message="本模块是家庭资源的「清单与地图」，仅做归集，不做价值评判；哪些用得上、什么时候用，由你判断。" />

      <Tabs items={[
        {
          key: 'input', label: '录入与记录',
          children: (
            <Row gutter={16}>
              <Col xs={24} md={8}>
                  <Card size="small" title={isEditing ? '编辑该资源' : '录入一项资源/人脉'} extra={isEditing ? <Button size="small" onClick={resetForm}>取消编辑</Button> : null} style={isEditing ? { borderColor: '#0EA5A4' } : undefined}>
                    <Form form={form} layout="vertical" onFinish={isEditing ? onUpdate : onAdd}>
                    <Form.Item name="date" label="日期" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="name" label="资源名称" rules={[{ required: true }]}><Input placeholder="如 数学思维训练书 / 表姐" /></Form.Item>
                    <Form.Item name="category" label="类别" initialValue="其他"><Select options={RESOURCE_CATS.map((d) => ({ label: d, value: d }))} /></Form.Item>
                    <Form.Item name="source" label="来源/渠道"><Input placeholder="如 网购/家庭/机构" /></Form.Item>
                    <Form.Item name="status" label="状态" initialValue="在用"><Select options={RESOURCE_STATUS.map((s) => ({ label: s, value: s }))} /></Form.Item>
                    <Form.Item name="note" label="备注（可选）"><Input placeholder="如 可借阅对象" /></Form.Item>
                    <Button type="primary" htmlType="submit" block>{isEditing ? '更新记录' : '保存'}</Button>
                  </Form>
                </Card>
              </Col>
              <Col xs={24} md={16}>
                <Card size="small" title={`已录资源（${records.length} 条）`}
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
          key: 'trend', label: '分布',
          children: (
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              {records.length ? (
                <Card size="small" title="资源类别分布"><ReactEChartsCore echarts={echarts} option={catOption} style={{ height: 280 }} notMerge lazyUpdate /></Card>
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
                  <div style={{ color: '#64748B', fontSize: 12 }}>资源总数</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: '#0F766E' }}>{records.length}</div>
                </Card></Col>
                <Col xs={12} sm={8} md={6} lg={4}><Card size="small">
                  <div style={{ color: '#64748B', fontSize: 12 }}>在用</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: '#0EA5A4' }}>{records.filter((r) => r.status === '在用').length}</div>
                </Card></Col>
                <Col xs={12} sm={8} md={6} lg={4}><Card size="small">
                  <div style={{ color: '#64748B', fontSize: 12 }}>待启用</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: '#6366F1' }}>{records.filter((r) => r.status === '待启用').length}</div>
                </Card></Col>
                <Col xs={24} sm={8} md={12} lg={12}><Card size="small" title="说明">
                  <div style={{ color: '#94A3B8', fontSize: 12 }}>资源越清楚，越能在关键节点（如升学、兴趣深入）快速调动；本模块只归集、不评判。</div>
                </Card></Col>
              </Row>
              <Divider />
              <div style={{ color: '#94A3B8', fontSize: 12 }}>注：本模块仅做家庭资源清单，不构成任何承诺或建议。</div>
            </Space>
          )
        }
      ]} />
    </div>
  )
}
