import { useMemo, useState, useEffect } from 'react'
import dayjs from 'dayjs'
import {
  Card, Tabs, Form, Input, InputNumber, DatePicker, Button, Table, Tag,
  Empty, Row, Col, Space, App, Divider, Switch, Alert, Progress, Rate, Radio, Tooltip
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import echarts from '../lib/echarts'
import {
  useNutritionStore, mealCount, breakfastScoreText, dietScore,
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
  const waterCupSeries = useMemo(() => sorted.map((r) => (r.waterCups != null ? r.waterCups : null)), [sorted])
  const breakfastSeries = useMemo(() => sorted.map((r) => r.breakfastScore ?? null), [sorted])
  const dietScoreSeries = useMemo(() => sorted.map((r) => dietScore(r)), [sorted])
  const mealSeries = useMemo(() => sorted.map((r) => mealCount(r)), [sorted])
  const last = sorted[sorted.length - 1]

  const waterOption = useMemo(() => ({
    grid: { left: 48, right: 44, top: 36, bottom: 28 },
    tooltip: { trigger: 'axis' },
    legend: { top: 0, textStyle: { fontSize: 11 } },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10 } },
    yAxis: [
      { type: 'value', name: '饮水(ml)', axisLabel: { fontSize: 10 } },
      { type: 'value', name: '杯数', minInterval: 1, axisLabel: { fontSize: 10 }, splitLine: { show: false } },
    ],
    series: [
      {
        name: '饮水量', type: 'bar', data: waterSeries,
        barWidth: 18,
        itemStyle: { color: '#0EA5A4', borderRadius: [4, 4, 0, 0] },
        markLine: {
          silent: true, symbol: 'none',
          data: [{ yAxis: WATER_REF, name: '参考线' }],
          lineStyle: { color: '#F59E0B', type: 'dashed' },
          label: { formatter: '参考 ' + WATER_REF, fontSize: 10, color: '#F59E0B' },
        },
      },
      {
        name: '饮水杯数', type: 'line', yAxisIndex: 1, data: waterCupSeries,
        itemStyle: { color: '#6366F1' }, symbolSize: 6, connectNulls: true,
      },
    ],
  }), [dates, waterSeries, waterCupSeries])

  const structureOption = useMemo(() => ({
    grid: { left: 40, right: 44, top: 36, bottom: 28 },
    tooltip: { trigger: 'axis' },
    legend: { top: 0, textStyle: { fontSize: 11 } },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10 } },
    yAxis: [
      { type: 'value', name: '早餐质量', min: 0, max: 3, minInterval: 1, axisLabel: { fontSize: 10 } },
      { type: 'value', name: '结构得分', min: 0, max: 5, minInterval: 1, axisLabel: { fontSize: 10 }, splitLine: { show: false } },
    ],
    series: [
      {
        name: '早餐质量', type: 'line', data: breakfastSeries,
        itemStyle: { color: '#0EA5A4' }, symbolSize: 7, step: 'middle', connectNulls: true,
      },
      {
        name: '膳食结构得分', type: 'line', yAxisIndex: 1, data: dietScoreSeries,
        itemStyle: { color: '#F59E0B' }, symbolSize: 7, smooth: true, connectNulls: true,
      },
    ],
  }), [dates, breakfastSeries, dietScoreSeries])

  // 最近 7 天指标
  const recent7 = sorted.slice(-7)
  const avgWater = recent7.length
    ? Math.round(recent7.reduce((a, r) => a + (r.waterMl || 0), 0) / recent7.length)
    : undefined
  const avgWaterCups = recent7.length
    ? Number((recent7.reduce((a, r) => a + (r.waterCups || 0), 0) / recent7.length).toFixed(1))
    : undefined
  const avgDietScore = recent7.length
    ? Number((recent7.reduce((a, r) => a + dietScore(r), 0) / recent7.length).toFixed(1))
    : undefined
  const breakfastGoodRate = recent7.length
    ? Math.round(recent7.filter((r) => (r.breakfastScore || 0) >= 3).length / recent7.length * 100)
    : undefined
  const milkRate = recent7.length
    ? Math.round(recent7.filter((r) => r.milk).length / recent7.length * 100)
    : undefined
  const vegFruitOkDays = recent7.filter((r) => (r.veg || 0) >= 2 && (r.fruit || 0) >= 1).length

  // 防焦虑 / 非诊断提示（仅家长端）
  const alerts: string[] = []
  if (avgWater != null && avgWater < 600 && avgWaterCups != null && avgWaterCups < 3) {
    alerts.push(`近 7 天平均主动饮水约 ${avgWater}ml（${avgWaterCups}杯），偏低。可温和提醒孩子少量多次喝水；如长期明显偏低建议咨询学校保健老师或医院营养科，本工具不做任何营养诊断。`)
  }
  if (recent7.length && recent7.filter((r) => (r.breakfastScore || 0) >= 3).length < recent7.length * 0.5) {
    alerts.push('近 7 天优质早餐（含 3 类及以上食物）比例不足一半。早餐建议包含谷薯、蔬果、肉蛋奶、大豆坚果中的三类。')
  }
  if (recent7.length && recent7.filter((r) => (r.veg || 0) >= 2 && (r.fruit || 0) >= 1).length < recent7.length * 0.5) {
    alerts.push('近 7 天蔬果摄入达标天数偏少。建议每天蔬菜约 2–3 拳头、水果 1 拳头，食物多样更有助于营养充足。')
  }

  const valuesToRecord = (values: any, id?: string): NutritionRecord => {
    const bool = (v: any) => v === true || v === 'yes'
    return {
      id: id || newId(),
      date: values.date.format('YYYY-MM-DD'),
      breakfast: values.breakfast || '',
      lunch: values.lunch || '',
      dinner: values.dinner || '',
      snack: values.snack || '',
      breakfastScore: values.breakfastScore != null ? Number(values.breakfastScore) : undefined,
      veg: values.veg != null && values.veg !== '' ? Number(values.veg) : undefined,
      fruit: values.fruit != null && values.fruit !== '' ? Number(values.fruit) : undefined,
      milk: bool(values.milk),
      waterMl: values.waterMl != null && values.waterMl !== '' ? Number(values.waterMl) : undefined,
      waterCups: values.waterCups != null && values.waterCups !== '' ? Number(values.waterCups) : undefined,
      sugarDrink: values.sugarDrink != null && values.sugarDrink !== '' ? Number(values.sugarDrink) : undefined,
      snackHealthy: values.snackHealthy != null ? Number(values.snackHealthy) : undefined,
      screenWhileEating: bool(values.screenWhileEating),
      eatOut: bool(values.eatOut),
      supplement: values.supplement || '',
      note: values.note || '',
    }
  }

  const onAdd = (values: any) => {
    const rec = valuesToRecord(values)
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
      breakfastScore: r.breakfastScore,
      veg: r.veg,
      fruit: r.fruit,
      milk: r.milk ? 'yes' : 'no',
      waterMl: r.waterMl,
      waterCups: r.waterCups,
      sugarDrink: r.sugarDrink,
      snackHealthy: r.snackHealthy,
      screenWhileEating: r.screenWhileEating ? 'yes' : 'no',
      eatOut: r.eatOut ? 'yes' : 'no',
      supplement: r.supplement || '',
      note: r.note || '',
    })
    setEditingId(r.id)
  }
  const onUpdate = (values: any) => {
    if (!editingId) return
    const rec = valuesToRecord(values, editingId)
    updateRecord(editingId, rec)
    msg.success('已更新膳食记录')
    if (cloudOn) feishuSync.pushNutrition([rec as any]).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
    resetForm()
  }

  const columns: ColumnsType<NutritionRecord> = [
    { title: '日期', dataIndex: 'date', width: 104 },
    { title: '早餐', dataIndex: 'breakfast', ellipsis: true, render: (v: string) => v || '-' },
    { title: '早餐质量', width: 86, render: (_, r) => {
      const s = r.breakfastScore
      const color = s == null ? 'default' : s >= 3 ? 'green' : s >= 2 ? 'blue' : s >= 1 ? 'orange' : 'red'
      return <Tag color={color}>{breakfastScoreText(s)}</Tag>
    }},
    { title: '蔬果', width: 90, render: (_, r) => `${r.veg ?? '-'}+${r.fruit ?? '-'} 份` },
    { title: '奶', width: 54, render: (_, r) => r.milk ? <Tag color="green">达标</Tag> : r.milk === false ? <Tag>未达</Tag> : '-' },
    { title: '饮水', width: 110, render: (_, r) => {
      const parts = []
      if (r.waterMl != null) parts.push(`${r.waterMl}ml`)
      if (r.waterCups != null) parts.push(`${r.waterCups}杯`)
      return parts.length ? parts.join(' / ') : '-'
    }},
    { title: '含糖饮料', width: 80, render: (_, r) => r.sugarDrink != null ? `${r.sugarDrink}次` : '-' },
    { title: '零食', width: 72, render: (_, r) => {
      const map: Record<number, [string, string]> = { 1: ['不健康', 'red'], 2: ['一般', 'orange'], 3: ['健康', 'green'] }
      const t = r.snackHealthy != null ? map[r.snackHealthy] : null
      return t ? <Tag color={t[1]}>{t[0]}</Tag> : '-'
    }},
    { title: '屏幕', width: 72, render: (_, r) => r.screenWhileEating ? <Tag color="red">边吃边</Tag> : '-' },
    { title: '在外', width: 60, render: (_, r) => r.eatOut ? <Tag color="orange">是</Tag> : '-' },
    { title: '补充', dataIndex: 'supplement', width: 80, ellipsis: true, render: (v: string) => v || '-' },
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
                      <Form.Item name="breakfastScore" label="早餐质量（含几类食物）">
                        <Radio.Group optionType="button" buttonStyle="solid" style={{ width: '100%' }}>
                          <Radio.Button value={0} style={{ width: '25%', textAlign: 'center' }}>未吃</Radio.Button>
                          <Radio.Button value={1} style={{ width: '25%', textAlign: 'center' }}>1类</Radio.Button>
                          <Radio.Button value={2} style={{ width: '25%', textAlign: 'center' }}>2类</Radio.Button>
                          <Radio.Button value={3} style={{ width: '25%', textAlign: 'center' }}>≥3类</Radio.Button>
                        </Radio.Group>
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>谷薯、蔬果、肉蛋奶、大豆坚果四类中含几类</div>
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
                      <Row gutter={8}>
                        <Col span={12}>
                          <Form.Item name="veg" label="蔬菜份数">
                            <InputNumber min={0} max={10} style={{ width: '100%' }} placeholder="约1拳头/份" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item name="fruit" label="水果份数">
                            <InputNumber min={0} max={10} style={{ width: '100%' }} placeholder="约1拳头/份" />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item name="milk" label="今天喝奶/奶制品 ≥300ml？">
                        <Radio.Group optionType="button" buttonStyle="solid">
                          <Radio.Button value="yes">是</Radio.Button>
                          <Radio.Button value="no">否</Radio.Button>
                        </Radio.Group>
                      </Form.Item>
                      <Row gutter={8}>
                        <Col span={12}>
                          <Form.Item name="waterMl" label="饮水量 (ml)">
                            <InputNumber min={0} max={5000} style={{ width: '100%' }} placeholder="可选" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item name="waterCups" label="饮水杯/瓶数">
                            <InputNumber min={0} max={30} style={{ width: '100%' }} placeholder="零碎时间记这个" />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item name="sugarDrink" label="含糖饮料次数">
                        <InputNumber min={0} max={20} style={{ width: '100%' }} placeholder="0=没有，汽水果汁奶茶都算" />
                      </Form.Item>
                      <Form.Item name="snackHealthy" label="零食健康度">
                        <Rate count={3} tooltips={['高糖高脂（薯片/糖果/饮料）', '一般（饼干/面包）', '健康（水果/奶/坚果/煮蛋）']} />
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>1星=不健康，2星=一般，3星=健康；不填则不统计</div>
                      </Form.Item>
                      <Row gutter={8}>
                        <Col span={12}>
                          <Form.Item name="screenWhileEating" label="边吃边屏幕？">
                            <Radio.Group optionType="button" buttonStyle="solid">
                              <Radio.Button value="yes">是</Radio.Button>
                              <Radio.Button value="no">否</Radio.Button>
                            </Radio.Group>
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item name="eatOut" label="在外就餐？">
                            <Radio.Group optionType="button" buttonStyle="solid">
                              <Radio.Button value="yes">是</Radio.Button>
                              <Radio.Button value="no">否</Radio.Button>
                            </Radio.Group>
                          </Form.Item>
                        </Col>
                      </Row>
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
                    <Card size="small" title="饮水趋势（柱状=ml，折线=杯数；橙线为温和参考）">
                      <ReactEChartsCore echarts={echarts} option={waterOption} style={{ height: 280 }} notMerge lazyUpdate />
                    </Card>
                    <Card size="small" title="早餐质量 & 膳食结构得分趋势（依据《中国学龄儿童膳食指南》）">
                      <ReactEChartsCore echarts={echarts} option={structureOption} style={{ height: 260 }} notMerge lazyUpdate />
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
                <Row gutter={[12, 12]}>
                  <Col xs={12} sm={8} md={6} lg={4}>
                    <Card size="small">
                      <div style={{ color: '#64748B', fontSize: 12 }}>优质早餐率</div>
                      <div style={{ fontSize: 22, fontWeight: 600, color: breakfastGoodRate != null && breakfastGoodRate < 50 ? '#F59E0B' : '#0EA5A4' }}>
                        {breakfastGoodRate != null ? `${breakfastGoodRate}%` : '-'}
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>近7天含≥3类食物</div>
                    </Card>
                  </Col>
                  <Col xs={12} sm={8} md={6} lg={4}>
                    <Card size="small">
                      <div style={{ color: '#64748B', fontSize: 12 }}>喝奶达标率</div>
                      <div style={{ fontSize: 22, fontWeight: 600, color: milkRate != null && milkRate < 50 ? '#F59E0B' : '#0EA5A4' }}>
                        {milkRate != null ? `${milkRate}%` : '-'}
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>近7天≥300ml/天</div>
                    </Card>
                  </Col>
                  <Col xs={12} sm={8} md={6} lg={4}>
                    <Card size="small">
                      <div style={{ color: '#64748B', fontSize: 12 }}>蔬果达标天数</div>
                      <div style={{ fontSize: 22, fontWeight: 600, color: vegFruitOkDays < 3 ? '#F59E0B' : '#0EA5A4' }}>
                        {recent7.length ? `${vegFruitOkDays}/${recent7.length}` : '-'}
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>蔬菜≥2份+水果≥1份</div>
                    </Card>
                  </Col>
                  <Col xs={12} sm={8} md={6} lg={4}>
                    <Card size="small">
                      <div style={{ color: '#64748B', fontSize: 12 }}>膳食结构均分</div>
                      <div style={{ fontSize: 22, fontWeight: 600, color: avgDietScore != null && avgDietScore < 3 ? '#F59E0B' : '#0EA5A4' }}>
                        {avgDietScore != null ? `${avgDietScore}/5` : '-'}
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>近7天综合</div>
                    </Card>
                  </Col>
                  <Col xs={24} sm={8} md={12} lg={8}>
                    <Card size="small" title="饮水参考进度（近7天均值）">
                      <Progress
                        percent={avgWater != null ? Math.min(100, Math.round((avgWater / WATER_REF) * 100)) : 0}
                        status={avgWater != null && avgWater < 600 ? 'active' : 'success'}
                        format={(p) => `${avgWater ?? 0}/${WATER_REF}ml`}
                      />
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                        {avgWaterCups != null ? `约 ${avgWaterCups} 杯/天 · ` : ''}参考值为温和建议，非硬性标准。
                      </div>
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
  const waterParts = []
  if (rec.waterMl != null) waterParts.push(`${rec.waterMl}ml`)
  if (rec.waterCups != null) waterParts.push(`${rec.waterCups}杯`)
  const snackMap: Record<number, string> = { 1: '不健康', 2: '一般', 3: '健康' }
  const items: [string, string?][] = [
    ['早餐', rec.breakfast],
    ['早餐质量', breakfastScoreText(rec.breakfastScore)],
    ['午餐', rec.lunch],
    ['晚餐', rec.dinner],
    ['加餐', rec.snack],
    ['蔬果', `蔬菜${rec.veg ?? '-'}份 / 水果${rec.fruit ?? '-'}份`],
    ['喝奶', rec.milk ? '≥300ml 达标' : rec.milk === false ? '未达标' : undefined],
    ['饮水', waterParts.length ? waterParts.join(' / ') : undefined],
    ['含糖饮料', rec.sugarDrink != null ? `${rec.sugarDrink}次` : undefined],
    ['零食健康度', rec.snackHealthy != null ? snackMap[rec.snackHealthy] : undefined],
    ['边吃边屏幕', rec.screenWhileEating ? '是' : rec.screenWhileEating === false ? '否' : undefined],
    ['在外就餐', rec.eatOut ? '是' : rec.eatOut === false ? '否' : undefined],
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
