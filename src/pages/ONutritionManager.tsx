import { useMemo, useState, useEffect } from 'react'
import dayjs from 'dayjs'
import {
  Card, Tabs, Form, Input, InputNumber, DatePicker, Button, Table, Tag,
  Empty, Row, Col, Space, App, Divider, Switch, Alert, Progress
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import ReactECharts from 'echarts-for-react'
import {
  useNutritionStore, mealCount,
  type NutritionRecord
} from '../store/useNutritionStore'
import { feishuSync, useCloudOn } from '../store/feishuSync'

const { TextArea } = Input

function newId() {
  return 'nu_' + Math.random().toString(36).slice(2, 9)
}

// 饮水参考线：学龄儿童约 1000–1400ml/天（含食物水分，此处仅记主动饮水，作温和参考）
const WATER_REF = 1200

export default function ONutritionManager() {
  const { records, addRecord, deleteRecord, updateRecord, clearRecords, syncFromCloud } = useNutritionStore()
  const { message: msg } = App.useApp()

  // 云同步：全站共享配置，hook 响应式获取
  const cloudOn = useCloudOn()
  useEffect(() => { if (cloudOn) syncFromCloud() /* eslint-disable-next-line */ }, [cloudOn])
  const [form] = Form.useForm()
  const [editingId, setEditingId] = useState<string | null>(null)
  const isEditing = editingId !== null
  const resetForm = () => { setEditingId(null); form.resetFields() }

  // 按日期升序
  const sorted = useMemo(() => [...records].sort((a, b) => a.date.localeCompare(b.date)), [records])
  const dates = useMemo(() => sorted.map((r) => r.date), [sorted])
  const waterSeries = useMemo(() => sorted.map((r) => (r.waterMl != null ? r.waterMl : null)), [sorted])
  const mealSeries = useMemo(() => sorted.map((r) => mealCount(r)), [sorted])
  const last = sorted[sorted.length - 1]

  const waterOption = useMemo(() => ({
    grid: { left: 48, right: 16, top: 36, bottom: 28 },
    tooltip: { trigger: 'axis' },
    legend: { top: 0, textStyle: { fontSize: 11 } },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', name: '饮水(ml)', axisLabel: { fontSize: 10 } },
    series: [
      {
        name: '饮水量', type: 'bar', data: waterSeries,
        itemStyle: { color: '#0EA5A4' },
        markLine: {
          silent: true, symbol: 'none',
          data: [{ yAxis: WATER_REF, name: '参考线' }],
          lineStyle: { color: '#F59E0B', type: 'dashed' },
          label: { formatter: '参考 ' + WATER_REF, fontSize: 10, color: '#F59E0B' },
        },
      },
    ],
  }), [dates, waterSeries])

  const mealOption = useMemo(() => ({
    grid: { left: 40, right: 16, top: 36, bottom: 28 },
    tooltip: { trigger: 'axis' },
    legend: { top: 0, textStyle: { fontSize: 11 } },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', name: '记录餐数', min: 0, max: 4, axisLabel: { fontSize: 10 } },
    series: [
      { name: '记录餐数', type: 'line', step: 'middle', data: mealSeries, itemStyle: { color: '#6366F1' }, connectNulls: true },
    ],
  }), [dates, mealSeries])

  // 最近 7 天饮水均值 & 平均记录餐数
  const recent7 = sorted.slice(-7)
  const avgWater = recent7.length
    ? Math.round(recent7.reduce((a, r) => a + (r.waterMl || 0), 0) / recent7.length)
    : undefined
  const avgMeal = recent7.length
    ? Number((recent7.reduce((a, r) => a + mealCount(r), 0) / recent7.length).toFixed(1))
    : undefined

  // 防焦虑 / 非诊断提示（仅家长端）
  const alerts: string[] = []
  if (avgWater != null && avgWater < 800) {
    alerts.push(`近 7 天平均主动饮水约 ${avgWater}ml，偏低。这只是记录参考，可温和提醒孩子多带水壶；如长期明显偏低建议咨询学校保健老师或医院营养科，本工具不做任何营养诊断。`)
  }
  if (recent7.length && recent7.every((r) => mealCount(r) <= 2)) {
    alerts.push('近期餐食记录偏少（多日仅记 1–2 餐）。记录越全越能看清规律；若实际用餐也长期单一，可关注饮食多样性，必要时咨询专业营养评估。')
  }

  const onAdd = (values: any) => {
    const rec: NutritionRecord = {
      id: newId(),
      date: values.date.format('YYYY-MM-DD'),
      breakfast: values.breakfast || '',
      lunch: values.lunch || '',
      dinner: values.dinner || '',
      snack: values.snack || '',
      waterMl: values.waterMl != null && values.waterMl !== '' ? Number(values.waterMl) : undefined,
      supplement: values.supplement || '',
      note: values.note || '',
    }
    addRecord(rec)
    form.resetFields()
    msg.success('已保存膳食记录')
    if (cloudOn) feishuSync.pushNutrition([rec as any]).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
  }
  const onDelete = (r: NutritionRecord) => {
    deleteRecord(r.id)
    if (cloudOn) feishuSync.deleteNutrition([r.id]).catch((e) => msg.warning('飞书删除失败：' + e.message))
  }
  const onEdit = (r: NutritionRecord) => {
    form.setFieldsValue({
      date: dayjs(r.date),
      breakfast: r.breakfast || '',
      lunch: r.lunch || '',
      dinner: r.dinner || '',
      snack: r.snack || '',
      waterMl: r.waterMl != null ? r.waterMl : undefined,
      supplement: r.supplement || '',
      note: r.note || '',
    })
    setEditingId(r.id)
  }
  const onUpdate = (values: any) => {
    if (!editingId) return
    const patch = {
      date: values.date.format('YYYY-MM-DD'),
      breakfast: values.breakfast || '',
      lunch: values.lunch || '',
      dinner: values.dinner || '',
      snack: values.snack || '',
      waterMl: values.waterMl != null && values.waterMl !== '' ? Number(values.waterMl) : undefined,
      supplement: values.supplement || '',
      note: values.note || '',
    }
    updateRecord(editingId, patch)
    const updated = { id: editingId, ...patch }
    msg.success('已更新膳食记录')
    if (cloudOn) feishuSync.pushNutrition([updated as any]).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
    resetForm()
  }

  const columns: ColumnsType<NutritionRecord> = [
    { title: '日期', dataIndex: 'date', width: 110 },
    { title: '早餐', dataIndex: 'breakfast', ellipsis: true, render: (v: string) => v || '-' },
    { title: '午餐', dataIndex: 'lunch', ellipsis: true, render: (v: string) => v || '-' },
    { title: '晚餐', dataIndex: 'dinner', ellipsis: true, render: (v: string) => v || '-' },
    { title: '加餐', dataIndex: 'snack', ellipsis: true, render: (v: string) => v || '-' },
    { title: '饮水', width: 80, render: (_, r) => (r.waterMl != null ? `${r.waterMl}ml` : '-') },
    { title: '补充', dataIndex: 'supplement', width: 80, ellipsis: true, render: (v: string) => v || '-' },
    { title: '餐数', width: 64, render: (_, r) => <Tag color="#6366F1">{mealCount(r)}/4</Tag> },
    { title: '备注', dataIndex: 'note', ellipsis: true },
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
        <h2 style={{ margin: 0 }}>营养与膳食管理</h2>
        <div style={{ color: '#64748B', fontSize: 13 }}>
          记录每日饮食与饮水，看三餐规律、饮水量趋势。本地优先存储，开启云同步后写入飞书（飞书表待建，详见待办清单）。
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
                  <Card size="small" title={isEditing ? '编辑该膳食记录' : '录入一天饮食'} extra={isEditing ? <Button size="small" onClick={resetForm}>取消编辑</Button> : null} style={isEditing ? { borderColor: '#0EA5A4' } : undefined}>
                    <Form form={form} layout="vertical" onFinish={isEditing ? onUpdate : onAdd}>
                      <Form.Item name="date" label="日期" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item name="breakfast" label="早餐">
                        <TextArea rows={2} placeholder="如 牛奶+鸡蛋+包子" />
                      </Form.Item>
                      <Form.Item name="lunch" label="午餐">
                        <TextArea rows={2} placeholder="如 学校午餐 / 米饭+青菜+肉" />
                      </Form.Item>
                      <Form.Item name="dinner" label="晚餐">
                        <TextArea rows={2} placeholder="如 面条 / 鱼+蔬菜" />
                      </Form.Item>
                      <Form.Item name="snack" label="加餐 / 间食">
                        <Input placeholder="如 苹果 / 酸奶" />
                      </Form.Item>
                      <Form.Item name="waterMl" label="饮水量 (ml)">
                        <InputNumber min={0} max={5000} style={{ width: '100%' }} placeholder="如 1200" />
                      </Form.Item>
                      <Form.Item name="supplement" label="营养补充剂 (可选)">
                        <Input placeholder="如 维D / 钙" />
                      </Form.Item>
                      <Form.Item name="note" label="备注 (可选)">
                        <Input placeholder="挑食 / 外食 / 过敏等" />
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
                  message="本模块仅记录每日饮食客观情况用于看规律与趋势，不构成任何医学或营养诊断；若长期明显偏食/饮水不足，建议咨询学校保健老师或医院营养科评估。"
                />
                {sorted.length ? (
                  <>
                    <Card size="small" title={`饮水量趋势（橙线为温和参考 ${WATER_REF}ml）`}>
                      <ReactECharts option={waterOption} style={{ height: 280 }} notMerge lazyUpdate />
                    </Card>
                    <Card size="small" title="记录餐数（看三餐是否规律，最多 4 餐）">
                      <ReactECharts option={mealOption} style={{ height: 240 }} notMerge lazyUpdate />
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
                  <Col xs={12} sm={8} md={6} lg={4}>
                    <Card size="small">
                      <div style={{ color: '#64748B', fontSize: 12 }}>近7天平均饮水</div>
                      <div style={{ fontSize: 22, fontWeight: 600, color: avgWater != null && avgWater < 800 ? '#F59E0B' : '#0EA5A4' }}>
                        {avgWater != null ? `${avgWater}ml` : '-'}
                      </div>
                    </Card>
                  </Col>
                  <Col xs={12} sm={8} md={6} lg={4}>
                    <Card size="small">
                      <div style={{ color: '#64748B', fontSize: 12 }}>近7天均记录餐数</div>
                      <div style={{ fontSize: 22, fontWeight: 600, color: '#6366F1' }}>{avgMeal != null ? `${avgMeal}/4` : '-'}</div>
                    </Card>
                  </Col>
                  <Col xs={24} sm={8} md={12} lg={16}>
                    <Card size="small" title="饮水参考进度（近7天均值）">
                      <Progress
                        percent={avgWater != null ? Math.min(100, Math.round((avgWater / WATER_REF) * 100)) : 0}
                        status={avgWater != null && avgWater < 800 ? 'active' : 'success'}
                        format={(p) => `${avgWater ?? 0}/${WATER_REF}ml`}
                      />
                      <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>参考值为温和建议，非硬性标准；个体差异大，仅作观察。</div>
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
                  注：本模块只做饮食记录与规律观察，不评价孩子"吃得好不好"，更不做任何营养/发育诊断；分数与提示均仅供家长参考。
                </div>
              </Space>
            )
          }
        ]}
      />
    </div>
  )
}

function DespList({ rec }: { rec: NutritionRecord }) {
  const items: [string, string?][] = [
    ['早餐', rec.breakfast],
    ['午餐', rec.lunch],
    ['晚餐', rec.dinner],
    ['加餐', rec.snack],
    ['饮水', rec.waterMl != null ? `${rec.waterMl}ml` : undefined],
    ['补充剂', rec.supplement],
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
