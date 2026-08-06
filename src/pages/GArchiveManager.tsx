import { useMemo, useState, useEffect } from 'react'
import {
  Card, Tabs, Form, Input, DatePicker, Button, Table, Tag,
  Empty, Row, Col, Space, App, Divider, Switch, Alert, Select
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import echarts from '../lib/echarts'
import {
  useArchiveStore, ARCHIVE_CATS,
  type ArchiveRecord
} from '../store/useArchiveStore'
import { feishuSync, useCloudOn } from '../store/feishuSync'
import dayjs from 'dayjs'

const { TextArea } = Input

function newId() {
  return 'ga_' + Math.random().toString(36).slice(2, 9)
}

export default function GArchiveManager() {
  const { records, addRecord, deleteRecord, updateRecord, clearRecords, syncFromCloud } = useArchiveStore()
  const { message: msg } = App.useApp()

  // 云同步：全站共享配置，hook 响应式获取
  const cloudOn = useCloudOn()
  useEffect(() => { if (cloudOn) syncFromCloud() /* eslint-disable-next-line */ }, [cloudOn])
  const [form] = Form.useForm()
  // 编辑状态
  const [editingId, setEditingId] = useState<string | null>(null)
  const isEditing = !!editingId
  const resetForm = () => { form.resetFields(); setEditingId(null) }

  const catCounts = useMemo(() => {
    const m: Record<string, number> = {}
    ARCHIVE_CATS.forEach((d) => (m[d] = 0))
    records.forEach((r) => { if (r.category && m[r.category] != null) m[r.category]++ })
    return m
  }, [records])
  const catOption = useMemo(() => ({
    grid: { left: 40, right: 16, top: 36, bottom: 28 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ARCHIVE_CATS, axisLabel: { fontSize: 10, interval: 0, rotate: 20 } },
    yAxis: { type: 'value', name: '个', minInterval: 1, axisLabel: { fontSize: 10 } },
    series: [{ name: '个', type: 'bar', data: ARCHIVE_CATS.map((d) => catCounts[d]), itemStyle: { color: '#0EA5A4' } }],
  }), [catCounts])

  const onAdd = (values: any) => {
    const rec: ArchiveRecord = {
      id: newId(),
      date: values.date.format('YYYY-MM-DD'),
      title: values.title || '',
      category: values.category || '其他',
      description: values.description || '',
      evidence: values.evidence || '',
      note: values.note || '',
    }
    addRecord(rec)
    form.resetFields()
    msg.success('已存入成长档案')
    if (cloudOn) feishuSync.pushArchive([rec as any]).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
  }
  const onDelete = (r: ArchiveRecord) => {
    deleteRecord(r.id)
    if (cloudOn) feishuSync.deleteArchive([r.id]).catch((e) => msg.warning('飞书删除失败：' + e.message))
  }
  const onEdit = (r: ArchiveRecord) => {
    setEditingId(r.id)
    form.setFieldsValue({
      date: dayjs(r.date),
      title: r.title,
      category: r.category,
      description: r.description,
      evidence: r.evidence,
      note: r.note,
    })
    msg.info('已载入该档案，修改后点「更新」即可')
  }
  const onUpdate = (values: any) => {
    if (!editingId) return
    const patch = {
      date: values.date.format('YYYY-MM-DD'),
      title: values.title || '',
      category: values.category || '其他',
      description: values.description || '',
      evidence: values.evidence || '',
      note: values.note || '',
    }
    updateRecord(editingId, patch)
    msg.success('已更新成长档案')
    setEditingId(null)
    form.resetFields()
    if (cloudOn) {
      const full = useArchiveStore.getState().records.find((r) => r.id === editingId)
      if (full) feishuSync.pushArchive([full as any]).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
    }
  }

  const columns: ColumnsType<ArchiveRecord> = [
    { title: '日期', dataIndex: 'date', width: 100 },
    { title: '标题', dataIndex: 'title', width: 160, ellipsis: true, render: (v: string) => v || '-' },
    { title: '类别', dataIndex: 'category', width: 100, render: (v: string) => <Tag color="cyan">{v || '-'}</Tag> },
    { title: '描述', dataIndex: 'description', ellipsis: true, render: (v: string) => v || '-' },
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
        <h2 style={{ margin: 0 }}>成长档案管理</h2>
        <div style={{ color: '#64748B', fontSize: 13 }}>
          一人一档，贯通小学到高考的可信存证。里程碑、奖项、重要决定、作品都归档，关键时刻随手可查。本地优先存储，开启云同步后写入飞书。
        </div>
      </div>

            <Alert type="info" showIcon style={{ marginBottom: 16 }}
        message="本模块是「成长存证」，只记录发生过的事实，不做评价、不打分、不排名。" />

      <Tabs items={[
        {
          key: 'input', label: '录入与记录',
          children: (
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Card size="small" title={isEditing ? '编辑该档案' : '归档一条成长事件'} extra={isEditing ? <Button size="small" onClick={resetForm}>取消编辑</Button> : null} style={isEditing ? { borderColor: '#0EA5A4' } : undefined}>
                  <Form form={form} layout="vertical" onFinish={isEditing ? onUpdate : onAdd}>
                    <Form.Item name="date" label="日期" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input placeholder="如 校科技节三等奖" /></Form.Item>
                    <Form.Item name="category" label="类别" initialValue="其他"><Select options={ARCHIVE_CATS.map((d) => ({ label: d, value: d }))} /></Form.Item>
                    <Form.Item name="description" label="描述"><TextArea rows={2} placeholder="发生了什么" /></Form.Item>
                    <Form.Item name="evidence" label="佐证材料"><Input placeholder="证书照片链接/说明（可选）" /></Form.Item>
                    <Form.Item name="note" label="备注（可选）"><Input placeholder="如 存放位置" /></Form.Item>
                    <Button type="primary" htmlType="submit" block>{isEditing ? '更新记录' : '保存'}</Button>
                  </Form>
                </Card>
              </Col>
              <Col xs={24} md={16}>
                <Card size="small" title={`已归档（${records.length} 条）`}
                  extra={records.length ? <Button size="small" danger onClick={() => { clearRecords(); msg.success('已清空') }}>清空</Button> : null}>
                  {records.length ? (
                    <Table rowKey="id" size="small" columns={columns} dataSource={records.slice().sort((a, b) => b.date.localeCompare(a.date))} pagination={false} scroll={{ x: 'max-content', y: 320 }} rowClassName={(r) => (r.id === editingId ? 'row-editing' : '')} />
                  ) : <Empty description="还没有归档，先在左侧录入" />}
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
                <Card size="small" title="档案类别分布"><ReactEChartsCore echarts={echarts} option={catOption} style={{ height: 280 }} notMerge lazyUpdate /></Card>
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
                  <div style={{ color: '#64748B', fontSize: 12 }}>归档总数</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: '#0F766E' }}>{records.length}</div>
                </Card></Col>
                <Col xs={12} sm={8} md={6} lg={4}><Card size="small">
                  <div style={{ color: '#64748B', fontSize: 12 }}>奖项荣誉</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: '#0EA5A4' }}>{records.filter((r) => r.category === '奖项荣誉').length}</div>
                </Card></Col>
                <Col xs={12} sm={8} md={6} lg={4}><Card size="small">
                  <div style={{ color: '#64748B', fontSize: 12 }}>里程碑</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: '#6366F1' }}>{records.filter((r) => r.category === '里程碑').length}</div>
                </Card></Col>
                <Col xs={24} sm={8} md={12} lg={12}><Card size="small" title="说明">
                  <div style={{ color: '#94A3B8', fontSize: 12 }}>这份档案是给孩子未来的「成长证据链」，只记事实、不评价；导出时在 G 内做，不外传给孩子造成压力。</div>
                </Card></Col>
              </Row>
              <Divider />
              <div style={{ color: '#94A3B8', fontSize: 12 }}>注：本模块仅存证，不评分、不排名、不制造焦虑。</div>
            </Space>
          )
        }
      ]} />
    </div>
  )
}
