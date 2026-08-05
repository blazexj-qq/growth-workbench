import { useMemo, useState, useEffect } from 'react'
import {
  Card, Tabs, Form, Input, DatePicker, Button, Table, Tag,
  Empty, Row, Col, Space, App, Divider, Switch, Alert, Select
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import ReactECharts from 'echarts-for-react'
import {
  useHomeSchoolStore, HS_CHANNELS, HS_TYPES,
  type HomeSchoolRecord
} from '../store/useHomeSchoolStore'
import { feishuSync, useCloudOn } from '../store/feishuSync'

const { TextArea } = Input

function newId() {
  return 'hs_' + Math.random().toString(36).slice(2, 9)
}

export default function THomeSchoolManager() {
  const { records, addRecord, deleteRecord, clearRecords, syncFromCloud } = useHomeSchoolStore()
  const { message: msg } = App.useApp()

  // 云同步：全站共享配置，hook 响应式获取
  const cloudOn = useCloudOn()
  useEffect(() => { if (cloudOn) syncFromCloud() /* eslint-disable-next-line */ }, [cloudOn])
  const [form] = Form.useForm()

  // 类型分布
  const typeCounts = useMemo(() => {
    const m: Record<string, number> = {}
    HS_TYPES.forEach((t) => (m[t] = 0))
    records.forEach((r) => { if (r.type && m[r.type] != null) m[r.type]++ })
    return m
  }, [records])
  const typeOption = useMemo(() => ({
    grid: { left: 40, right: 16, top: 36, bottom: 28 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: HS_TYPES, axisLabel: { fontSize: 10, interval: 0 } },
    yAxis: { type: 'value', name: '条数', minInterval: 1, axisLabel: { fontSize: 10 } },
    series: [{ name: '条数', type: 'bar', data: HS_TYPES.map((t) => typeCounts[t]), itemStyle: { color: '#6366F1' } }],
  }), [typeCounts])

  const onAdd = (values: any) => {
    const rec: HomeSchoolRecord = {
      id: newId(),
      date: values.date.format('YYYY-MM-DD'),
      channel: values.channel || '班级通知',
      from: values.from || '',
      content: values.content || '',
      type: values.type || '通知',
      note: values.note || '',
    }
    addRecord(rec)
    form.resetFields()
    msg.success('已保存家校记录')
    if (cloudOn) feishuSync.pushHomeSchool([rec as any]).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
  }
  const onDelete = (r: HomeSchoolRecord) => {
    deleteRecord(r.id)
    if (cloudOn) feishuSync.deleteHomeSchool([r.id]).catch((e) => msg.warning('飞书删除失败：' + e.message))
  }

  const columns: ColumnsType<HomeSchoolRecord> = [
    { title: '日期', dataIndex: 'date', width: 100 },
    { title: '渠道', dataIndex: 'channel', width: 84, render: (v: string) => <Tag>{v || '-'}</Tag> },
    { title: '来源', dataIndex: 'from', width: 90, ellipsis: true, render: (v: string) => v || '-' },
    { title: '内容摘要', dataIndex: 'content', ellipsis: true, render: (v: string) => v || '-' },
    { title: '类型', dataIndex: 'type', width: 76, render: (v: string) => <Tag color="cyan">{v || '-'}</Tag> },
    { title: '备注', dataIndex: 'note', ellipsis: true, render: (v: string) => v || '-' },
    { title: '操作', width: 70, render: (_, r) => <Button type="link" danger size="small" onClick={() => onDelete(r)}>删除</Button> },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>家校沟通台账</h2>
        <div style={{ color: '#64748B', fontSize: 13 }}>
          记录老师通知、作业量、表扬与提醒，补全学校信息源、看沟通密度。本地优先存储，开启云同步后写入飞书。
        </div>
      </div>

            <Tabs items={[
        {
          key: 'input', label: '录入与记录',
          children: (
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Card size="small" title="录入一条家校信息">
                  <Form form={form} layout="vertical" onFinish={onAdd}>
                    <Form.Item name="date" label="日期" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="channel" label="渠道" initialValue="班级通知"><Select options={HS_CHANNELS.map((c) => ({ label: c, value: c }))} /></Form.Item>
                    <Form.Item name="from" label="来源"><Input placeholder="老师姓名/学科" /></Form.Item>
                    <Form.Item name="content" label="内容摘要"><TextArea rows={2} placeholder="如 下周三春游需签同意书" /></Form.Item>
                    <Form.Item name="type" label="类型" initialValue="通知"><Select options={HS_TYPES.map((t) => ({ label: t, value: t }))} /></Form.Item>
                    <Form.Item name="note" label="备注（可选）"><Input placeholder="如 已回复" /></Form.Item>
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
          key: 'trend', label: '类型分布',
          children: (
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <Alert type="info" showIcon message="本模块仅记录家校沟通客观信息，不评价老师或学校；内容仅供家长回看与跟进。" />
              {records.length ? (
                <Card size="small" title="家校信息类型分布"><ReactECharts option={typeOption} style={{ height: 280 }} notMerge lazyUpdate /></Card>
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
                  <div style={{ color: '#64748B', fontSize: 12 }}>累计记录</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: '#0F766E' }}>{records.length}</div>
                </Card></Col>
                <Col xs={12} sm={8} md={6} lg={4}><Card size="small">
                  <div style={{ color: '#64748B', fontSize: 12 }}>提醒类</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: '#F59E0B' }}>{typeCounts['提醒']}</div>
                </Card></Col>
                <Col xs={12} sm={8} md={6} lg={4}><Card size="small">
                  <div style={{ color: '#64748B', fontSize: 12 }}>问题类</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: '#EF4444' }}>{typeCounts['问题']}</div>
                </Card></Col>
                <Col xs={24} sm={8} md={12} lg={12}><Card size="small" title="说明">
                  <div style={{ color: '#94A3B8', fontSize: 12 }}>记录越多，越能看清学校节奏与孩子在校状态；提醒/问题类重点关注跟进。</div>
                </Card></Col>
              </Row>
              <Divider />
              <div style={{ color: '#94A3B8', fontSize: 12 }}>注：本模块只做家校信息留痕，不评判老师或学校；AI 结构化摘要为后续便利性规划，非结论。</div>
            </Space>
          )
        }
      ]} />
    </div>
  )
}
