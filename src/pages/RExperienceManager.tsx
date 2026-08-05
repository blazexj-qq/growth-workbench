import { useMemo, useState, useEffect } from 'react'
import {
  Card, Tabs, Form, Input, DatePicker, Button, Table, Tag,
  Empty, Row, Col, Space, App, Divider, Switch, Alert, Select, InputNumber
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import ReactECharts from 'echarts-for-react'
import {
  useExperienceStore, EXP_FORMS,
  type ExperienceRecord
} from '../store/useExperienceStore'
import { feishuSync, useCloudOn } from '../store/feishuSync'

const { TextArea } = Input

function newId() {
  return 'ex_' + Math.random().toString(36).slice(2, 9)
}

export default function RExperienceManager() {
  const { records, addRecord, deleteRecord, clearRecords, syncFromCloud } = useExperienceStore()
  const { message: msg } = App.useApp()

  // 云同步：全站共享配置，hook 响应式获取
  const cloudOn = useCloudOn()
  useEffect(() => { if (cloudOn) syncFromCloud() /* eslint-disable-next-line */ }, [cloudOn])
  const [form] = Form.useForm()

  // 形式分布
  const formCounts = useMemo(() => {
    const m: Record<string, number> = {}
    EXP_FORMS.forEach((f) => (m[f] = 0))
    records.forEach((r) => { if (r.form && m[r.form] != null) m[r.form]++ })
    return m
  }, [records])
  const formOption = useMemo(() => ({
    grid: { left: 40, right: 16, top: 36, bottom: 28 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: EXP_FORMS, axisLabel: { fontSize: 10, interval: 0, rotate: 20 } },
    yAxis: { type: 'value', name: '次', minInterval: 1, axisLabel: { fontSize: 10 } },
    series: [{ name: '次', type: 'bar', data: EXP_FORMS.map((f) => formCounts[f]), itemStyle: { color: '#6366F1' } }],
  }), [formCounts])

  // 兴趣评分趋势（按日期）
  const ratingSorted = useMemo(
    () => records.filter((r) => typeof r.rating === 'number').slice().sort((a, b) => a.date.localeCompare(b.date)),
    [records]
  )
  const ratingOption = useMemo(() => ({
    grid: { left: 40, right: 16, top: 36, bottom: 28 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ratingSorted.map((r) => r.date), axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', name: '评分(1-5)', min: 1, max: 5, interval: 1, axisLabel: { fontSize: 10 } },
    series: [{ name: '兴趣评分', type: 'line', data: ratingSorted.map((r) => r.rating), itemStyle: { color: '#0EA5A4' }, areaStyle: { opacity: 0.1 } }],
  }), [ratingSorted])

  const avgRating = useMemo(() => {
    const arr = records.filter((r) => typeof r.rating === 'number').map((r) => r.rating as number)
    return arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : '-'
  }, [records])
  const careerCover = useMemo(() => new Set(records.map((r) => r.career).filter(Boolean)).size, [records])

  const onAdd = (values: any) => {
    const rec: ExperienceRecord = {
      id: newId(),
      date: values.date.format('YYYY-MM-DD'),
      career: values.career || '',
      form: values.form || '参观',
      venue: values.venue || '',
      durationMin: values.durationMin || undefined,
      rating: values.rating || undefined,
      gain: values.gain || '',
      note: values.note || '',
    }
    addRecord(rec)
    form.resetFields()
    msg.success('已保存职业体验记录')
    if (cloudOn) feishuSync.pushExperience([rec as any]).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
  }
  const onDelete = (r: ExperienceRecord) => {
    deleteRecord(r.id)
    if (cloudOn) feishuSync.deleteExperience([r.id]).catch((e) => msg.warning('飞书删除失败：' + e.message))
  }

  const columns: ColumnsType<ExperienceRecord> = [
    { title: '日期', dataIndex: 'date', width: 100 },
    { title: '体验职业', dataIndex: 'career', width: 120, ellipsis: true, render: (v: string) => v || '-' },
    { title: '形式', dataIndex: 'form', width: 84, render: (v: string) => <Tag color="cyan">{v || '-'}</Tag> },
    { title: '地点', dataIndex: 'venue', width: 110, ellipsis: true, render: (v: string) => v || '-' },
    { title: '时长(分)', dataIndex: 'durationMin', width: 78, render: (v: number) => v ?? '-' },
    { title: '评分', dataIndex: 'rating', width: 60, render: (v: number) => v ?? '-' },
    { title: '收获', dataIndex: 'gain', ellipsis: true, render: (v: string) => v || '-' },
    { title: '操作', width: 70, render: (_, r) => <Button type="link" danger size="small" onClick={() => onDelete(r)}>删除</Button> },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>职业体验库</h2>
        <div style={{ color: '#64748B', fontSize: 13 }}>
          记录真实职业体验/访谈/影子学习，攒成轻量素材库（非就业对接）。本地优先存储，开启云同步后写入飞书。
        </div>
      </div>

            <Alert type="info" showIcon style={{ marginBottom: 16 }}
        message="本模块是职业体验的客观留痕与素材库，不评判体验好坏；评分仅代表孩子当下兴趣，非职业适配结论。" />

      <Tabs items={[
        {
          key: 'input', label: '录入与记录',
          children: (
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Card size="small" title="录入一次体验活动">
                  <Form form={form} layout="vertical" onFinish={onAdd}>
                    <Form.Item name="date" label="日期" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="career" label="体验职业/角色" rules={[{ required: true }]}><Input placeholder="如 消防站开放日" /></Form.Item>
                    <Form.Item name="form" label="形式" initialValue="参观"><Select options={EXP_FORMS.map((f) => ({ label: f, value: f }))} /></Form.Item>
                    <Form.Item name="venue" label="地点/机构"><Input placeholder="如 区消防中队" /></Form.Item>
                    <Form.Item name="durationMin" label="时长（分钟，可选）"><InputNumber min={0} max={600} style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="rating" label="兴趣评分（1-5，可选）"><InputNumber min={1} max={5} style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="gain" label="收获/感想"><TextArea rows={2} placeholder="孩子说了什么、有什么触动" /></Form.Item>
                    <Form.Item name="note" label="备注（可选）"><Input placeholder="如 已拍照片存档" /></Form.Item>
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
          key: 'trend', label: '分布与评分',
          children: (
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              {records.length ? (
                <>
                  <Card size="small" title="体验形式分布"><ReactECharts option={formOption} style={{ height: 280 }} notMerge lazyUpdate /></Card>
                  {ratingSorted.length ? (
                    <Card size="small" title="兴趣评分趋势（按日期）"><ReactECharts option={ratingOption} style={{ height: 280 }} notMerge lazyUpdate /></Card>
                  ) : null}
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
                  <div style={{ color: '#64748B', fontSize: 12 }}>累计体验</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: '#0F766E' }}>{records.length}</div>
                </Card></Col>
                <Col xs={12} sm={8} md={6} lg={4}><Card size="small">
                  <div style={{ color: '#64748B', fontSize: 12 }}>平均评分</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: '#0EA5A4' }}>{avgRating}</div>
                </Card></Col>
                <Col xs={12} sm={8} md={6} lg={4}><Card size="small">
                  <div style={{ color: '#64748B', fontSize: 12 }}>覆盖职业</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: '#6366F1' }}>{careerCover}</div>
                </Card></Col>
                <Col xs={24} sm={8} md={12} lg={12}><Card size="small" title="说明">
                  <div style={{ color: '#94A3B8', fontSize: 12 }}>体验越多，孩子对「职业是什么、自己喜不喜欢」的感受越真实；这里只是素材积累，不是升学或就业承诺。</div>
                </Card></Col>
              </Row>
              <Divider />
              <div style={{ color: '#94A3B8', fontSize: 12 }}>注：本模块只做职业体验留痕，不评判、不对接就业；评分为孩子主观兴趣，非能力结论。</div>
            </Space>
          )
        }
      ]} />
    </div>
  )
}
