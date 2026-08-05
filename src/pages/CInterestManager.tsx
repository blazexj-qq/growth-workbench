import { useMemo, useState, useEffect } from 'react'
import {
  Card, Tabs, Form, Input, InputNumber, DatePicker, Button, Table, Tag,
  Empty, Row, Col, Space, App, Divider, Switch, Alert, Select, Statistic, Tooltip
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import ReactECharts from 'echarts-for-react'
import {
  useInterestStore, READ_MODES,
  INTEREST_CATEGORIES, INTELLIGENCE_DIMS,
  categoryColor, categoryEmoji, categoryIntelligences,
  type InterestRecord, type IntelligenceKey
} from '../store/useInterestStore'
import { feishuSync, useCloudOn, getReadBuddyUrl, setReadBuddyUrl } from '../store/feishuSync'
import { axisBase, splitLineBase, darkTooltip, LABEL_COLOR } from '../utils/chartStyle'
import { useWindowWidth, isMobileWidth } from '../hooks/useWindowWidth'

const { TextArea } = Input

// 计算某大类的"天赋信号分"（自发性+沉浸度+表现加权均值，1-5）
function categorySignalScore(rs: InterestRecord[]): number | null {
  const arr: number[] = []
  for (const r of rs) {
    const s = r.spontaneity ?? 0
    const i = r.immersion ?? 0
    const p = r.performance ?? 0
    if (s && i && p) {
      // 自发性 0.4 + 沉浸度 0.35 + 表现 0.25（天赋研究的共识权重）
      arr.push(s * 0.4 + i * 0.35 + p * 0.25)
    }
  }
  if (!arr.length) return null
  return Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2))
}

// 按大类聚合（用于条形图、Top3）
function aggregateByCategory(records: InterestRecord[]) {
  const map = new Map<string, { count: number; totalMin: number; signal: number[] }>()
  for (const r of records) {
    if (!r.category) continue
    if (!map.has(r.category)) map.set(r.category, { count: 0, totalMin: 0, signal: [] })
    const m = map.get(r.category)!
    m.count += 1
    m.totalMin += r.durationMin || 0
    if (r.spontaneity && r.immersion && r.performance) {
      m.signal.push(r.spontaneity * 0.4 + r.immersion * 0.35 + r.performance * 0.25)
    }
  }
  return Array.from(map.entries()).map(([cat, v]) => ({
    cat,
    count: v.count,
    totalMin: v.totalMin,
    signal: v.signal.length ? Number((v.signal.reduce((a, b) => a + b, 0) / v.signal.length).toFixed(2)) : null,
  }))
}

// 按 8 大智能聚合信号均值（用于雷达图）
function aggregateByIntelligence(records: InterestRecord[]) {
  const result: Record<IntelligenceKey, number[]> = {
    语言: [], 数理: [], 空间: [], 动觉: [], 音乐: [], 人际: [], 内省: [], 自然观察: [],
  }
  for (const r of records) {
    const ints = categoryIntelligences(r.category)
    const s = r.spontaneity ?? 0, i = r.immersion ?? 0, p = r.performance ?? 0
    if (!s || !i || !p) continue
    const score = s * 0.4 + i * 0.35 + p * 0.25
    for (const k of ints) result[k].push(score)
  }
  return INTELLIGENCE_DIMS.map((d) => ({
    key: d.key,
    label: d.label,
    emoji: d.emoji,
    value: result[d.key].length
      ? Number((result[d.key].reduce((a, b) => a + b, 0) / result[d.key].length).toFixed(2))
      : 0,
    count: result[d.key].length,
  }))
}

export default function CInterestManager() {
  const { records, addRecord, deleteRecord, clearRecords, syncFromCloud } = useInterestStore()
  const { message: msg } = App.useApp()

  // 云同步：全站共享配置，hook 响应式获取
  const cloudOn = useCloudOn()
  useEffect(() => { if (cloudOn) syncFromCloud() /* eslint-disable-next-line */ }, [cloudOn])
  const [form] = Form.useForm()

  // 读伴地址（接读伴 ReadingBuddy）
  const [rbUrl, setRbUrlState] = useState(getReadBuddyUrl())
  const openReadBuddy = () => {
    if (!rbUrl) { msg.warning('请先在「读伴入口」卡填写读伴地址'); return }
    window.open(rbUrl, '_blank', 'noopener')
  }

  // 通用图表审美
  const baseAxis = axisBase()
  const baseTooltip = darkTooltip()
  const splitLine = splitLineBase

  // 按日期升序
  const sorted = useMemo(() => [...records].sort((a, b) => a.date.localeCompare(b.date)), [records])

  // 录入表单 watch 兴趣大类，决定是否显示阅读专属字段
  const catWatch = Form.useWatch('category', form)

  const onAdd = (values: any) => {
    const rec: InterestRecord = {
      id: 'ci_' + Math.random().toString(36).slice(2, 9),
      date: values.date.format('YYYY-MM-DD'),
      category: values.category,
      activity: values.activity || '',
      spontaneity: values.spontaneity != null && values.spontaneity !== '' ? Number(values.spontaneity) : undefined,
      immersion: values.immersion != null && values.immersion !== '' ? Number(values.immersion) : undefined,
      performance: values.performance != null && values.performance !== '' ? Number(values.performance) : undefined,
      // 兼容旧字段（阅读写作类可填）
      book: values.book || undefined,
      readMode: values.readMode || undefined,
      durationMin: values.durationMin != null && values.durationMin !== '' ? Number(values.durationMin) : undefined,
      amount: values.amount || undefined,
      comprehension: values.comprehension != null && values.comprehension !== '' ? Number(values.comprehension) : undefined,
      interest: values.interest != null && values.interest !== '' ? Number(values.interest) : undefined,
      parentObs: values.parentObs || '',
      note: values.note || '',
    }
    addRecord(rec)
    form.resetFields()
    msg.success('已保存兴趣记录')
    if (cloudOn) feishuSync.pushInterest([rec as any]).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
  }
  const onDelete = (r: InterestRecord) => {
    deleteRecord(r.id)
    if (cloudOn) feishuSync.deleteInterest([r.id]).catch((e) => msg.warning('飞书删除失败：' + e.message))
  }

  // 表格列
  const columns: ColumnsType<InterestRecord> = [
    { title: '日期', dataIndex: 'date', width: 100 },
    {
      title: '兴趣大类', dataIndex: 'category', width: 110,
      render: (v: string) => v ? (
        <Tag color={categoryColor(v)} style={{ color: '#fff', border: 'none' }}>
          <span style={{ marginRight: 4 }}>{categoryEmoji(v)}</span>{v}
        </Tag>
      ) : '-'
    },
    { title: '活动', dataIndex: 'activity', ellipsis: true, render: (v: string, r) => v || r.book || '-' },
    { title: '时长', width: 64, render: (_, r) => (r.durationMin != null ? `${r.durationMin}′` : '-') },
    { title: '兴趣', width: 60, render: (_, r) => (r.interest != null ? <Tag color="#0EA5A4">{r.interest}</Tag> : '-') },
    { title: '自发', width: 60, render: (_, r) => (r.spontaneity != null ? <Tag color="#10B981">{r.spontaneity}</Tag> : '-') },
    { title: '沉浸', width: 60, render: (_, r) => (r.immersion != null ? <Tag color="#8B5CF6">{r.immersion}</Tag> : '-') },
    { title: '表现', width: 60, render: (_, r) => (r.performance != null ? <Tag color="#F59E0B">{r.performance}</Tag> : '-') },
    { title: '家长观察', dataIndex: 'parentObs', ellipsis: true },
    { title: '操作', width: 70, render: (_, r) => <Button type="link" danger size="small" onClick={() => onDelete(r)}>删除</Button> },
  ]

  // ===== 趋势分析图表 =====
  const winW = useWindowWidth()
  const mobile = isMobileWidth(winW)
  const byCat = useMemo(() => aggregateByCategory(records), [records])
  const catBarOption = useMemo(() => ({
    grid: { left: mobile ? 8 : 96, right: mobile ? 8 : 24, top: 30, bottom: 30, containLabel: true },
    tooltip: Object.assign({}, baseTooltip, {
      formatter: (params) => {
        const p = params && params[0]
        if (!p) return ''
        const d = byCat[p.dataIndex]
        return `<div style="font-weight:600">${categoryEmoji(d.cat)} ${d.cat}</div>
                <div>活动次数：<b>${d.count}</b></div>
                <div>总时长：<b>${d.totalMin}</b> 分钟</div>
                ${d.signal ? `<div>信号均分：<b>${d.signal}/5</b></div>` : ''}`
      },
    }),
    xAxis: Object.assign({}, baseAxis, { type: 'value' }),
    yAxis: Object.assign({}, baseAxis, {
      type: 'category',
      data: byCat.map((d) => `${categoryEmoji(d.cat)} ${d.cat}`),
      axisLabel: Object.assign({}, baseAxis.axisLabel, { fontSize: 12 }),
    }),
    series: [{
      name: '活动次数', type: 'bar',
      data: byCat.map((d) => d.count),
      barWidth: 16,
      itemStyle: {
        color: (p: any) => categoryColor(byCat[p.dataIndex]?.cat),
        borderRadius: [0, 4, 4, 0],
      },
      label: { show: true, position: 'right', color: LABEL_COLOR, fontSize: 11 },
    }],
  }), [byCat, mobile])

  // 4 信号趋势折线
  const dates = useMemo(() => Array.from(new Set(sorted.map((r) => r.date))).sort(), [sorted])
  const seriesFor = (key: 'spontaneity' | 'immersion' | 'performance' | 'interest') => dates.map((d) => {
    const rs = sorted.filter((r) => r.date === d)
    const vals = rs.map((r) => r[key]).filter((v) => v != null) as number[]
    return vals.length ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : null
  })
  const sigLineOption = useMemo(() => ({
    grid: { left: 48, right: mobile ? 8 : 24, top: 30, bottom: 50, containLabel: true },
    tooltip: Object.assign({}, baseTooltip, { trigger: 'axis' }),
    legend: { top: 0, textStyle: { color: LABEL_COLOR, fontSize: 12 } },
    xAxis: Object.assign({}, baseAxis, {
      type: 'category', data: dates,
      axisLabel: { fontSize: mobile ? 10 : 12, color: LABEL_COLOR, hideOverlap: true, rotate: mobile ? 35 : 0 },
    }),
    yAxis: Object.assign({}, baseAxis, { type: 'value', min: 0, max: 5, name: '1-5', splitLine, nameTextStyle: { color: '#94A3B8', fontSize: 11 } }),
    series: [
      { name: '兴趣度', type: 'line', data: seriesFor('interest'), smooth: true, symbolSize: 6, lineStyle: { width: 2.2 }, itemStyle: { color: '#0EA5A4' }, connectNulls: true },
      { name: '自发性', type: 'line', data: seriesFor('spontaneity'), smooth: true, symbolSize: 6, lineStyle: { width: 2.2 }, itemStyle: { color: '#10B981' }, connectNulls: true },
      { name: '沉浸度', type: 'line', data: seriesFor('immersion'), smooth: true, symbolSize: 6, lineStyle: { width: 2.2 }, itemStyle: { color: '#8B5CF6' }, connectNulls: true },
      { name: '表现', type: 'line', data: seriesFor('performance'), smooth: true, symbolSize: 6, lineStyle: { width: 2.2 }, itemStyle: { color: '#F59E0B' }, connectNulls: true },
    ],
  }), [dates, records, mobile])

  // ===== 天赋信号图表 =====
  const intelAgg = useMemo(() => aggregateByIntelligence(records), [records])
  const radarOption = useMemo(() => {
    const hasData = intelAgg.some((d) => d.count > 0)
    return {
      tooltip: Object.assign({}, baseTooltip, {
        formatter: (p) => `<div style="font-weight:600">${p.name}</div><div>信号均分：<b>${p.value}/5</b></div><div>样本数：<b>${intelAgg.find((d) => d.label === p.name)?.count || 0}</b></div>`,
      }),
      radar: {
        indicator: intelAgg.map((d) => ({ name: `${d.emoji} ${d.label}`, max: 5 })),
        shape: 'polygon',
        radius: '65%',
        splitNumber: 5,
        axisName: { color: LABEL_COLOR, fontSize: 12 },
        splitLine: { lineStyle: { color: '#CBD5E1' } },
        splitArea: { areaStyle: { color: ['#F8FAFC', '#FFFFFF'] } },
        axisLine: { lineStyle: { color: '#CBD5E1' } },
      },
      series: [{
        type: 'radar',
        data: [{
          name: '天赋信号',
          value: intelAgg.map((d) => d.value || 0),
          areaStyle: { color: 'rgba(14,165,164,0.25)' },
          lineStyle: { color: '#0EA5A4', width: 2.5 },
          itemStyle: { color: '#0EA5A4' },
          symbolSize: 6,
        }],
      }],
    }
  }, [intelAgg])

  // Top 3 高分大类
  const top3 = useMemo(() => {
    const withSignal = byCat.filter((d) => d.signal != null)
    return withSignal.sort((a, b) => (b.signal! - a.signal!)).slice(0, 3)
  }, [byCat])

  // 最近 30 天 vs 之前 30 天 对比
  const trendCompare = useMemo(() => {
    const now = Date.now()
    const day = 86400000
    const recent: InterestRecord[] = []
    const prev: InterestRecord[] = []
    for (const r of records) {
      const t = new Date(r.date).getTime()
      if (t >= now - 30 * day) recent.push(r)
      else if (t >= now - 60 * day) prev.push(r)
    }
    const agg = (rs: InterestRecord[]) => aggregateByIntelligence(rs)
    const a = agg(recent)
    const b = agg(prev)
    return INTELLIGENCE_DIMS.map((d) => {
      const x = a.find((x) => x.key === d.key)?.value || 0
      const y = b.find((x) => x.key === d.key)?.value || 0
      const delta = x - y
      return { ...d, recent: x, prev: y, delta: Number(delta.toFixed(2)) }
    })
  }, [records])

  // 概览
  const totalCount = records.length
  const totalMin = records.reduce((a, r) => a + (r.durationMin || 0), 0)
  const catCount = new Set(records.filter((r) => r.category).map((r) => r.category!)).size
  const allSignal = records.filter((r) => r.spontaneity && r.immersion && r.performance)
  const overallSignal = allSignal.length
    ? Number((allSignal.reduce((a, r) => a + (r.spontaneity! * 0.4 + r.immersion! * 0.35 + r.performance! * 0.25), 0) / allSignal.length).toFixed(2))
    : null

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>兴趣爱好与天赋发现</h2>
        <div style={{ color: '#64748B', fontSize: 13 }}>
          记录孩子多领域的活动，看兴趣分布与天赋信号（自发性+沉浸度+表现）。
          本地优先存储，开启云同步后写入飞书。本模块只观察，不做"有没有天赋"的诊断。
        </div>
      </div>

      {/* 读伴入口卡（接读伴 ReadingBuddy） */}
      <Card size="small" style={{ marginBottom: 16, background: '#F0FDFA', borderColor: '#99F6E4' }}>
        <Row align="middle" gutter={12} wrap>
          <Col flex="auto">
            <div style={{ fontWeight: 600, color: '#0F766E' }}>读伴入口（ReadingBuddy）</div>
            <div style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>
              阅读写作类活动可让孩子用读伴 AI 伴读/出题，本模块负责把阅读与其他兴趣一起留痕归档。
            </div>
          </Col>
          <Col>
            <Space wrap>
              <Input
                placeholder="读伴地址，如 https://xxx.fc.devsapp.net/reading-buddy.html"
                value={rbUrl}
                onChange={(e) => setRbUrlState(e.target.value)}
                style={{ width: 320 }}
                allowClear
              />
              <Button onClick={() => { setReadBuddyUrl(rbUrl.trim()); msg.success('读伴地址已保存（仅存本机）') }}>保存</Button>
              <Button type="primary" style={{ background: '#0EA5A4', borderColor: '#0EA5A4' }} onClick={openReadBuddy}>打开读伴</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Tabs
        items={[
          {
            key: 'input',
            label: '录入与记录',
            children: (
              <Row gutter={16}>
                <Col xs={24} md={9}>
                  <Card size="small" title="录入一次兴趣/活动">
                    <Form form={form} layout="vertical" onFinish={onAdd}
                      initialValues={{ category: undefined, readMode: '自主' }}
                    >
                      <Form.Item name="date" label="日期" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item name="category" label="兴趣大类" rules={[{ required: true }]}>
                        <Select
                          placeholder="选一个大类（如 阅读写作、艺术创作）"
                          options={INTEREST_CATEGORIES.map((c) => ({
                            value: c.key,
                            label: <span><span style={{ marginRight: 6 }}>{c.emoji}</span>{c.label}<span style={{ color: '#94A3B8', fontSize: 11, marginLeft: 6 }}>· {c.examples}</span></span>,
                          }))}
                          showSearch optionFilterProp="label"
                        />
                      </Form.Item>
                      <Form.Item name="activity" label="具体活动" rules={[{ required: true }]}>
                        <Input placeholder="如 哈利波特与魔法石 / 围棋 / 油画 / Scratch" />
                      </Form.Item>
                      <Form.Item name="durationMin" label="时长（分钟）">
                        <InputNumber min={0} max={600} style={{ width: '100%' }} placeholder="如 30" />
                      </Form.Item>

                      <Divider style={{ margin: '12px 0' }} plain><span style={{ color: '#64748B', fontSize: 12 }}>天赋 4 大信号（1=弱 / 5=强）</span></Divider>

                      <Row gutter={12}>
                        <Col span={12}>
                          <Form.Item name="interest" label="兴趣度">
                            <InputNumber min={1} max={5} step={0.5} style={{ width: '100%' }} placeholder="孩子想不想做" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item name="spontaneity" label="自发性"
                            tooltip="孩子主动要求做的程度（vs 家长推动）">
                            <InputNumber min={1} max={5} step={0.5} style={{ width: '100%' }} placeholder="主动要求" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item name="immersion" label="沉浸度"
                            tooltip="做的时候是否忘我、忘了时间">
                            <InputNumber min={1} max={5} step={0.5} style={{ width: '100%' }} placeholder="忘我程度" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item name="performance" label="表现/速度"
                            tooltip="在该活动上的表现或学得是否比同龄快">
                            <InputNumber min={1} max={5} step={0.5} style={{ width: '100%' }} placeholder="学得又快又好" />
                          </Form.Item>
                        </Col>
                      </Row>

                      {/* 阅读写作专属字段（条件显示） */}
                      {catWatch === '阅读写作' && (
                        <>
                          <Divider style={{ margin: '12px 0' }} plain><span style={{ color: '#0F766E', fontSize: 12 }}>📚 阅读写作专属</span></Divider>
                          <Form.Item name="book" label="书名">
                            <Input placeholder="如 哈利波特与魔法石" />
                          </Form.Item>
                          <Form.Item name="readMode" label="阅读方式" initialValue="自主">
                            <Select options={READ_MODES.map((m) => ({ label: m, value: m }))} />
                          </Form.Item>
                          <Form.Item name="amount" label="阅读量">
                            <Input placeholder="如 3章 / 20页" />
                          </Form.Item>
                          <Form.Item name="comprehension" label="理解自评（1-5）">
                            <InputNumber min={1} max={5} style={{ width: '100%' }} placeholder="孩子/家长共评" />
                          </Form.Item>
                        </>
                      )}

                      <Form.Item name="parentObs" label="家长观察">
                        <TextArea rows={2} placeholder="如 沉浸、主动续读；或某处需解释" />
                      </Form.Item>
                      <Form.Item name="note" label="备注（可选）">
                        <Input placeholder="如 自主选书 / 兴趣班 / 比赛" />
                      </Form.Item>
                      <Button type="primary" htmlType="submit" block>保存</Button>
                    </Form>
                  </Card>
                </Col>
                <Col xs={24} md={15}>
                  <Card size="small" title={`已记录（${records.length} 条）`}
                    extra={records.length ? <Button size="small" danger onClick={() => { clearRecords(); msg.success('已清空') }}>清空</Button> : null}
                  >
                    {records.length ? (
                      <Table rowKey="id" size="small" columns={columns} dataSource={records.slice().sort((a, b) => b.date.localeCompare(a.date))} pagination={{ pageSize: 8, size: 'small' }} scroll={{ x: 'max-content' }} />
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
                <Alert type="info" showIcon message="图表只展示你录入的兴趣分布与信号趋势，不评价天赋；样本越多，趋势越有意义。" />
                {records.length ? (
                  <>
                    <Card size="small" title="各兴趣大类活动次数">
                      {byCat.length ? <ReactECharts option={catBarOption} style={{ height: 260 + byCat.length * 4 }} notMerge lazyUpdate /> : <Empty description="暂无可分类的活动" />}
                    </Card>
                    <Card size="small" title="4 大信号趋势（1-5，越高越强）">
                      <ReactECharts option={sigLineOption} style={{ height: 280 }} notMerge lazyUpdate />
                    </Card>
                  </>
                ) : <Empty description="暂无数据" />}
              </Space>
            )
          },
          {
            key: 'talent',
            label: '天赋信号',
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                <Alert
                  type="info" showIcon
                  message="天赋不是测出来的，是多次观察出来的。本模块综合「自发性 + 沉浸度 + 表现」三个家长可观察的信号，给出雷达图与 Top 3，仅供家长参考；不做任何“有天赋/无天赋”诊断，也不与其他孩子比较。"
                />
                {!records.length ? <Empty description="先录入一些记录再看信号" /> : (
                  <>
                    {/* Top 3 高分大类 */}
                    <Card size="small" title="Top 3 信号高分大类（自发性 40% + 沉浸度 35% + 表现 25%）">
                      {top3.length ? (
                        <Row gutter={12}>
                          {top3.map((d, i) => (
                            <Col xs={24} sm={8} key={d.cat}>
                              <Card size="small" styles={{ body: { padding: 14 } }}
                                style={{ borderColor: categoryColor(d.cat), borderWidth: i === 0 ? 2 : 1 }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                  <Tag color="gold" style={{ fontSize: 13 }}>#{i + 1}</Tag>
                                  <span style={{ fontSize: 22 }}>{categoryEmoji(d.cat)}</span>
                                  <span style={{ fontWeight: 600, color: categoryColor(d.cat) }}>{d.cat}</span>
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 700, color: categoryColor(d.cat) }}>{d.signal}<span style={{ fontSize: 13, color: '#94A3B8' }}> /5</span></div>
                                <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>
                                  共 {d.count} 次活动 · 总时长 {d.totalMin} 分钟
                                </div>
                              </Card>
                            </Col>
                          ))}
                        </Row>
                      ) : <Empty description="至少需要几条同时填写了「自发性+沉浸度+表现」的记录" />}
                    </Card>

                    {/* 8 大智能雷达图 */}
                    <Card size="small" title="加德纳 8 大智能信号分布（雷达图）">
                      <ReactECharts option={radarOption} style={{ height: 360 }} notMerge lazyUpdate />
                      <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>
                        每个智能维度只统计同时填了 3 个信号（自发性+沉浸度+表现）的记录；样本不足的维度显示为 0，多录几次数据会更准。
                      </div>
                    </Card>

                    {/* 30 天对比 */}
                    <Card size="small" title="近 30 天 vs 之前 30 天 · 智能信号变化">
                      <Table
                        size="small"
                        pagination={false}
                        rowKey="key"
                        dataSource={trendCompare}
                        columns={[
                          { title: '智能', dataIndex: 'label', render: (v, r) => <span>{r.emoji} {v}</span> },
                          { title: '近 30 天', dataIndex: 'recent', width: 100, render: (v) => v ? v + '/5' : '-' },
                          { title: '前 30 天', dataIndex: 'prev', width: 100, render: (v) => v ? v + '/5' : '-' },
                          {
                            title: '变化', dataIndex: 'delta', width: 100,
                            render: (v) => {
                              if (v === 0 || isNaN(v)) return <span style={{ color: '#94A3B8' }}>-</span>
                              const up = v > 0
                              return <Tag color={up ? '#10B981' : '#EF4444'}>{up ? '↑' : '↓'} {Math.abs(v).toFixed(2)}</Tag>
                            }
                          },
                        ]}
                      />
                    </Card>

                    {/* 4 信号科普 */}
                    <Card size="small" title="什么是「天赋 4 大信号」？（家长科普）">
                      <Row gutter={[12, 8]}>
                        <Col xs={24} md={12}>
                          <div><b style={{ color: '#10B981' }}>① 自发性</b>：不催不动、一提就兴奋。家长越推越抗拒 vs 主动要求做。</div>
                        </Col>
                        <Col xs={24} md={12}>
                          <div><b style={{ color: '#8B5CF6' }}>② 沉浸度</b>：做的时候忘我、忘了时间。一开始就停不下来。</div>
                        </Col>
                        <Col xs={24} md={12}>
                          <div><b style={{ color: '#F59E0B' }}>③ 表现/学习速度</b>：学得比同龄人快、举一反三、屡次被老师表扬。</div>
                        </Col>
                        <Col xs={24} md={12}>
                          <div><b style={{ color: '#0EA5A4' }}>④ 反复/持续性</b>：多次主动要同类型活动，长期不放弃。本模块通过"多次记录的高分大类"间接体现。</div>
                        </Col>
                      </Row>
                      <Divider style={{ margin: '12px 0' }} />
                      <div style={{ color: '#94A3B8', fontSize: 12 }}>
                        来源参考：加德纳「多元智能理论」、国内外儿童发展心理学共识。提醒：信号只是观察，不是结论；不要给孩子贴"有/没有天赋"标签，也不要与其他孩子比较。
                      </div>
                    </Card>
                  </>
                )}
              </Space>
            )
          },
          {
            key: 'overview',
            label: '概览',
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                <Row gutter={12}>
                  <Col xs={12} sm={6}>
                    <Card size="small">
                      <Statistic title="已记录活动" value={totalCount} suffix="条" valueStyle={{ color: '#0EA5A4', fontSize: 22 }} />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card size="small">
                      <Statistic title="已涉及兴趣大类" value={catCount} suffix="类" valueStyle={{ color: '#8B5CF6', fontSize: 22 }} />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card size="small">
                      <Statistic title="总活动时长" value={totalMin} suffix="分钟" valueStyle={{ color: '#F59E0B', fontSize: 22 }} />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card size="small">
                      <Tooltip title="基于自发性+沉浸度+表现加权均值（需至少几条填全 3 个信号的记录）">
                        <Statistic title="综合天赋信号" value={overallSignal ?? '-'} suffix={overallSignal != null ? '/5' : ''} valueStyle={{ color: '#10B981', fontSize: 22 }} />
                      </Tooltip>
                    </Card>
                  </Col>
                </Row>

                {top3.length > 0 && (
                  <Card size="small" title="当前 Top 1 兴趣大类（信号分最高）">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 36 }}>{categoryEmoji(top3[0].cat)}</span>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 600, color: categoryColor(top3[0].cat) }}>{top3[0].cat}</div>
                        <div style={{ color: '#64748B', fontSize: 12 }}>
                          信号均分 <b>{top3[0].signal}/5</b> · 共 {top3[0].count} 次活动 · 总时长 {top3[0].totalMin} 分钟
                        </div>
                      </div>
                    </div>
                    <Divider style={{ margin: '12px 0' }} />
                    <div style={{ color: '#94A3B8', fontSize: 12 }}>
                      家长可顺势提供更多该领域资源与体验（如参观博物馆、相关兴趣班、相关书籍），不必强推也别刻意回避；同时观察其他大类的信号变化，看 Top 是否稳定。
                    </div>
                  </Card>
                )}

                {intelAgg.some((d) => d.count > 0) && (
                  <Card size="small" title="加德纳 8 大智能 · 当前信号分布">
                    <Row gutter={[12, 12]}>
                      {intelAgg.map((d) => (
                        <Col xs={12} sm={8} md={6} lg={3} key={d.key}>
                          <div style={{ padding: '8px 12px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                            <div style={{ color: '#64748B', fontSize: 11 }}>{d.emoji} {d.label}</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: d.value > 0 ? '#0EA5A4' : '#CBD5E1' }}>
                              {d.value > 0 ? d.value : '-'}<span style={{ fontSize: 11, color: '#94A3B8' }}>{d.value > 0 ? '/5' : ''}</span>
                            </div>
                            <div style={{ color: '#94A3B8', fontSize: 10 }}>{d.count} 次样本</div>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </Card>
                )}

                {!top3.length && (
                  <Alert type="info" showIcon message="录入记录时记得给每条活动打 1-5 分的「兴趣度/自发性/沉浸度/表现」4 个分，信号雷达图与 Top 3 才会出现。最低成本：每周末用 5 分钟给上周活动打个分。" />
                )}
              </Space>
            )
          }
        ]}
      />
    </div>
  )
}