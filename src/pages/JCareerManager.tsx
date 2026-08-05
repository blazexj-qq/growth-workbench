import { useMemo, useState, useEffect } from 'react'
import {
  Card, Tabs, Form, Input, DatePicker, Button, Table, Tag,
  Empty, Row, Col, Space, App, Divider, Switch, Alert, Select
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import ReactECharts from 'echarts-for-react'
import {
  useCareerStore, CAREER_DOMAINS, CAREER_SOURCES, CAREER_STATUS,
  type CareerRecord
} from '../store/useCareerStore'
import { feishuSync, useCloudOn } from '../store/feishuSync'

const { TextArea } = Input

function newId() {
  return 'ca_' + Math.random().toString(36).slice(2, 9)
}

export default function JCareerManager() {
  const { records, addRecord, deleteRecord, clearRecords, syncFromCloud } = useCareerStore()
  const { message: msg } = App.useApp()

  // 云同步：全站共享配置，hook 响应式获取
  const cloudOn = useCloudOn()
  useEffect(() => { if (cloudOn) syncFromCloud() /* eslint-disable-next-line */ }, [cloudOn])
  const [form] = Form.useForm()

  // 领域分布
  const domainCounts = useMemo(() => {
    const m: Record<string, number> = {}
    CAREER_DOMAINS.forEach((d) => (m[d] = 0))
    records.forEach((r) => { if (r.domain && m[r.domain] != null) m[r.domain]++ })
    return m
  }, [records])
  const domainOption = useMemo(() => ({
    grid: { left: 40, right: 16, top: 36, bottom: 28 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: CAREER_DOMAINS, axisLabel: { fontSize: 10, interval: 0, rotate: 20 } },
    yAxis: { type: 'value', name: '个', minInterval: 1, axisLabel: { fontSize: 10 } },
    series: [{ name: '个', type: 'bar', data: CAREER_DOMAINS.map((d) => domainCounts[d]), itemStyle: { color: '#0EA5A4' } }],
  }), [domainCounts])

  // 状态分布
  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {}
    CAREER_STATUS.forEach((s) => (m[s] = 0))
    records.forEach((r) => { if (r.status && m[r.status] != null) m[r.status]++ })
    return m
  }, [records])
  const statusOption = useMemo(() => ({
    grid: { left: 40, right: 16, top: 36, bottom: 28 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: CAREER_STATUS, axisLabel: { fontSize: 10, interval: 0 } },
    yAxis: { type: 'value', name: '个', minInterval: 1, axisLabel: { fontSize: 10 } },
    series: [{ name: '个', type: 'bar', data: CAREER_STATUS.map((s) => statusCounts[s]), itemStyle: { color: '#6366F1' } }],
  }), [statusCounts])

  const onAdd = (values: any) => {
    const rec: CareerRecord = {
      id: newId(),
      date: values.date.format('YYYY-MM-DD'),
      title: values.title || '',
      domain: values.domain || '其他',
      source: values.source || '其他',
      thought: values.thought || '',
      status: values.status || '萌芽',
      note: values.note || '',
    }
    addRecord(rec)
    form.resetFields()
    msg.success('已保存生涯探索记录')
    if (cloudOn) feishuSync.pushCareer([rec as any]).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
  }
  const onDelete = (r: CareerRecord) => {
    deleteRecord(r.id)
    if (cloudOn) feishuSync.deleteCareer([r.id]).catch((e) => msg.warning('飞书删除失败：' + e.message))
  }

  const columns: ColumnsType<CareerRecord> = [
    { title: '日期', dataIndex: 'date', width: 100 },
    { title: '主题方向', dataIndex: 'title', width: 120, ellipsis: true, render: (v: string) => v || '-' },
    { title: '领域', dataIndex: 'domain', width: 92, render: (v: string) => <Tag color="cyan">{v || '-'}</Tag> },
    { title: '来源', dataIndex: 'source', width: 84, render: (v: string) => v || '-' },
    { title: '想法', dataIndex: 'thought', ellipsis: true, render: (v: string) => v || '-' },
    { title: '状态', dataIndex: 'status', width: 80, render: (v: string) => <Tag color="gold">{v || '-'}</Tag> },
    { title: '操作', width: 70, render: (_, r) => <Button type="link" danger size="small" onClick={() => onDelete(r)}>删除</Button> },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>生涯启蒙与职业探索</h2>
        <div style={{ color: '#64748B', fontSize: 13 }}>
          记录孩子的兴趣萌芽与职业好奇，从四年级开始种下方向感。规划只到高考为止，就业重活延后。本地优先存储，开启云同步后写入飞书。
        </div>
      </div>

            <Alert type="info" showIcon style={{ marginBottom: 16 }}
        message="本模块只记录兴趣萌芽，不做任何职业适配或能力定论；所有汇总均为『兴趣记录、非结论』，仅作方向感参考。" />

      <Tabs items={[
        {
          key: 'input', label: '录入与记录',
          children: (
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Card size="small" title="录入一条兴趣/方向">
                  <Form form={form} layout="vertical" onFinish={onAdd}>
                    <Form.Item name="date" label="日期" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="title" label="主题/方向" rules={[{ required: true }]}><Input placeholder="如 想当医生" /></Form.Item>
                    <Form.Item name="domain" label="方向领域" initialValue="其他"><Select options={CAREER_DOMAINS.map((d) => ({ label: d, value: d }))} /></Form.Item>
                    <Form.Item name="source" label="触发来源" initialValue="其他"><Select options={CAREER_SOURCES.map((s) => ({ label: s, value: s }))} /></Form.Item>
                    <Form.Item name="thought" label="想法/描述"><TextArea rows={2} placeholder="孩子怎么说的、为什么好奇" /></Form.Item>
                    <Form.Item name="status" label="状态" initialValue="萌芽"><Select options={CAREER_STATUS.map((s) => ({ label: s, value: s }))} /></Form.Item>
                    <Form.Item name="note" label="备注（可选）"><Input placeholder="如 已读相关绘本" /></Form.Item>
                    <Button type="primary" htmlType="submit" block>保存</Button>
                  </Form>
                </Card>
              </Col>
              <Col xs={24} md={16}>
                <Card size="small" title={`已录记录（${records.length} 条）`}
                  extra={records.length ? <Button size="small" danger onClick={() => { clearRecords(); msg.success('已清空') }}>清空</Button> : null}>
                  {records.length ? (
                    <Table rowKey="id" size="small" columns={columns} dataSource={records.slice().sort((a, b) => b.date.localeCompare(a.date))} pagination={false} scroll={{ x: 'max-content', y: 320 }} />
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
                <>
                  <Card size="small" title="兴趣方向领域分布"><ReactECharts option={domainOption} style={{ height: 280 }} notMerge lazyUpdate /></Card>
                  <Card size="small" title="探索状态分布"><ReactECharts option={statusOption} style={{ height: 280 }} notMerge lazyUpdate /></Card>
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
                  <div style={{ color: '#64748B', fontSize: 12 }}>累计探索</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: '#0F766E' }}>{records.length}</div>
                </Card></Col>
                <Col xs={12} sm={8} md={6} lg={4}><Card size="small">
                  <div style={{ color: '#64748B', fontSize: 12 }}>持续关注</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: '#0EA5A4' }}>{statusCounts['持续关注']}</div>
                </Card></Col>
                <Col xs={12} sm={8} md={6} lg={4}><Card size="small">
                  <div style={{ color: '#64748B', fontSize: 12 }}>感兴趣</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: '#6366F1' }}>{statusCounts['感兴趣']}</div>
                </Card></Col>
                <Col xs={24} sm={8} md={12} lg={12}><Card size="small" title="说明">
                  <div style={{ color: '#94A3B8', fontSize: 12 }}>记录越丰富，越能看清孩子长期兴趣脉络；这里只是「种下方向感」，不是职业定论，规划只到高考为止。</div>
                </Card></Col>
              </Row>
              <Divider />
              <div style={{ color: '#94A3B8', fontSize: 12 }}>注：本模块所有内容均为兴趣记录、非结论；不做诊断、不贴职业标签、不制造焦虑。</div>
            </Space>
          )
        }
      ]} />
    </div>
  )
}
