import { Row, Col, Card, Statistic, Tag, List, Typography, Progress, Button, Space, Alert } from 'antd'
import { ArrowRightOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import ModuleCard from '../components/ModuleCard'
import GrowthMiniChart from '../components/GrowthMiniChart'
import { modules, groups } from '../data/modules'
import { timelineEvents, daysLeft } from '../data/sample'
import { useAppStore } from '../store/useAppStore'
import { useHealthStore } from '../store/useHealthStore'

const { Title, Paragraph, Text } = Typography

export default function Dashboard() {
  const navigate = useNavigate()
  const child = useAppStore((s) => s.child)
  const alerts = useAppStore((s) => s.alerts)

  // 首页"今日状态"改为读真实最新身心记录（不再用 sample.ts 写死演示数据）
  // 避免与预警中心"X天未记录"矛盾，欺骗家长以为系统在正常记录
  const healthRecords = useHealthStore((s) => s.records)
  const latestHealth = healthRecords.length
    ? healthRecords.slice().sort((a, b) => b.date.localeCompare(a.date))[0]
    : null
  const daysSince = latestHealth
    ? Math.floor((Date.now() - new Date(latestHealth.date).getTime()) / 86400000)
    : null
  const recent = daysSince != null && daysSince <= 7
  const todayStats = [
    {
      key: 'sleep', label: '睡眠(最近)',
      value: latestHealth?.sleepHours != null ? `${latestHealth.sleepHours} h` : '未记录',
      good: latestHealth?.sleepHours != null && latestHealth.sleepHours >= 8,
      tip: '建议 ≥ 8h',
    },
    {
      key: 'exercise', label: '运动(最近)',
      value: latestHealth?.exerciseMin != null ? `${latestHealth.exerciseMin} min` : '未记录',
      good: latestHealth?.exerciseMin != null && latestHealth.exerciseMin >= 60,
      tip: '建议 ≥ 60min',
    },
    {
      key: 'mood', label: '心情(最近)',
      value: latestHealth?.mood || '未记录',
      good: latestHealth?.mood === '好',
      tip: '好 / 中 / 差',
    },
    {
      key: 'lastdate', label: '最近记录日期',
      value: latestHealth?.date || '无',
      good: recent,
      tip: recent ? '数据较新' : latestHealth ? `已 ${daysSince} 天未更新` : '尚未记录，建议补录',
    },
  ]

  return (
    <div>
      {/* 欢迎区 */}
      <Card style={{ marginBottom: 16, background: 'linear-gradient(120deg,#E6F7F6,#f5f7fa)' }} styles={{ body: { padding: 20 } }}>
        <Title level={4} style={{ margin: 0 }}>
          早上好，{child.name} 👋
        </Title>
        <Paragraph style={{ margin: '6px 0 0', opacity: 0.7 }}>
          今天是成长驾驶舱 · 一眼看清状态、节点、预警与趋势。先关注这 {alerts.filter((a) => a.level !== 'info').length} 条重点提醒。
        </Paragraph>
        <Space style={{ marginTop: 8 }}>
          <Button type="primary" icon={<ArrowRightOutlined />} onClick={() => navigate('/m/E')}>
            查看升学时间轴
          </Button>
          <Button onClick={() => navigate('/m/B')}>身心健康</Button>
        </Space>
      </Card>

      {/* 最近一次身心状态（读真实记录，非实时监测） */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <Text strong style={{ fontSize: 15 }}>最近一次身心状态</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>展示最新一条身心记录，非实时监测</Text>
      </div>
      {latestHealth && !recent && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`最近一次身心记录是 ${latestHealth.date}，已 ${daysSince} 天未更新`}
          action={<Button size="small" type="primary" onClick={() => navigate('/m/B')}>去补录</Button>}
        />
      )}
      {!latestHealth && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="尚未记录任何身心数据"
          action={<Button size="small" type="primary" onClick={() => navigate('/m/B')}>去补录</Button>}
        />
      )}
      <Row gutter={[16, 16]}>
        {todayStats.map((s) => (
          <Col xs={12} sm={6} key={s.key}>
            <Card styles={{ body: { padding: 16 } }}>
              <Statistic title={s.label} value={s.value} valueStyle={{ fontSize: 22 }} />
              <Tag color={s.good ? 'green' : 'orange'} style={{ marginTop: 8 }}>
                {s.good ? '达标' : '待改善'}
              </Tag>
              <div style={{ fontSize: 11, opacity: 0.5, marginTop: 6 }}>{s.tip}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 预警 + 临近节点 + 成长曲线 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={8}>
          <Card title="多维预警摘要" extra={<Tag color="orange">{alerts.filter((a) => a.level !== 'info').length} 重点</Tag>} styles={{ body: { padding: 8 } }}>
            <List
              size="small"
              dataSource={alerts}
              renderItem={(a) => (
                <List.Item>
                  <div style={{ width: '100%' }}>
                    <div style={{ fontWeight: 600 }}>
                      <Tag color={a.level === 'warning' ? 'orange' : a.level === 'urgent' ? 'red' : 'blue'}>
                        {a.level === 'warning' ? '重点' : a.level === 'urgent' ? '紧急' : '提示'}
                      </Tag>
                      {a.title}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{a.desc}</div>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card title="临近节点倒计时" extra={<ClockCircleOutlined />} styles={{ body: { padding: 8 } }}>
            <List
              size="small"
              dataSource={timelineEvents}
              renderItem={(e) => (
                <List.Item>
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{e.title}</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>{e.date}</Text>
                    </div>
                    <Tag color="cyan">{daysLeft(e.date)} 天</Tag>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card title="成长曲线（身高/体重）" styles={{ body: { padding: 8 } }}>
            <GrowthMiniChart />
          </Card>
        </Col>
      </Row>

      {/* 模块快捷入口 */}
      <Card title="全部模块" style={{ marginTop: 16 }} styles={{ body: { padding: 16 } }}>
        {groups
          .filter((g) => g.modules.length > 0)
          .map((g) => (
            <div key={g.key} style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 10, opacity: 0.7 }}>
                {g.label}
              </Text>
              <Row gutter={[16, 16]}>
                {g.modules.map((id) => (
                  <Col xs={12} sm={8} md={6} lg={4} key={id}>
                    <ModuleCard id={id} />
                  </Col>
                ))}
              </Row>
            </div>
          ))}
        <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
          共 {modules.length} 个模块域（A–T）；当前为 M0 基座，各模块详情页为规划占位，功能在 M1–M4 逐步落地。
        </Paragraph>
      </Card>
    </div>
  )
}
