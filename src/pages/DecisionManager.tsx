import { useMemo, useState, useEffect } from 'react'
import {
  Card, Tabs, Form, Input, InputNumber, DatePicker, Button, Table, Tag,
  Empty, Row, Col, Space, App, Switch, Select, Alert, List
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  useDecisionStore, type DecisionCard, type DecisionOption, type DecisionStatus
} from '../store/useDecisionStore'
import { feishuSync, useCloudOn } from '../store/feishuSync'

const { TextArea } = Input
const STATUSES: DecisionStatus[] = ['进行中', '已决', '搁置']
const STATUS_COLOR: Record<string, string> = { 进行中: '#F59E0B', 已决: '#0EA5A4', 搁置: '#94A3B8' }

function newId() {
  return 'd_' + Math.random().toString(36).slice(2, 9)
}
function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function DecisionManager() {
  const { cards, addCard, updateCard, deleteCard, clearCards, syncFromCloud } = useDecisionStore()
  const { message: msg } = App.useApp()

  // 云同步：全站共享配置，hook 响应式获取
  const cloudOn = useCloudOn()
  useEffect(() => { if (cloudOn) syncFromCloud() /* eslint-disable-next-line */ }, [cloudOn])
  const [form] = Form.useForm()

  const onAdd = (values: any) => {
    const options: DecisionOption[] = (values.options || [])
      .map((o: any) => ({ name: o.name, pros: o.pros || '', cons: o.cons || '', weight: o.weight ? Number(o.weight) : undefined }))
      .filter((o: DecisionOption) => o.name)
    const card: DecisionCard = {
      id: newId(),
      title: values.title,
      context: values.context || '',
      options,
      decidedOption: values.decidedOption || undefined,
      status: values.status || '进行中',
      dateDecided: values.dateDecided ? values.dateDecided.format('YYYY-MM-DD') : undefined,
      note: values.note || '',
    }
    addCard(card)
    form.resetFields()
    msg.success('已保存决策卡')
    if (cloudOn) feishuSync.pushDecision([card as any]).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
  }
  const onDelete = (c: DecisionCard) => {
    deleteCard(c.id)
    if (cloudOn) feishuSync.deleteDecision([c.id]).catch((e) => msg.warning('飞书删除失败：' + e.message))
  }
  const onDecide = (c: DecisionCard, name: string) => {
    updateCard(c.id, { decidedOption: name, status: '已决', dateDecided: todayStr() })
    if (cloudOn) {
      const updated = { ...c, decidedOption: name, status: '已决', dateDecided: todayStr() }
      feishuSync.pushDecision([updated as any]).catch((e) => msg.warning('飞书同步失败：' + e.message))
    }
    msg.success('已记录结论：' + name)
  }

  const columns: ColumnsType<DecisionCard> = [
    {
      title: '决策主题', dataIndex: 'title',
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{v}</div>
          <div style={{ color: '#94A3B8', fontSize: 12 }}>{r.context ? r.context.slice(0, 40) + (r.context.length > 40 ? '…' : '') : ''}</div>
        </div>
      ),
    },
    { title: '状态', dataIndex: 'status', width: 88, render: (v) => <Tag color={STATUS_COLOR[v]}>{v}</Tag> },
    {
      title: '结论', dataIndex: 'decidedOption', width: 170,
      render: (v) => (v ? <Tag color="#0EA5A4">{v}</Tag> : <span style={{ color: '#94A3B8' }}>—</span>),
    },
    { title: '选项数', dataIndex: 'options', width: 70, render: (v: DecisionOption[]) => v.length },
    {
      title: '操作', width: 150,
      render: (_, r) => (
        <Space size={4}>
          <Select
            size="small" placeholder="设为结论" style={{ width: 96 }}
            options={r.options.map((o) => ({ value: o.name, label: o.name }))}
            onSelect={(name: string) => onDecide(r, name)}
          />
          <Button type="link" danger size="small" onClick={() => onDelete(r)}>删除</Button>
        </Space>
      ),
    },
  ]

  const [viewId, setViewId] = useState<string | undefined>()
  const viewCard = useMemo(
    () => cards.find((c) => c.id === viewId) || cards[cards.length - 1],
    [cards, viewId]
  )
  const maxWeight = useMemo(
    () => Math.max(1, ...(viewCard?.options || []).map((o) => o.weight || 0)),
    [viewCard]
  )

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>升学规划 · 择校决策追踪卡</h2>
        <div style={{ color: '#64748B', fontSize: 13 }}>
          把正在纠结的真实升学决策结构化记下来（选项 / 优劣 / 权重 / 结论），将来复盘很有用。本地优先存储，开启云同步后写入飞书。
        </div>
      </div>

      <Tabs
        items={[
          {
            key: 'input',
            label: '决策录入与列表',
            children: (
              <Row gutter={16}>
                <Col xs={24} md={9}>
                  <Card size="small" title="新建决策卡">
                    <Form form={form} layout="vertical" onFinish={onAdd}>
                      <Form.Item name="title" label="决策主题" rules={[{ required: true }]}>
                        <Input placeholder="如 小升初：一中思益 vs 冲民办" />
                      </Form.Item>
                      <Form.Item name="context" label="背景（为什么纠结，可选）">
                        <TextArea rows={2} placeholder="一句话说清纠结来源" />
                      </Form.Item>
                      <Form.Item label="选项（可增减，每项填 优点/缺点/权重）">
                        <Form.List name="options">
                          {(fields, { add, remove }) => (
                            <>
                              {fields.map((field) => (
                                <Card
                                  size="small" key={field.key} style={{ marginBottom: 8 }}
                                  extra={<Button size="small" danger onClick={() => remove(field.name)}>删</Button>}
                                >
                                  <Form.Item name={[field.name, 'name']} label="选项名" rules={[{ required: true }]}>
                                    <Input placeholder="选项名" />
                                  </Form.Item>
                                  <Form.Item name={[field.name, 'pros']} label="优点">
                                    <Input placeholder="优点" />
                                  </Form.Item>
                                  <Form.Item name={[field.name, 'cons']} label="缺点">
                                    <Input placeholder="缺点" />
                                  </Form.Item>
                                  <Form.Item name={[field.name, 'weight']} label="权重(0-100)">
                                    <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="如 60" />
                                  </Form.Item>
                                </Card>
                              ))}
                              <Button type="dashed" block onClick={() => add()}>+ 加一个选项</Button>
                            </>
                          )}
                        </Form.List>
                      </Form.Item>
                      <Form.Item name="decidedOption" label="当前结论（可选）">
                        <Input placeholder="选了哪个，或先空着" />
                      </Form.Item>
                      <Form.Item name="status" label="状态" initialValue="进行中">
                        <Select options={STATUSES.map((s) => ({ value: s, label: s }))} />
                      </Form.Item>
                      <Form.Item name="dateDecided" label="决定日期（已决时填）">
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item name="note" label="备注（可选）">
                        <Input placeholder="如 依据/后续动作" />
                      </Form.Item>
                      <Button type="primary" htmlType="submit" block>保存决策卡</Button>
                    </Form>
                  </Card>
                </Col>
                <Col xs={24} md={15}>
                  <Card
                    size="small" title={`已录决策（${cards.length} 条）`}
                    extra={cards.length ? <Button size="small" danger onClick={() => { clearCards(); msg.success('已清空') }}>清空</Button> : null}
                  >
                    {cards.length ? (
                      <Table rowKey="id" size="small" columns={columns} dataSource={cards.slice().reverse()} pagination={false} scroll={{ x: 'max-content', y: 360 }} />
                    ) : <Empty description="还没有决策，先在左侧新建" />}
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'compare',
            label: '决策对比看板',
            children: cards.length ? (
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <Select
                  style={{ width: 360 }} placeholder="选择决策卡" value={viewCard?.id}
                  onChange={setViewId} options={cards.map((c) => ({ value: c.id, label: c.title }))}
                />
                {viewCard && (
                  <>
                    <Alert type="info" showIcon message={viewCard.title} description={viewCard.context} />
                    {(() => {
                      // 移动端用卡片（List+Card），桌面端用 Table 紧凑展示
                      const winW = typeof window !== 'undefined' ? window.innerWidth : 1200
                      const useCards = winW < 700
                      if (useCards) {
                        return (
                          <List
                            grid={{ gutter: 12, xs: 1, sm: 2 }}
                            dataSource={viewCard.options}
                            renderItem={(o) => {
                              const chosen = viewCard.decidedOption === o.name
                              return (
                                <List.Item>
                                  <Card
                                    size="small"
                                    title={
                                      <Space>
                                        <span style={{ fontSize: 16, fontWeight: 600 }}>{o.name}</span>
                                        {chosen && <Tag color="#0EA5A4">已选</Tag>}
                                      </Space>
                                    }
                                    style={{ borderColor: chosen ? '#0EA5A4' : undefined, background: chosen ? '#F0FDFA' : undefined }}
                                  >
                                    <div style={{ marginBottom: 10 }}>
                                      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>优点</div>
                                      <div style={{ fontSize: 14, lineHeight: 1.6 }}>{o.pros || '—'}</div>
                                    </div>
                                    <div style={{ marginBottom: 12 }}>
                                      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>缺点</div>
                                      <div style={{ fontSize: 14, lineHeight: 1.6 }}>{o.cons || '—'}</div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                                        <span>权重</span>
                                        <span style={{ color: '#0F766E', fontWeight: 600 }}>{o.weight ?? 0} / {maxWeight}</span>
                                      </div>
                                      <div style={{ background: '#E2E8F0', borderRadius: 6, height: 18, width: '100%', overflow: 'hidden' }}>
                                        <div style={{ width: `${((o.weight || 0) / maxWeight) * 100}%`, background: 'linear-gradient(90deg, #0EA5A4 0%, #14B8A6 100%)', height: 18, borderRadius: 6, transition: 'width 0.3s' }} />
                                      </div>
                                    </div>
                                  </Card>
                                </List.Item>
                              )
                            }}
                          />
                        )
                      }
                      return (
                        <Table
                          size="small" rowKey="name" pagination={false}
                          columns={[
                            { title: '选项', dataIndex: 'name', width: 140, render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
                            { title: '优点', dataIndex: 'pros', render: (v) => v || '—' },
                            { title: '缺点', dataIndex: 'cons', render: (v) => v || '—' },
                            {
                              title: '权重', dataIndex: 'weight', width: 220,
                              render: (v: number) => (
                                <div style={{ background: '#E2E8F0', borderRadius: 4, height: 14, width: '100%' }}>
                                  <div style={{ width: `${((v || 0) / maxWeight) * 100}%`, background: '#0EA5A4', height: 14, borderRadius: 4 }} />
                                </div>
                              ),
                            },
                            {
                              title: '结论', width: 80,
                              render: (_, r) => (viewCard.decidedOption === r.name ? <Tag color="#0EA5A4">已选</Tag> : '—'),
                            },
                          ]}
                          dataSource={viewCard.options}
                          scroll={{ x: 'max-content' }}
                        />
                      )
                    })()}
                    {viewCard.decidedOption && (
                      <Alert
                        type="success" showIcon
                        message={`当前结论：${viewCard.decidedOption}`}
                        description={viewCard.status === '已决' ? `已于 ${viewCard.dateDecided || '—'} 确定` : '进行中'}
                      />
                    )}
                  </>
                )}
              </Space>
            ) : <Empty description="暂无决策" />,
          },
        ]}
      />
    </div>
  )
}
