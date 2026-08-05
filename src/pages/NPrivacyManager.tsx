import { useMemo, useState, useEffect } from 'react'
import {
  Card, Tabs, Form, Input, DatePicker, Button, Table, Tag,
  Empty, Row, Col, Space, App, Divider, Switch, Alert, Select, Descriptions
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  usePrivacyStore, PRIVACY_TYPES, PRIVACY_STATUS,
  type PrivacyRecord
} from '../store/usePrivacyStore'
import { feishuSync, useCloudOn } from '../store/feishuSync'

const { TextArea } = Input

function newId() {
  return 'pv_' + Math.random().toString(36).slice(2, 9)
}

export default function NPrivacyManager() {
  const { guardianConsent, childPause, records, setConsent, setPause, addRecord, deleteRecord, clearRecords, syncFromCloud } = usePrivacyStore()
  const { message: msg } = App.useApp()

  // 云同步：全站共享配置，hook 响应式获取
  const cloudOn = useCloudOn()
  useEffect(() => { if (cloudOn) syncFromCloud() /* eslint-disable-next-line */ }, [cloudOn])
  const [form] = Form.useForm()

  const markConsent = () => {
    setConsent(true, dayjs().format('YYYY-MM-DD'))
    msg.success('已记录监护人同意（含日期）')
    if (cloudOn) feishuSync.pushPrivacy([{ id: newId(), date: dayjs().format('YYYY-MM-DD'), type: '监护人同意', content: '监护人已单独确认授权', status: '已处理' } as any]).catch(() => {})
  }

  const onAdd = (values: any) => {
    const rec: PrivacyRecord = {
      id: newId(),
      date: values.date.format('YYYY-MM-DD'),
      type: values.type || '其他',
      content: values.content || '',
      status: values.status || '待处理',
      note: values.note || '',
    }
    addRecord(rec)
    form.resetFields()
    msg.success('已提交申诉/记录')
    if (cloudOn) feishuSync.pushPrivacy([rec as any]).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
  }
  const onDelete = (r: PrivacyRecord) => {
    deleteRecord(r.id)
    if (cloudOn) feishuSync.deletePrivacy([r.id]).catch((e) => msg.warning('飞书删除失败：' + e.message))
  }

  const columns: ColumnsType<PrivacyRecord> = [
    { title: '日期', dataIndex: 'date', width: 100 },
    { title: '类型', dataIndex: 'type', width: 110, render: (v: string) => <Tag color="cyan">{v || '-'}</Tag> },
    { title: '内容', dataIndex: 'content', ellipsis: true, render: (v: string) => v || '-' },
    { title: '状态', dataIndex: 'status', width: 84, render: (v: string) => <Tag color={v === '已处理' ? 'green' : v === '已驳回' ? 'red' : 'gold'}>{v || '-'}</Tag> },
    { title: '操作', width: 70, render: (_, r) => <Button type="link" danger size="small" onClick={() => onDelete(r)}>删除</Button> },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>隐私与合规</h2>
        <div style={{ color: '#64748B', fontSize: 13 }}>
          未成年人数据底线：监护人单独同意、孩子可随时暂停记录、数据可勘误申诉。这里管「授权与权利」，不涉及成绩数值本身。
        </div>
      </div>

            <Alert type="warning" showIcon style={{ marginBottom: 16 }}
        message="孩子有权知道这里记录了什么。涉及孩子的事务，向他说明用途、征得理解；孩子说「不想记了」时，用下方开关暂停，尊重他的意愿。" />

      <Tabs items={[
        {
          key: 'control', label: '授权与权利',
          children: (
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Card size="small" title="① 监护人单独同意">
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="状态">{guardianConsent.agreed ? <Tag color="green">已同意</Tag> : <Tag color="red">未同意</Tag>}</Descriptions.Item>
                    <Descriptions.Item label="同意日期">{guardianConsent.date || '-'}</Descriptions.Item>
                  </Descriptions>
                  <Button type="primary" onClick={markConsent} disabled={guardianConsent.agreed}>标记为已同意（监护人）</Button>
                  <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>记录「谁、何时」授权，是未成年人数据合规的底线动作。</div>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card size="small" title="② 孩子可暂停记录">
                  <Space align="center">
                    <Switch checked={childPause} onChange={(v) => { setPause(v); msg.success(v ? '已暂停记录（孩子意愿）' : '已恢复记录') }} checkedChildren="已暂停" unCheckedChildren="记录中" />
                    <span style={{ color: '#475569' }}>{childPause ? '孩子已选择暂停，顶部横幅会提示' : '当前正常记录'}</span>
                  </Space>
                  <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>暂停后，全站顶部显示横幅，提示尊重孩子意愿。录入功能仍可用，但家人会看见「孩子要求暂停」的状态。</div>
                </Card>
              </Col>
            </Row>
          )
        },
        {
          key: 'appeal', label: '数据勘误申诉',
          children: (
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Card size="small" title="提交一条申诉/记录">
                  <Form form={form} layout="vertical" onFinish={onAdd}>
                    <Form.Item name="date" label="日期" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="type" label="类型" initialValue="数据勘误申诉"><Select options={PRIVACY_TYPES.map((d) => ({ label: d, value: d }))} /></Form.Item>
                    <Form.Item name="content" label="内容" rules={[{ required: true }]}><TextArea rows={2} placeholder="如 某条身心记录有误，申请更正" /></Form.Item>
                    <Form.Item name="status" label="状态" initialValue="待处理"><Select options={PRIVACY_STATUS.map((s) => ({ label: s, value: s }))} /></Form.Item>
                    <Form.Item name="note" label="备注（可选）"><Input placeholder="处理进展" /></Form.Item>
                    <Button type="primary" htmlType="submit" block>提交</Button>
                  </Form>
                </Card>
              </Col>
              <Col xs={24} md={16}>
                <Card size="small" title={`申诉/记录（${records.length} 条）`}
                  extra={records.length ? <Button size="small" danger onClick={() => { clearRecords(); msg.success('已清空') }}>清空</Button> : null}>
                  {records.length ? (
                    <Table rowKey="id" size="small" columns={columns} dataSource={records.slice().sort((a, b) => b.date.localeCompare(a.date))} pagination={false} scroll={{ x: 'max-content', y: 320 }} />
                  ) : <Empty description="还没有申诉或记录" />}
                </Card>
              </Col>
            </Row>
          )
        },
        {
          key: 'visibility', label: '孩子端可见性规则',
          children: (
            <Card size="small">
              <Alert type="info" showIcon style={{ marginBottom: 12 }} message="下列是系统内置的「不给孩子看、正向呈现」规则（已落地的合规底线）：" />
              <ul style={{ color: '#475569', fontSize: 13, lineHeight: 2, paddingLeft: 20 }}>
                <li>孩子端不显示班级/年级排名、得分率等易制造焦虑的数字。</li>
                <li>营养/发育模块只呈现「趋势与建议」，不显示克数、体重、达标率等裸数字给孩子。</li>
                <li>任何 AI 输出禁止「你未来只能做 X」「考不上某校」等绝对化/定论式结论。</li>
                <li>用「变化率」替代「绝对值」，呈现成长速度而非横向比较。</li>
                <li>数据存于境内节点（飞书），密钥在服务端，不外泄给孩子或第三方。</li>
                <li>孩子可随时用上方开关暂停记录，并有权申请勘误/删除（被遗忘权）。</li>
              </ul>
              <Divider />
              <div style={{ color: '#94A3B8', fontSize: 12 }}>注：跨模块录入的「硬禁用」为后续增强（M2），当前以顶部横幅提示为主，尊重孩子意愿但不强制锁死界面。</div>
            </Card>
          )
        }
      ]} />
    </div>
  )
}
